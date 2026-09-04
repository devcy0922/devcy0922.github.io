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
    description: '백엔드, 서비스 운영, 자동화와 AI를 직접 만들고 굴리면서 남기는 개발 기록',
    lang: 'ko-KR',
    cleanUrls: true,
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

        return items.filter((item) => ![...futurePostPaths].some((path) => item.url.endsWith(path)))
      },
    },

    head: [
      ['meta', { name: 'theme-color', content: '#f5f7fb' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'devcy0922' }],
      ['meta', { property: 'og:locale', content: 'ko_KR' }],
      ['link', { rel: 'alternate', type: 'application/rss+xml', title: 'devcy0922 RSS', href: '/rss.xml' }],
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
      [
        'link',
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap',
        },
      ],
    ],

    themeConfig: {
      siteTitle: 'devcy0922',

      nav: [
        { text: '글', link: '/posts/' },
        { text: '프로젝트', link: '/projects/' },
        { text: 'About', link: '/about' },
        { text: 'GitHub ↗', link: 'https://github.com/devcy0922' },
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
        message: 'Build · Operate · Write',
        copyright: 'Copyright © 2026 devcy0922',
      },
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
