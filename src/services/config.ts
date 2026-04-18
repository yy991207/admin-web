import yaml from '../../config.yaml?raw'

interface AppConfig {
  user_id: string
  url: string
  token: string
}

export interface ApiResponse<T> {
  success: boolean
  code: string
  msg: string
  data: T
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
  if (!config.token) {
    return {}
  }

  return {
    Authorization: `Bearer ${config.token}`,
  }
}

/**
 * 管理后台请求统一从这里补鉴权头，避免每个 service 各自实现时漏传 token。
 */
export async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const isJson = options?.body && !(options.body instanceof FormData)
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  return res.json()
}
