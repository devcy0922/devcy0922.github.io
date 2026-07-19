import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'devcy0922',
    titleTemplate: ':title · devcy0922',
    description: '10년차 SaaS · DevOps · AI Platform 엔지니어링 포트폴리오',
    lang: 'ko-KR',
    cleanUrls: true,
    lastUpdated: true,
    sitemap: {
      hostname: 'https://devcy0922.github.io'
    },
    head: [
      ['meta', { name: 'theme-color', content: '#0a0a0c' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'devcy0922 Engineering Portfolio' }],
      ['meta', { property: 'og:title', content: '10년차 SaaS · DevOps · AI Platform' }],
      ['meta', { property: 'og:description', content: '운영 가능한 SaaS의 경계를 AI 플랫폼까지 확장합니다.' }]
    ],
    
    themeConfig: {
      siteTitle: 'devcy0922',
      
      nav: [
        { text: 'Overview', link: '/' },
        { text: 'Runtime Lab', link: '/live-demo' },
        { text: 'Systems', link: '/projects/govail-gateway' }
      ],

      sidebar: {
        '/projects/': [
          {
            text: 'Core Projects (대표)',
            items: [
              { text: 'GoVail Gateway (Live)', link: '/projects/govail-gateway' },
              { text: 'Aegis-LLM (가드레일)', link: '/projects/aegis-llm' },
              { text: 'SliceRAG (청크 최적화)', link: '/projects/slicerag' },
              { text: 'LingoAgent (i18n 에이전트)', link: '/projects/lingo-agent' }
            ]
          },
          {
            text: 'Security & Infrastructure',
            items: [
              { text: 'AgentSecOps Playground', link: '/projects/agentsecops-playground' },
              { text: 'AI Gateway Infra Demo', link: '/projects/ai-gateway-infra-demo' },
              { text: 'Infra Security', link: '/projects/infra-security' }
            ]
          },
          {
            text: 'Developer Productivity & Tools',
            items: [
              { text: 'Aperture MCP Server', link: '/projects/aperture-mcp' },
              { text: 'Leandraft Linter', link: '/projects/leandraft-linter' },
              { text: 'Mock LLM Server', link: '/projects/mock-llm' }
            ]
          }
        ]
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/devcy0922' }
      ],

      footer: {
        message: '문서보다 실행 가능한 증거를 우선합니다.',
        copyright: 'Copyright © 2026 devcy0922. All rights reserved.'
      }
    }
  })
)
