import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const owner = 'devcy0922'
const output = resolve('docs/projects.data.json')
const apiUrl = `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`

try {
  const response = await fetch(apiUrl, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'devcy0922.github.io-project-sync' },
  })
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`)

  const repositories = await response.json()
  const projects = repositories
    .filter((repo) => repo.name !== `${owner}.github.io` && !repo.fork && !repo.archived)
    .map((repo) => ({
      name: repo.name,
      title: repo.name,
      description: repo.description || 'GitHub에서 진행 중인 공개 프로젝트입니다.',
      href: `/projects/${repo.name}`,
      repoUrl: repo.html_url,
      language: repo.language || 'Other',
      defaultBranch: repo.default_branch || 'main',
      pushedAt: repo.pushed_at,
    }))
    .sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt))

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(projects, null, 2)}\n`, 'utf8')
  console.log(`Synced ${projects.length} public repositories into ${output}`)
} catch (error) {
  try {
    await readFile(output)
    console.warn(`Project sync skipped; using existing ${output}: ${error.message}`)
  } catch {
    console.error(`Project sync failed and no cached catalog exists: ${error.message}`)
    process.exitCode = 1
  }
}
