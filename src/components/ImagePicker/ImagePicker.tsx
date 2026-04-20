import { useCallback, useEffect, useState } from 'react'
import {
  PictureOutlined,
  UploadOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Form,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd'
import { fetchImages, uploadImage, generateImage, type AdminImage } from '../../services/imageService'
import { normalizeImageUrl, extractImageUrl } from './imageUtils'

function normalizeTagList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function ImagePreview(props: {
  url?: string | null
  size?: number
  alt?: string
  radius?: number
}) {
  const { url, size = 40, alt = '图片', radius = 12 } = props
  const avatarUrl = normalizeImageUrl(url)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        background: '#fafafa',
        border: '1px solid var(--gray-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={alt}
          width={size}
          height={size}
          style={{ objectFit: 'cover' }}
          preview={false}
        />
      ) : (
        <PictureOutlined style={{ color: '#999', fontSize: Math.max(18, Math.round(size / 3)) }} />
      )}
    </div>
  )
}

export interface ImagePickerProps {
  value?: string
  onChange?: (value: string) => void
  /** 图片库分类：avatar / icon / banner / misc */
  category: string
  /** 图片库筛选 tag，如 'agent' / 'skill' */
  libraryTag: string
  /** 上传/生成时图片名称前缀（如 智能体/技能 名称） */
  getUploadName: () => string
  /** AI 生成提示词 */
  getPrompt: () => string
  /** 上传时作为 description */
  getDescription?: () => string
  /** 预览大小 */
  previewSize?: number
  /** 预览圆角 */
  previewRadius?: number
  /** 预览图 alt 文案 */
  alt?: string
  /** 标题文案：「从图片库选择XX」「AI 生成XX」 */
  entityLabel?: string
  /** 底部说明 */
  hint?: string
}

export default function ImagePicker(props: ImagePickerProps) {
  const {
    value,
    onChange,
    category,
    libraryTag,
    getUploadName,
    getPrompt,
    getDescription,
    previewSize = 72,
    previewRadius = 12,
    alt = '图片',
    entityLabel = '图片',
    hint = '三条路径都会把图片落入当前图片管理库，最终回填成图片地址。',
  } = props

  const { message } = App.useApp()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [imagesLoading, setImagesLoading] = useState(false)
  const [images, setImages] = useState<AdminImage[]>([])
  const [imageKeyword, setImageKeyword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateForm] = Form.useForm()

  const syncValue = useCallback((nextValue: string) => {
    onChange?.(nextValue)
  }, [onChange])

  const loadImages = useCallback(async () => {
    setImagesLoading(true)
    try {
      const res = await fetchImages({
        keyword: imageKeyword || undefined,
        limit: 100,
      })
      if (res.success) {
        setImages(res.data.images || [])
      } else {
        message.error(res.msg || '加载图片库失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setImagesLoading(false)
    }
  }, [imageKeyword, message])

  useEffect(() => {
    if (libraryOpen) {
      loadImages()
    }
  }, [libraryOpen, loadImages])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const baseName = getUploadName() || entityLabel
      const res = await uploadImage({
        file,
        name: `${baseName}${entityLabel}`,
        category,
        tags: [libraryTag],
        description: getDescription?.() || '',
      })
      if (res.success) {
        const uploadedUrl = extractImageUrl(res.data)
        if (uploadedUrl) {
          syncValue(uploadedUrl)
          message.success('上传成功')
        } else {
          message.warning('图片已上传到图片库，但返回结果里没有拿到图片地址')
        }
      } else {
        message.error(res.msg || '上传失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setUploading(false)
    }
  }

  const handleGenerate = async (values: {
    style: string
    size: string
    extra_tags: string
  }) => {
    setGenerating(true)
    try {
      const baseName = getUploadName() || entityLabel
      const prompt = getPrompt()
      const extraTags = normalizeTagList(values.extra_tags)
      const res = await generateImage({
        prompt,
        style: values.style || null,
        size: values.size || '1024x1024',
        name: `${baseName}${entityLabel}`,
        category,
        tags: [libraryTag, ...extraTags],
      })
      if (res.success) {
        const generatedUrl = extractImageUrl(res.data)
        if (generatedUrl) {
          syncValue(generatedUrl)
        }
        setGenerateOpen(false)
        generateForm.resetFields()
        message.success(`AI ${entityLabel}已生成并入库`)
      } else {
        message.error(res.msg || 'AI 生成失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <ImagePreview url={value} size={previewSize} alt={alt} radius={previewRadius} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <Space wrap>
            <Button icon={<PictureOutlined />} onClick={() => { setLibraryOpen(true) }}>
              从图片库选择
            </Button>
            <Upload
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              showUploadList={false}
              beforeUpload={(file) => {
                void handleUpload(file)
                return false
              }}
            >
              <Button loading={uploading} icon={<UploadOutlined />}>本地上传</Button>
            </Upload>
            <Button icon={<BulbOutlined />} onClick={() => { setGenerateOpen(true) }}>
              AI 生成
            </Button>
            {value && (
              <Button onClick={() => syncValue('')}>
                清空{entityLabel}
              </Button>
            )}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {hint}
          </Typography.Text>
        </div>
      </div>

      <Modal
        title={`从图片库选择${entityLabel}`}
        open={libraryOpen}
        onCancel={() => setLibraryOpen(false)}
        footer={null}
        width={860}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input.Search
            placeholder="搜索名称或标签..."
            allowClear
            value={imageKeyword}
            onChange={(event) => setImageKeyword(event.target.value)}
            onSearch={() => loadImages()}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {images.map((image) => (
              <button
                key={image.image_id}
                type="button"
                onClick={() => {
                  syncValue(image.url)
                  setLibraryOpen(false)
                }}
                style={{
                  border: '1px solid var(--gray-100)',
                  borderRadius: 12,
                  background: '#fff',
                  padding: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ height: 120, borderRadius: 10, overflow: 'hidden', background: '#fafafa', marginBottom: 8 }}>
                  <Image src={image.thumbnail_url || image.url} alt={image.name} width="100%" height={120} style={{ objectFit: 'cover' }} preview={false} />
                </div>
                <Typography.Text title={image.name} ellipsis={{ tooltip: image.name }} style={{ display: 'block', fontWeight: 500 }}>
                  {image.name}
                </Typography.Text>
              </button>
            ))}
          </div>
          {!imagesLoading && images.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>当前没有可选的{entityLabel}</div>
          )}
        </div>
      </Modal>

      <Modal
        title={`AI 生成${entityLabel}`}
        open={generateOpen}
        onCancel={() => {
          setGenerateOpen(false)
          generateForm.resetFields()
        }}
        onOk={async () => {
          await generateForm.validateFields()
          generateForm.submit()
        }}
        confirmLoading={generating}
        width={640}
      >
        <Form
          form={generateForm}
          layout="vertical"
          onFinish={handleGenerate}
          initialValues={{
            style: '卡通',
            size: '1024x1024',
            extra_tags: '',
          }}
        >
          <Form.Item
            label="生成依据"
            extra="会自动把名称、描述等信息拼接起来发给 AI 生图接口。"
          >
            <Input.TextArea
              value={getPrompt()}
              rows={4}
              readOnly
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="风格" name="style">
              <Select
                options={[
                  { label: '写实', value: '写实' },
                  { label: '卡通', value: '卡通' },
                  { label: '水彩', value: '水彩' },
                  { label: '油画', value: '油画' },
                ]}
              />
            </Form.Item>
            <Form.Item label="尺寸" name="size">
              <Select
                options={[
                  { label: '1024 x 1024', value: '1024x1024' },
                  { label: '1792 x 1024', value: '1792x1024' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item label="附加标签" name="extra_tags" extra="多个标签用英文逗号分隔，比如：蓝色, 专业, 助手">
            <Input placeholder="蓝色, 专业, 助手" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
