// Loads skill metadata and SKILL.md content using Vite's static import.meta.glob
const skillMds = import.meta.glob('../skills/*/skills/*/SKILL.md', { query: '?raw', import: 'default', eager: true })
const pluginJsons = import.meta.glob('../skills/*/.claude-plugin/plugin.json', { eager: true })

function pluginIdFromPath(path) {
  return path.match(/\.\.\/skills\/([^/]+)\//)?.[1] || null
}

function findSkillMd(pluginId) {
  const key = Object.keys(skillMds).find(p =>
    p.includes(`/skills/${pluginId}/skills/`)
  )
  return key ? skillMds[key] : ''
}

export function loadSkills() {
  return Object.entries(pluginJsons)
    .map(([path, module]) => {
      const pluginId = pluginIdFromPath(path)
      if (!pluginId) return null
      const plugin = module.default || module
      return {
        id: pluginId,
        name: plugin.name || pluginId,
        description: plugin.description || '',
        version: plugin.version || '',
        category: plugin.category || '',
        keywords: plugin.keywords || [],
        skillContent: findSkillMd(pluginId)
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
}
