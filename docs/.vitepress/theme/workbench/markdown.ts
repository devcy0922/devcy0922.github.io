import { Marked } from 'marked'

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

// 전역 marked 설정을 건드리지 않도록 별도 인스턴스를 쓴다. 모델 응답은 신뢰하지 않으므로
// 원본 HTML과 이미지는 글자로만 보여 주고, 링크는 http(s)만 새 탭으로 연다.
const markdown = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text)
    },
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens)
      if (!/^https?:\/\//i.test(href)) return label
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    },
    image({ text }) {
      return escapeHtml(text)
    },
  },
})

export function renderMarkdown(text: string): string {
  if (!text) return ''
  try {
    return markdown.parse(text) as string
  } catch {
    return escapeHtml(text)
  }
}
