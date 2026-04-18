import { config } from './config'

type OssConfig = {
  token: string
  tenantId: string
  ossSignUrl: string
  bucketName: string
}

const DEFAULT_OSS_SIGN_URL = 'https://test-guoren-api.grtcloud.net/jeecg-boot/open/aliyun/oss/v1/temp/url'
const DEFAULT_BUCKET_NAME = 'guoren-files-test'
const DEFAULT_CONTENT_TYPE = 'text/plain'

let cachedOssConfig: OssConfig | null = null

async function loadOssConfig(): Promise<OssConfig> {
  if (cachedOssConfig) return cachedOssConfig

  cachedOssConfig = {
    token: config.token || '',
    tenantId: config.user_id || '1000',
    ossSignUrl: DEFAULT_OSS_SIGN_URL,
    bucketName: DEFAULT_BUCKET_NAME,
  }

  return cachedOssConfig
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
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify({
        bucketName,
        objectKey,
        method: 'PUT',
        headers: { 'Content-Type': DEFAULT_CONTENT_TYPE },
      }),
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
      error: '获取签名URL失败',
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
          // 去掉签名参数，返回实际文件地址
          url: signedUrl.split('?')[0],
        })
      } else {
        resolve({
          success: false,
          fileName: file.name,
          url: '',
          error: `上传失败: HTTP ${xhr.status}`,
        })
      }
    }

    xhr.onerror = () => {
      resolve({
        success: false,
        fileName: file.name,
        url: '',
        error: '网络请求失败',
      })
    }

    xhr.send(file)
  })
}
