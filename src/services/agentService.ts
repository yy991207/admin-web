import { buildUrl } from './config'

export interface AdminAgent {
  agent_id: string
  agent_name: string
  description: string
  avatar_url: string | null
  agent_prompt: string
  enabled_skills: string[]
  resource_ids: string[]
  preset_questions: Array<{ question: string; answer: string }>
  enable_web_search: boolean
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentListResponse {
  agents: AdminAgent[]
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

export async function fetchAgents(isActive: boolean): Promise<ApiResponse<AgentListResponse>> {
  const url = buildUrl(`api/v1/admin/agents?is_active=${isActive}`)
  return request<AgentListResponse>(url)
}

/** 后端不支持 is_active=null，需分别请求后合并 */
export async function fetchAllAgents(): Promise<AgentListResponse> {
  const [activeRes, inactiveRes] = await Promise.all([fetchAgents(true), fetchAgents(false)])
  return {
    agents: [
      ...(activeRes.success ? activeRes.data.agents : []),
      ...(inactiveRes.success ? inactiveRes.data.agents : []),
    ],
    total: (activeRes.success ? activeRes.data.total : 0) + (inactiveRes.success ? inactiveRes.data.total : 0),
  }
}

export async function fetchAgentDetail(agent_id: string): Promise<ApiResponse<AdminAgent>> {
  return request<AdminAgent>(buildUrl(`api/v1/admin/agents/${agent_id}`))
}

export async function createAgent(data: {
  agent_name: string
  description: string
  avatar_url?: string | null
  agent_prompt: string
  enabled_skills?: string[]
  resource_ids?: string[]
  preset_questions?: Array<{ question: string; answer: string }>
  enable_web_search?: boolean
  is_public?: boolean
}): Promise<ApiResponse<{ agent_id: string }>> {
  return request(buildUrl('api/v1/admin/agents'), {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAgent(
  agent_id: string,
  data: {
    agent_name?: string
    description?: string
    avatar_url?: string | null
    agent_prompt?: string
    enabled_skills?: string[] | null
    resource_ids?: string[] | null
    preset_questions?: Array<{ question: string; answer: string }> | null
    enable_web_search?: boolean | null
    is_active?: boolean | null
    is_public?: boolean | null
  },
): Promise<ApiResponse<{ agent_id: string }>> {
  return request(buildUrl(`api/v1/admin/agents/${agent_id}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAgent(agent_id: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/agents/${agent_id}`), {
    method: 'DELETE',
  })
}

export async function toggleAgent(agent_id: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/agents/${agent_id}/toggle`), {
    method: 'PUT',
  })
}

export async function setAgentVisibility(
  agent_id: string,
  is_public: boolean,
): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/agents/${agent_id}/visibility`), {
    method: 'PUT',
    body: JSON.stringify({ is_public }),
  })
}
