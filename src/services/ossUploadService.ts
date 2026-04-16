type OssConfig = {
  token: string
  tenantId: string
  ossSignUrl: string
  bucketName: string
}

const DEFAULT_OSS_SIGN_URL = 'https://test-guoren-api.grtcloud.net/jeecg-boot/open/aliyun/oss/v1/temp/url'
const DEFAULT_BUCKET_NAME = 'guoren-files-test'
const DEFAULT_CONTENT_TYPE = 'text/plain'

function parseYamlConfig(rawText: string): Record<string, string> {
  const lines = rawText.split(/\r?\n/)
  const config: Record<string, string> = {}

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) continue
    const separatorIndex = trimmedLine.indexOf(':')
    if (separatorIndex === -1) continue
    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) config[key] = value
  }
  return config
}

let cachedOssConfig: OssConfig | null = null

async function loadOssConfig(): Promise<OssConfig> {
  if (cachedOssConfig) return cachedOssConfig

  try {
    const response = await fetch('/config.yaml')
    const rawText = await response.text()
    const config = parseYamlConfig(rawText)

    cachedOssConfig = {
      token: config.token || '',
      tenantId: config.user_id || '1000',
      ossSignUrl: DEFAULT_OSS_SIGN_URL,
      bucketName: DEFAULT_BUCKET_NAME
    }
    return cachedOssConfig
  } catch (error) {
    console.error('加载 config.yaml 失败:', error)
    return {
      token: '',
      tenantId: '1000',
      ossSignUrl: DEFAULT_OSS_SIGN_URL,
      bucketName: DEFAULT_BUCKET_NAME
    }
  }
}

async function getUploadSignUrl(bucketName: string, objectKey: string): Promise<string | null> {
  const ossConfig = await loadOssConfig()
  const token = ossConfig.token
  const tenantId = ossConfig.tenantId

  try {
    const response = await fetch(ossConfig.ossSignUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token,
        'x-tenant-id': tenantId
      },
      body: JSON.stringify({
        bucketName,
        objectKey,
        method: 'PUT',
        headers: { 'Content-Type': DEFAULT_CONTENT_TYPE }
      })
    })

    const result = await response.json()
    if (result.success && result.result) {
      return result.result
    }
    return null
  } catch (error) {
    console.error('获取签名URL失败:', error)
    return null
  }
}

export interface UploadResult {
  success: boolean
  fileName: string
  url: string
  error?: string
}

export async function uploadFileToOss(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const ossConfig = await loadOssConfig()
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const objectKey = `agent_input/${timestamp}_${randomStr}_${file.name}`

  const signedUrl = await getUploadSignUrl(ossConfig.bucketName, objectKey)
  if (!signedUrl) {
    return {
      success: false,
      fileName: file.name,
      url: '',
      error: '获取签名URL失败'
    }
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', DEFAULT_CONTENT_TYPE)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress?.(progress)
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve({
          success: true,
          fileName: file.name,
          url: signedUrl.split('?')[0] // 去掉签名参数，获取实际 URL
        })
      } else {
        resolve({
          success: false,
          fileName: file.name,
          url: '',
          error: `上传失败: HTTP ${xhr.status}`
        })
      }
    }

    xhr.onerror = () => {
      resolve({
        success: false,
        fileName: file.name,
        url: '',
        error: '网络请求失败'
      })
    }

    xhr.send(file)
  })
}