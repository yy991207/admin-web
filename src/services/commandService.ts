import { buildUrl } from './config'

export interface AttachmentRequest {
  file_name: string
  url: string
  resource_id?: string | null
}

export interface AdminCommand {
  command_id: string
  name: string
  template: string
  description: string | null
  icon: string | null
  sort_order: number
  attachments: AttachmentRequest[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CommandListResponse {
  commands: AdminCommand[]
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

export async function fetchCommands(isActive: boolean): Promise<ApiResponse<CommandListResponse>> {
  const url = buildUrl(`api/v1/admin/commands?is_active=${isActive}`)
  return request<CommandListResponse>(url)
}

/** 后端不支持 is_active=null，需分别请求后合并 */
export async function fetchAllCommands(): Promise<CommandListResponse> {
  const [activeRes, inactiveRes] = await Promise.all([fetchCommands(true), fetchCommands(false)])
  return {
    commands: [
      ...(activeRes.success ? activeRes.data.commands : []),
      ...(inactiveRes.success ? inactiveRes.data.commands : []),
    ],
    total: (activeRes.success ? activeRes.data.total : 0) + (inactiveRes.success ? inactiveRes.data.total : 0),
  }
}

export async function fetchCommandDetail(command_id: string): Promise<ApiResponse<AdminCommand>> {
  return request<AdminCommand>(buildUrl(`api/v1/admin/commands/${command_id}`))
}

export async function createCommand(data: {
  id: string
  name: string
  template: string
  description?: string | null
  icon?: string | null
  sort_order?: number
  attachments?: AttachmentRequest[]
}): Promise<ApiResponse<{ command_id: string }>> {
  return request(buildUrl('api/v1/admin/commands'), {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCommand(
  command_id: string,
  data: {
    name?: string | null
    description?: string | null
    template?: string | null
    attachments?: AttachmentRequest[] | null
    icon?: string | null
    sort_order?: number | null
  },
): Promise<ApiResponse<{ command_id: string }>> {
  return request(buildUrl(`api/v1/admin/commands/${command_id}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCommand(command_id: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/commands/${command_id}`), {
    method: 'DELETE',
  })
}

export async function toggleCommand(command_id: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/commands/${command_id}/toggle`), {
    method: 'PUT',
  })
}

export async function reorderCommands(
  items: Array<{ id: string; sort_order: number }>,
): Promise<ApiResponse<unknown>> {
  return request(buildUrl('api/v1/admin/commands/reorder'), {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}
