export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function extractImageUrl(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const record = data as Record<string, unknown>
  const nestedImage = record.image && typeof record.image === 'object'
    ? record.image as Record<string, unknown>
    : null

  return (
    (typeof record.url === 'string' ? record.url : '') ||
    (typeof record.image_url === 'string' ? record.image_url : '') ||
    (typeof record.file_url === 'string' ? record.file_url : '') ||
    (typeof record.oss_url === 'string' ? record.oss_url : '') ||
    (nestedImage && typeof nestedImage.url === 'string' ? nestedImage.url : '') ||
    (nestedImage && typeof nestedImage.image_url === 'string' ? nestedImage.image_url : '') ||
    (nestedImage && typeof nestedImage.file_url === 'string' ? nestedImage.file_url : '') ||
    (nestedImage && typeof nestedImage.oss_url === 'string' ? nestedImage.oss_url : '') ||
    ''
  )
}
