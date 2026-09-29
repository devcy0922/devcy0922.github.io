// 실행 예: PLAYWRIGHT_MODULE=/path/to/@playwright/test node scripts/check-portfolio.cjs
const { chromium, expect } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test')
const assert = require('node:assert/strict')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const base = process.env.PORTFOLIO_URL || 'http://localhost:9098'
    const artifacts = process.env.ARTIFACT_DIR || '/tmp'
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort())
    await page.goto(base)
    await page.screenshot({ path: `${artifacts}/portfolio-desktop.png`, fullPage: true })
    await page.goto(`${base}/playground`)
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: '모델에 질문하기' })).toBeVisible()
    await expect(page.getByText('대화는 이 브라우저에 저장됩니다.', { exact: true })).toBeVisible()
    await expect(page.getByText('govail/thinker · reasoning low', { exact: true })).toBeVisible()
    assert.equal(await page.locator('.pg-tool-chip').count(), 5)
    let requestBody = null
    await page.route('https://api.govail.cloud/**', async route => {
      requestBody = JSON.parse(route.request().postData() || '{}')
      const body = [
        'event: routing\ndata: {"model":"govail/thinker","policy":"governed execution"}\n\n',
        'event: tool_call\ndata: {"tool":"web_search","callId":"test-search","input":{"query":"VitePress"}}\n\n',
        'event: tool_result\ndata: {"tool":"web_search","callId":"test-search","status":"ok","durationMs":12,"output":{"results":[{"title":"VitePress","url":"https://vitepress.dev","snippet":"Docs"}]}}\n\n',
        'event: token\ndata: {"delta":"검색 결과입니다."}\n\n',
        'event: done\ndata: {"status":"completed","totalLatencyMs":20,"ttftMs":4,"tokensPerSec":12,"usage":{"completionTokens":3}}\n\n',
      ].join('')
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body })
    })
    await page.getByRole('button', { name: '실시간 웹 검색', exact: true }).click()
    await page.locator('textarea').fill('VitePress 최신 문서를 검색해줘')
    await page.locator('textarea').press('Control+Enter')
    await expect(page.locator('.pg-tool-entry')).toHaveCount(1)
    await expect(page.locator('.pg-tool-entry-body')).toContainText('VitePress')
    await expect(page.locator('.pg-markdown-content')).toContainText('검색 결과입니다.')
    assert.equal(requestBody.model, 'govail/thinker')
    assert.deepEqual(requestBody.tools, ['web_search'])
    assert.equal(requestBody.enableThinking, true)
    await page.screenshot({ path: `${artifacts}/portfolio-playground.png`, fullPage: true })
    console.log('실제 모델 요청 UI·도구 입력·결과 표시 경로 통과 (응답 모킹)')
    for (const path of ['/', '/playground', '/projects/', '/about', '/live-console']) {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(base + path)
      await page.waitForTimeout(200)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} 가로 넘침`)
      if (path === '/') await page.screenshot({ path: `${artifacts}/portfolio-mobile.png`, fullPage: true })
      console.log(`모바일 레이아웃 통과: ${path}`)
    }
    assert.equal(await page.locator('.pg-session-item').count(), 1)
    assert.equal(await page.locator('.pg-empty-state').count(), 1)
    await page.unroute('https://api.govail.cloud/**')
    await page.route('https://api.govail.cloud/**', route => route.fulfill({ status: 503, body: 'unavailable' }))
    await page.locator('textarea').fill('실행 경계를 설명해줘')
    await page.locator('textarea').press('Control+Enter')
    await page.getByText('실행 오류:', { exact: false }).first().waitFor()
    console.log('라이브 콘솔 빈 초기 상태와 HTTP 실패 표시 통과 (응답 모킹)')
    await page.goto(base)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.screenshot({ path: `${artifacts}/portfolio-dark.png`, fullPage: true })
    assert.deepEqual(errors, [])
    console.log('브라우저 런타임 오류 없음')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
