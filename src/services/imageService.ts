import { authHeaders, buildUrl, request, type ApiResponse } from './config'

export type ImageCategory = 'avatar' | 'icon' | 'banner' | 'misc'

export interface AdminImage {
  image_id: string
  name: string
  category: string
  tags: string[]
  description: string
  url: string
  thumbnail_url: string | null
  width: number | null
  height: number | null
  file_size: number | null
  mime_type: string | null
  created_at: string
  updated_at: string
}

export interface ImageListResponse {
  images: AdminImage[]
  total: number
  skip: number
  limit: number
}

export interface FetchImagesParams {
  category?: string
  keyword?: string
  tags?: string[] | string
  skip?: number
  limit?: number
}

export interface UploadImagePayload {
  file: File
  name: string
  category?: ImageCategory | string
  tags?: string[]
  description?: string
}

export interface UpdateImagePayload {
  name?: string | null
  category?: ImageCategory | string | null
  tags?: string[] | null
  description?: string | null
}

export interface GenerateImagePayload {
  prompt: string
  style?: string | null
  size?: string | null
  name?: string | null
  category?: ImageCategory | string
  tags?: string[]
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function asNullableString(value: unknown): string | null {
  const text = asString(value).trim()
  return text ? text : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }
  return null
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asString).map((item) => item.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function parseResolution(value: unknown): { width: number | null; height: number | null } {
  if (typeof value !== 'string') {
    return { width: null, height: null }
  }

  const matched = value.match(/(\d+)\s*[xX]\s*(\d+)/)
  if (!matched) {
    return { width: null, height: null }
  }

  return {
    width: Number(matched[1]),
    height: Number(matched[2]),
  }
}

function normalizeImage(rawValue: unknown): AdminImage {
  const raw = asRecord(rawValue)
  const parsedResolution = parseResolution(raw.resolution)
  const width = asNumber(raw.width) ?? parsedResolution.width
  const height = asNumber(raw.height) ?? parsedResolution.height
  const url =
    asString(raw.url) ||
    asString(raw.image_url) ||
    asString(raw.file_url) ||
    asString(raw.oss_url)

  const thumbnailUrl =
    asNullableString(raw.thumbnail_url) ||
    asNullableString(raw.thumbnail) ||
    asNullableString(raw.preview_url) ||
    asNullableString(raw.preview)

  return {
    image_id: asString(raw.image_id) || asString(raw.id),
    name: asString(raw.name) || asString(raw.filename) || '未命名图片',
    category: asString(raw.category) || 'misc',
    tags: asStringArray(raw.tags),
    description: asString(raw.description) || asString(raw.summary),
    url,
    thumbnail_url: thumbnailUrl || (url ? url : null),
    width,
    height,
    file_size: asNumber(raw.file_size) ?? asNumber(raw.size),
    mime_type: asNullableString(raw.mime_type) || asNullableString(raw.content_type),
    created_at: asString(raw.created_at) || asString(raw.createdAt),
    updated_at: asString(raw.updated_at) || asString(raw.updatedAt),
  }
}

function normalizeImageListData(value: unknown): ImageListResponse {
  const raw = asRecord(value)
  const images = Array.isArray(raw.images) ? raw.images.map(normalizeImage) : []

  return {
    images,
    total: asNumber(raw.total) ?? images.length,
    skip: asNumber(raw.skip) ?? 0,
    limit: asNumber(raw.limit) ?? images.length,
  }
}

function normalizeImageDetailData(value: unknown): AdminImage {
  const raw = asRecord(value)
  const image = raw.image ? raw.image : raw
  return normalizeImage(image)
}

export async function fetchImages(params: FetchImagesParams = {}): Promise<ApiResponse<ImageListResponse>> {
  const query = new URLSearchParams()

  if (params.category) {
    query.set('category', params.category)
  }
  if (params.keyword) {
    query.set('keyword', params.keyword)
  }
  if (params.tags) {
    const tagValue = Array.isArray(params.tags) ? params.tags.join(',') : params.tags
    if (tagValue.trim()) {
      query.set('tags', tagValue)
    }
  }
  if (typeof params.skip === 'number') {
    query.set('skip', String(params.skip))
  }
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }

  const queryString = query.toString()
  const raw = await request<Record<string, unknown>>(
    buildUrl(queryString ? `api/v1/admin/images?${queryString}` : 'api/v1/admin/images'),
  )

  return {
    ...raw,
    data: normalizeImageListData(raw.data),
  }
}

export async function fetchImageDetail(image_id: string): Promise<ApiResponse<AdminImage>> {
  const raw = await request<Record<string, unknown>>(buildUrl(`api/v1/admin/images/${image_id}`))
  return {
    ...raw,
    data: normalizeImageDetailData(raw.data),
  }
}

export async function updateImage(
  image_id: string,
  data: UpdateImagePayload,
): Promise<ApiResponse<Record<string, unknown>>> {
  return request<Record<string, unknown>>(buildUrl(`api/v1/admin/images/${image_id}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteImage(image_id: string): Promise<ApiResponse<unknown>> {
  return request<unknown>(buildUrl(`api/v1/admin/images/${image_id}`), {
    method: 'DELETE',
  })
}

export async function uploadImage(
  payload: UploadImagePayload,
): Promise<ApiResponse<Record<string, unknown>>> {
  const formData = new FormData()
  formData.append('file', payload.file)
  formData.append('name', payload.name)
  formData.append('category', payload.category || 'avatar')
  formData.append('tags', (payload.tags || []).join(','))
  formData.append('description', payload.description || '')

  const res = await fetch(buildUrl('api/v1/admin/images/upload'), {
    method: 'POST',
    body: formData,
    headers: authHeaders(),
  })

  return res.json()
}

export async function generateImage(
  payload: GenerateImagePayload,
): Promise<ApiResponse<Record<string, unknown>>> {
  return request<Record<string, unknown>>(buildUrl('api/v1/admin/images/generate'), {
    method: 'POST',
    body: JSON.stringify({
      prompt: payload.prompt,
      style: payload.style || null,
      size: payload.size || '1024x1024',
      name: payload.name || null,
      category: payload.category || 'avatar',
      tags: payload.tags || [],
    }),
  })
}
