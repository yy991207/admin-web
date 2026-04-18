import { buildUrl, request, type ApiResponse } from './config'

export interface PracticeAttachment {
  resource_id?: string | null
  file_name: string
  url: string
}

export interface PracticeMessage {
  role: 'user' | 'assistant'
  content: string
  attachments?: PracticeAttachment[]
}

export interface AdminPractice {
  practice_id: string
  command_id: string | null
  name: string
  template: string
  description: string | null
  attachments: PracticeAttachment[]
  messages: PracticeMessage[]
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PracticeListResponse {
  practices: AdminPractice[]
  total: number
}

export async function fetchPractices(isActive: boolean | null = true): Promise<ApiResponse<PracticeListResponse>> {
  let url = buildUrl('api/v1/admin/practices')
  if (isActive !== null) {
    url += `?is_active=${isActive}`
  }
  return request<PracticeListResponse>(url)
}

export async function fetchPracticesByCommand(commandId: string): Promise<ApiResponse<PracticeListResponse>> {
  return request<PracticeListResponse>(buildUrl(`api/v1/admin/practices?command_id=${encodeURIComponent(commandId)}`))
}

export async function fetchPracticeDetail(practiceId: string): Promise<ApiResponse<AdminPractice>> {
  return request<AdminPractice>(buildUrl(`api/v1/admin/practices/${practiceId}`))
}

export async function createPractice(data: {
  id: string
  name: string
  template: string
  command_id?: string | null
  description?: string | null
  attachments?: PracticeAttachment[]
  messages?: PracticeMessage[]
  sort_order?: number
}): Promise<ApiResponse<{ practice_id: string }>> {
  return request(buildUrl('api/v1/admin/practices'), {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      attachments: data.attachments || [],
      messages: data.messages || [],
      sort_order: data.sort_order ?? 0,
    }),
  })
}

export async function updatePractice(
  practiceId: string,
  data: {
    name?: string | null
    description?: string | null
    template?: string | null
    command_id?: string | null
    attachments?: PracticeAttachment[] | null
    messages?: PracticeMessage[] | null
    sort_order?: number | null
  },
): Promise<ApiResponse<{ practice_id: string }>> {
  return request(buildUrl(`api/v1/admin/practices/${practiceId}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePractice(practiceId: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/practices/${practiceId}`), {
    method: 'DELETE',
  })
}

export async function togglePractice(practiceId: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/admin/practices/${practiceId}/toggle`), {
    method: 'PUT',
  })
}

export async function reorderPractices(
  items: Array<{ id: string; sort_order: number }>,
): Promise<ApiResponse<unknown>> {
  return request(buildUrl('api/v1/admin/practices/reorder'), {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}
