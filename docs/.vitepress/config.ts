import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'devcy0922',
    description: 'Backend · Infrastructure · AI Platform Portfolio',
    lang: 'ko-KR',
    cleanUrls: true,
    
    themeConfig: {
      siteTitle: 'devcy0922',
      
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Projects', link: '/projects/aegis-llm' }
      ],

      sidebar: {
        '/projects/': [
          {
            text: 'Core Projects (대표)',
            items: [
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
        message: 'Built with VitePress. All architectural principles honestly claimed.',
        copyright: 'Copyright © 2026 devcy0922. All rights reserved.'
      }
    }
  })
)
