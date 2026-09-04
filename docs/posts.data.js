import { createContentLoader } from 'vitepress'
import { isPublished, toDateKey } from './content-utils.js'

export default createContentLoader('posts/*.md', {
  transform(raw) {
    return raw
      .filter((page) => page.frontmatter.date && page.frontmatter.title && isPublished(page.frontmatter.date))
      .map((page) => ({
        title: page.frontmatter.title,
        url: page.url.replace(/\.html$/, ''),
        date: toDateKey(page.frontmatter.date),
        description: page.frontmatter.description ?? '',
        tags: Array.isArray(page.frontmatter.tags) ? page.frontmatter.tags : [],
      }))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  },
})
