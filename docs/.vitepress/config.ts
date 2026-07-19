import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'devcy0922',
    titleTemplate: ':title · devcy0922',
    description: '10년 차 기업용 백엔드 경험을 AI 플랫폼의 인증·정책·감사 경계로 확장하는 엔지니어링 포트폴리오',
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
      ['meta', { property: 'og:title', content: 'Backend / AI Platform Engineer · devcy0922' }],
      ['meta', { property: 'og:description', content: '10년 차 기업용 백엔드 경험을 AI Gateway와 Agent Security로 확장합니다.' }]
    ],
    
    themeConfig: {
      siteTitle: 'devcy0922',
      
      nav: [
        { text: 'Overview', link: '/' },
        { text: 'Experience', link: '/experience' },
        { text: 'Evidence', link: '/operational-evidence' },
        { text: 'Runtime Lab', link: '/live-demo' },
        { text: 'Systems', link: '/projects/govail-gateway' }
      ],

      sidebar: {
        '/projects/': [
          {
            text: '대표 시스템',
            items: [
              { text: 'GoVail AI Platform', link: '/projects/govail-gateway' }
            ]
          },
          {
            text: '검증 가능한 핵심 컴포넌트',
            items: [
              { text: 'Aegis-LLM · LLM Gateway', link: '/projects/aegis-llm' },
              { text: 'Aperture MCP · Tool Policy', link: '/projects/aperture-mcp' },
              { text: 'SliceRAG · RAG Isolation', link: '/projects/slicerag' }
            ]
          },
          {
            text: '실험 및 지원 도구',
            items: [
              { text: 'AgentSecOps Playground', link: '/projects/agentsecops-playground' },
              { text: 'AI Gateway Infra Demo', link: '/projects/ai-gateway-infra-demo' },
              { text: 'Infra Security', link: '/projects/infra-security' },
              { text: 'LingoAgent', link: '/projects/lingo-agent' },
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
        message: '10년 차 Backend / AI Platform Engineer · 문서보다 실행 가능한 증거를 우선합니다.',
        copyright: 'Copyright © 2026 devcy0922. All rights reserved.'
      }
    }
  })
)
