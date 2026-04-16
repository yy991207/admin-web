import { buildUrl } from './config'

export interface ConfigFieldOption {
  label: string
  value: string
}

export interface ConfigField {
  key: string
  label: string
  type: string
  required: boolean
  default: unknown
  options?: ConfigFieldOption[]
}

export interface SystemSkill {
  name: string
  chinese_name: string
  description: string
  enabled: boolean
  template: string | null
  placeholders: string[] | null
  config_fields: ConfigField[] | null
  skill_md: string
  skill_path: string
  source: string
  file_list: string[]
  created_at: string
  updated_at: string
}

export interface SystemSkillListResponse {
  skills: SystemSkill[]
  total: number
}

// ClawHub list item (returned by browse/search)
export interface ClawhubSkill {
  name: string
  chinese_name: string
  description: string
  template: string | null
  placeholders: string[] | null
  config_fields: ConfigField[] | null
  is_selected: boolean
}

// ClawHub detail response structure
export interface ClawhubSkillDetail {
  skill: {
    slug: string
    displayName: string
    summary: string
    tags: string[]
    stats: {
      downloads: number
      stars: number
      installsCurrent: number
      installsAllTime: number
    }
    createdAt: number
    updatedAt: number
  }
  latestVersion: {
    version: string
    createdAt: number
    changelog: string
    license: string | null
  }
  owner: {
    handle: string
    displayName: string
    image: string | null
  }
  history: unknown[]
  metaContent: {
    DisplayDescription?: string
    Files?: string[]
    Keywords?: string[]
    License?: string
    displayName?: string
    history?: unknown[]
    latest?: {
      commit: string
      publishedAt: number
      version: string
    }
    owner?: string
    skillMd?: string
    [key: string]: unknown
  }
}

export interface ClawhubSkillListResponse {
  skills: ClawhubSkill[]
  total: number
}

export interface ApiResponse<T> {
  success: boolean
  code: string
  msg: string
  data: T
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const isJson = options?.body && !(options.body instanceof FormData)
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  return res.json()
}

export async function fetchSystemSkills(): Promise<ApiResponse<SystemSkillListResponse>> {
  return request<SystemSkillListResponse>(buildUrl('api/v1/admin/skills'))
}

export async function fetchSystemSkillDetail(name: string): Promise<ApiResponse<SystemSkill>> {
  return request<SystemSkill>(buildUrl(`api/v1/admin/skills/${name}`))
}

export async function createSystemSkill(data: {
  name: string
  chinese_name: string
  description: string
  template: string
  placeholders: string[]
  config_fields: ConfigField[]
  skill_md_content: string
}): Promise<ApiResponse<{ name: string }>> {
  return request(buildUrl('api/v1/admin/skills'), {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateSystemSkill(
  name: string,
  data: {
    chinese_name?: string
    description?: string
    template?: string
    placeholders?: string[]
    config_fields?: ConfigField[]
    skill_md_content?: string
  },
): Promise<ApiResponse<{ name: string }>> {
  return request(buildUrl(`api/v1/admin/skills/${name}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteSystemSkill(name: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/skills/${name}`), {
    method: 'DELETE',
  })
}

export async function uploadZipSkill(file: File): Promise<ApiResponse<unknown>> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(buildUrl('api/v1/admin/skills/upload-zip'), {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

export async function searchClawhub(
  q: string,
  limit = 20,
): Promise<ApiResponse<ClawhubSkillListResponse>> {
  return request<ClawhubSkillListResponse>(
    buildUrl(`api/v1/admin/skills/clawhub/search?keyword=${encodeURIComponent(q)}&limit=${limit}`),
  )
}

export async function browseClawhub(limit = 20): Promise<ApiResponse<ClawhubSkillListResponse>> {
  return request<ClawhubSkillListResponse>(
    buildUrl(`api/v1/admin/skills/clawhub/browse?limit=${limit}`),
  )
}

export async function fetchClawhubDetail(slug: string): Promise<ApiResponse<ClawhubSkillDetail>> {
  return request<ClawhubSkillDetail>(buildUrl(`api/v1/admin/skills/clawhub/${slug}/detail`))
}

export async function installClawhubSkill(slug: string): Promise<ApiResponse<{ name: string }>> {
  return request(buildUrl(`api/v1/admin/skills/clawhub/${slug}/install`), {
    method: 'POST',
  })
}
