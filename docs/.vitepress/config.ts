import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createContentLoader, defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { compareDateKeys, isPublished, toRssDate } from '../content-utils.js'

const SITE_URL = 'https://devcy0922.github.io'

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export default withMermaid(
  defineConfig({
    title: 'devcy0922',
    titleTemplate: ':title · devcy0922',
    description: '10년차 Backend & AI Platform Engineer devcy0922. 업무에 AI를 붙여 실제로 돌려본 작업과 브라우저에서 바로 써볼 수 있는 프로토타입.',
    lang: 'ko-KR',
    cleanUrls: true,
    appearance: false,
    lastUpdated: true,

    sitemap: {
      hostname: SITE_URL,
      transformItems: async (items) => {
        const posts = await createContentLoader('posts/*.md').load()
        const futurePostPaths = new Set(
          posts
            .filter((post) => post.frontmatter.date && !isPublished(post.frontmatter.date))
            .map((post) => post.url.replace(/\.html$/, '')),
        )

        // 콘솔로 이동시키는 예전 주소는 검색 색인에서 뺀다.
        const redirectedPaths = ['live-console', 'runner', 'audit']
        return items.filter(
          (item) =>
            ![...futurePostPaths].some((path) => item.url.endsWith(path)) &&
            !redirectedPaths.some((slug) => item.url.endsWith(`/${slug}`)),
        )
      },
    },

    head: [
      ['meta', { name: 'theme-color', content: '#ffffff' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'devcy0922' }],
      ['meta', { property: 'og:locale', content: 'ko_KR' }],
      ['link', { rel: 'alternate', type: 'application/rss+xml', title: 'devcy0922 RSS', href: '/rss.xml' }],
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net', crossorigin: '' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
      [
        'link',
        {
          rel: 'stylesheet',
          href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
        },
      ],
      [
        'link',
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
        },
      ],
    ],

    themeConfig: {
      siteTitle: 'devcy0922',

      nav: [
        { text: '제품', link: '/lab/', activeMatch: '^/lab/' },
        { text: '콘솔', link: '/playground' },
        { text: '플랫폼', link: '/projects/', activeMatch: '^/projects/' },
        { text: '기록', link: '/posts/', activeMatch: '^/posts/' },
        { text: '소개', link: '/about' },
      ],

      search: {
        provider: 'local',
        options: {
          locales: {
            root: {
              translations: {
                button: {
                  buttonText: '검색',
                  buttonAriaLabel: '검색',
                },
                modal: {
                  displayDetails: '상세 목록 표시',
                  resetButtonTitle: '검색 초기화',
                  backButtonTitle: '검색 닫기',
                  noResultsText: '검색 결과가 없습니다.',
                  footer: {
                    selectText: '선택',
                    selectKeyAriaLabel: 'Enter',
                    navigateText: '이동',
                    navigateUpKeyAriaLabel: '위쪽 화살표',
                    navigateDownKeyAriaLabel: '아래쪽 화살표',
                    closeText: '닫기',
                    closeKeyAriaLabel: 'Esc',
                  },
                },
              },
            },
          },
        },
      },

      socialLinks: [{ icon: 'github', link: 'https://github.com/devcy0922' }],

      outline: {
        label: '이 글에서',
        level: [2, 3],
      },

      lastUpdated: {
        text: '마지막 수정',
      },

      docFooter: {
        prev: '이전 글',
        next: '다음 글',
      },

      footer: {
        message: '업무에 AI를 붙여 실제로 돌려봅니다.',
        copyright: 'Copyright © 2026 devcy0922',
      },
    },

    // 다이어그램은 흑백 톤으로 그린다. mermaid는 웹폰트가 로드되기 전에 글자 폭을 재므로
    // 박스가 잘리지 않도록 이미 설치된 시스템 한글 글꼴을 쓴다.
    mermaid: {
      theme: 'neutral',
      themeVariables: { fontFamily: '-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif', fontSize: '14px' },
    },

    async buildEnd(siteConfig) {
      const posts = await createContentLoader('posts/*.md').load()
      const items = posts
        .filter((post) => post.frontmatter.date && post.frontmatter.title && isPublished(post.frontmatter.date))
        .sort((a, b) => compareDateKeys(a.frontmatter.date, b.frontmatter.date))

      const rssItems = items
        .map((post) => {
          const path = post.url.replace(/\.html$/, '')
          const link = `${SITE_URL}${path}`
          const date = toRssDate(post.frontmatter.date)

          return [
            '<item>',
            `<title>${escapeXml(post.frontmatter.title)}</title>`,
            `<link>${escapeXml(link)}</link>`,
            `<guid>${escapeXml(link)}</guid>`,
            `<pubDate>${escapeXml(date)}</pubDate>`,
            `<description>${escapeXml(post.frontmatter.description ?? '')}</description>`,
            '</item>',
          ].join('')
        })
        .join('')

      const rss = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '<channel>',
        '<title>devcy0922</title>',
        `<link>${SITE_URL}</link>`,
        '<description>백엔드, 서비스 운영, 자동화와 AI를 직접 만들고 굴리면서 남기는 개발 기록</description>',
        '<language>ko-KR</language>',
        rssItems,
        '</channel>',
        '</rss>',
      ].join('')

      writeFileSync(resolve(siteConfig.outDir, 'rss.xml'), rss, 'utf8')
    },
  }),
)
