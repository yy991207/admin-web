import yaml from '../../config.yaml?raw'

interface AppConfig {
  user_id: string
  url: string
  token: string
}

function parseYaml(raw: string): AppConfig {
  const result: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) result[key] = value
  }
  return result as unknown as AppConfig
}

export const config = parseYaml(yaml)

export function buildUrl(path: string): string {
  return `${config.url.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json',
  }
}
