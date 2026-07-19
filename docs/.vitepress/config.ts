import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'devcy0922',
    titleTemplate: ':title · devcy0922',
    description: '기업용 백엔드부터 AI 플랫폼까지 운영 가능한 시스템을 설계하는 10년 차 엔지니어의 포트폴리오',
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
      ['meta', { property: 'og:description', content: '백엔드 개발, 인증·연동, 배포 자동화와 안정적인 운영 경험을 코드와 실행 결과로 보여줍니다.' }]
    ],
    
    themeConfig: {
      siteTitle: 'devcy0922',
      
      nav: [
        { text: '소개', link: '/' },
        { text: '경력', link: '/experience' },
        { text: '프로젝트', link: '/projects/' },
        { text: 'GitHub', link: 'https://github.com/devcy0922' }
      ],

      sidebar: {
        '/projects/': [
          {
            text: '대표 작업',
            items: [
              { text: '프로젝트 전체 보기', link: '/projects/' },
              { text: 'GoVail Gateway', link: '/projects/govail-gateway' },
              { text: 'LingoAgent', link: '/projects/lingo-agent' },
              { text: 'Leandraft Linter', link: '/projects/leandraft-linter' }
            ]
          },
          {
            text: 'AI 플랫폼 구현과 실험',
            items: [
              { text: 'Aegis-LLM · LLM Gateway', link: '/projects/aegis-llm' },
              { text: 'Aperture MCP · Tool Policy', link: '/projects/aperture-mcp' },
              { text: 'SliceRAG · RAG Isolation', link: '/projects/slicerag' },
              { text: 'AgentSecOps Playground', link: '/projects/agentsecops-playground' }
            ]
          },
          {
            text: '인프라 및 지원 도구',
            items: [
              { text: 'AI Gateway Infra Demo', link: '/projects/ai-gateway-infra-demo' },
              { text: 'Infra Security', link: '/projects/infra-security' },
              { text: 'Mock LLM Server', link: '/projects/mock-llm' }
            ]
          }
        ]
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/devcy0922' }
      ],

      footer: {
        message: 'Backend / AI Platform Engineer · 설계 판단을 코드와 실행 결과로 증명합니다.',
        copyright: 'Copyright © 2026 devcy0922. All rights reserved.'
      }
    }
  })
)
