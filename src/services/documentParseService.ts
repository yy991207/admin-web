import { uploadFileToOss, type UploadResult } from './ossUploadService'
import { buildUrl, config } from './config'

export interface ParseTaskSubmission {
  task_id: string
  resource_id?: string
  file_name?: string
  message?: string
}

export interface ParseTaskStatus {
  task_id?: string
  resource_id?: string
  status?: string
  progress?: number | null
  result?: Record<string, unknown> | null
  error?: string | null
}

export interface UploadWithParseResult extends UploadResult {
  status: 'uploading' | 'parsing' | 'completed' | 'error'
  parseTaskId?: string
  resourceId?: string
}

const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'md',
  'markdown',
  'csv',
  'json',
])

const DEFAULT_POLL_INTERVAL_MS = 1500
const DEFAULT_MAX_POLL_ATTEMPTS = 40

function isDocumentFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return DOCUMENT_EXTENSIONS.has(ext)
}

async function submitParseTask(
  fileName: string,
  url: string,
): Promise<ParseTaskSubmission> {
  const response = await fetch(buildUrl('api/v1/agent/files/upload'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_name: fileName,
      url: url,
      user_id: config.user_id,
    }),
  })

  if (!response.ok) {
    throw new Error('提交文档解析任务失败')
  }

  const result = await response.json()
  if (!result.success || !result.data?.task_id) {
    throw new Error(result.msg || '提交文档解析任务失败')
  }

  return result.data
}

async function getParseTaskStatus(taskId: string): Promise<ParseTaskStatus> {
  const response = await fetch(buildUrl(`api/v1/parse/${taskId}`), {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('查询文档解析状态失败')
  }

  return await response.json()
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function pollParseTaskUntilCompleted(
  taskId: string,
  onStatusChange?: (status: 'parsing', progress?: number) => void,
): Promise<ParseTaskStatus> {
  for (let attempt = 0; attempt < DEFAULT_MAX_POLL_ATTEMPTS; attempt += 1) {
    const task = await getParseTaskStatus(taskId)
    const status = task.status?.toLowerCase()

    onStatusChange?.('parsing', task.progress)

    if (status === 'completed') {
      return task
    }

    if (status === 'failed') {
      throw new Error(task.error || '文档解析失败')
    }

    if (attempt < DEFAULT_MAX_POLL_ATTEMPTS - 1) {
      await sleep(DEFAULT_POLL_INTERVAL_MS)
    }
  }

  throw new Error('文档解析超时，请稍后重试')
}

/**
 * 上传文件到 OSS，如果是文档类型则提交解析任务并等待完成
 */
export async function uploadFileWithParse(
  file: File,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: 'uploading' | 'parsing' | 'completed' | 'error', progress?: number) => void,
): Promise<UploadWithParseResult> {
  // 第一步：上传到 OSS
  onStatusChange?.('uploading', 0)
  const uploadResult = await uploadFileToOss(file, onProgress)

  if (!uploadResult.success) {
    onStatusChange?.('error')
    return {
      ...uploadResult,
      status: 'error',
    }
  }

  // 检查是否是文档类型
  if (!isDocumentFile(file.name)) {
    onStatusChange?.('completed')
    return {
      ...uploadResult,
      status: 'completed',
    }
  }

  // 第二步：提交解析任务
  try {
    const parseTask = await submitParseTask(uploadResult.fileName, uploadResult.url)

    onStatusChange?.('parsing')

    // 第三步：轮询解析状态直到完成
    const completedTask = await pollParseTaskUntilCompleted(parseTask.task_id, (status, progress) => {
      onStatusChange?.(status, progress)
    })

    onStatusChange?.('completed')

    return {
      ...uploadResult,
      status: 'completed',
      parseTaskId: parseTask.task_id,
      resourceId: completedTask.resource_id || parseTask.resource_id,
    }
  } catch (error) {
    onStatusChange?.('error')
    return {
      ...uploadResult,
      status: 'error',
      error: error instanceof Error ? error.message : '文档解析失败',
    }
  }
}