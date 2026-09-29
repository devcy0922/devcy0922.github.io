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
    // 선택 이벤트가 hydration 직후 유실되지 않도록 기준 버전을 먼저 고정한다.
    await page.locator('#control select').selectOption('v1')
    await page.locator('#control select').selectOption('v2')
    await expect(page.locator('#control output')).toContainText('DRIFT')
    await page.getByRole('button', { name: '규칙 동기화', exact: true }).click()
    await expect(page.locator('#control output')).toContainText('IN_SYNC')
    await page.getByLabel('인증 있음').uncheck()
    await expect(page.locator('#gateway output')).toContainText('401')
    await page.getByLabel('인증 있음').check()
    await page.getByLabel('요청 모델 접근 허용').uncheck()
    await expect(page.locator('#gateway output')).toContainText('403')
    await page.getByLabel('요청 모델 접근 허용').check()
    await page.locator('#gateway select').selectOption('timeout')
    await expect(page.locator('#gateway output')).toContainText('504')
    assert.equal(await page.getByRole('button', { name: '변경 실행', exact: true }).isDisabled(), true)
    for (const name of ['조사하기', '승인', '변경 실행', '재조회 불일치']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(page.locator('#approval output')).toContainText('FAILED')
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    for (const name of ['조사하기', '반려']) await page.getByRole('button', { name, exact: true }).click()
    assert.equal(await page.getByRole('button', { name: '변경 실행', exact: true }).isDisabled(), true)
    await page.locator('#verification select').nth(2).selectOption('PASS')
    await expect(page.locator('#verification output strong')).toHaveText('PASS')
    await page.locator('#verification select').nth(0).selectOption('FAIL')
    await expect(page.locator('#verification output strong')).toHaveText('FAIL')
    await page.screenshot({ path: `${artifacts}/portfolio-lab.png`, fullPage: true })
    console.log('네 가지 브라우저 데모의 상태 전이 통과')
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
