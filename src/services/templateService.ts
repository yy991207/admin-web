import { buildUrl } from './config'

export interface TemplatePresetQuestion {
  question: string
  answer: string
}

export interface AdminTemplate {
  template_id: string
  template_name: string
  description: string
  avatar_url: string | null
  agent_prompt: string
  enabled_skills: string[]
  resource_ids: string[]
  preset_questions: TemplatePresetQuestion[]
  enable_web_search: boolean
  is_public: boolean
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TemplateListResponse {
  templates: AdminTemplate[]
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

export async function fetchTemplates(): Promise<ApiResponse<TemplateListResponse>> {
  return request<TemplateListResponse>(buildUrl('api/v1/admin/templates'))
}

export async function createTemplate(data: {
  template_name: string
  description: string
  agent_prompt: string
  category?: string
  is_public?: boolean
  enable_web_search?: boolean
}): Promise<ApiResponse<{ template_id: string }>> {
  return request(buildUrl('api/v1/admin/templates'), {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTemplate(
  template_id: string,
  data: {
    template_name?: string
    description?: string
    agent_prompt?: string
    category?: string
    is_public?: boolean
    enable_web_search?: boolean
  },
): Promise<ApiResponse<{ template_id: string }>> {
  return request(buildUrl(`api/v1/admin/templates/${template_id}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTemplate(template_id: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/templates/${template_id}`), {
    method: 'DELETE',
  })
}
