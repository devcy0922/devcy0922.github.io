import { createContentLoader } from 'vitepress'

export default createContentLoader('posts/*.md', {
  transform(raw) {
    return raw
      .filter((page) => page.frontmatter.date && page.frontmatter.title)
      .map((page) => ({
        title: page.frontmatter.title,
        url: page.url.replace(/\.html$/, ''),
        date: new Date(page.frontmatter.date).toISOString().slice(0, 10),
        description: page.frontmatter.description ?? '',
        tags: Array.isArray(page.frontmatter.tags) ? page.frontmatter.tags : [],
      }))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  },
})
