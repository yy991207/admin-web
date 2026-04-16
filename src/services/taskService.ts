import { buildUrl } from './config'

export interface AgentTask {
  task_id: string
  user_id: string
  session_id: string
  agent_id: string
  agent_name: string
  status: string
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface TaskListResponse {
  tasks: AgentTask[]
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

export async function fetchTasks(userId = 'guoren'): Promise<ApiResponse<TaskListResponse>> {
  return request<TaskListResponse>(buildUrl(`api/v1/agent/tasks?user_id=${encodeURIComponent(userId)}`))
}

export async function fetchTaskDetail(task_id: string): Promise<ApiResponse<AgentTask>> {
  return request<AgentTask>(buildUrl(`api/v1/agent/tasks/${task_id}`))
}

export async function cancelTask(task_id: string): Promise<ApiResponse<unknown>> {
  return request(buildUrl(`api/v1/tasks/${task_id}/cancel`), {
    method: 'POST',
  })
}
