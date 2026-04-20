import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BulbOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  TagsOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  deleteImage,
  fetchImageDetail,
  fetchImages,
  generateImage,
  updateImage,
  uploadImage,
  type AdminImage,
  type ImageCategory,
} from '../../services/imageService'
import styles from '../SystemSkills/SystemSkills.module.less'

type CategoryFilter = 'all' | ImageCategory
type UsageFilter = 'all' | 'skill' | 'agent'

const CATEGORY_OPTIONS: Array<{ label: string; value: CategoryFilter }> = [
  { label: '全部类目', value: 'all' },
  { label: '头像', value: 'avatar' },
  { label: '图标', value: 'icon' },
  { label: '横幅', value: 'banner' },
  { label: '其他', value: 'misc' },
]

const USAGE_OPTIONS: Array<{ label: string; value: UsageFilter }> = [
  { label: '全部用途', value: 'all' },
  { label: '技能图片', value: 'skill' },
  { label: '智能体图片', value: 'agent' },
]

const CATEGORY_LABEL_MAP: Record<string, string> = {
  avatar: '头像',
  icon: '图标',
  banner: '横幅',
  misc: '其他',
}

function normalizeTagList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDate(value: string): string {
  if (!value) return '-'
  return value.slice(0, 19).replace('T', ' ')
}

function formatSize(size: number | null): string {
  if (!size || Number.isNaN(size)) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function getUsageType(tags: string[]): UsageFilter {
  if (tags.includes('skill')) return 'skill'
  if (tags.includes('agent')) return 'agent'
  return 'all'
}

function getUsageLabel(tags: string[]): string {
  const usage = getUsageType(tags)
  if (usage === 'skill') return '技能图片'
  if (usage === 'agent') return '智能体图片'
  return '未分类用途'
}

function buildImageFallback(image: AdminImage): AdminImage {
  return {
    ...image,
    thumbnail_url: image.thumbnail_url || image.url || null,
  }
}

export default function Images() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<AdminImage[]>([])
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingImage, setEditingImage] = useState<AdminImage | null>(null)
  const [viewingImage, setViewingImage] = useState<AdminImage | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadForm] = Form.useForm()
  const [generateForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const loadImages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchImages({
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        keyword: searchText || undefined,
        tags: usageFilter === 'all' ? undefined : usageFilter,
        limit: 100,
        skip: 0,
      })
      if (res.success) {
        setImages(res.data.images || [])
      } else {
        message.error(res.msg || '加载失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, message, searchText, usageFilter])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  const summary = useMemo(() => {
    const skillCount = images.filter((item) => getUsageType(item.tags) === 'skill').length
    const agentCount = images.filter((item) => getUsageType(item.tags) === 'agent').length
    return {
      total: images.length,
      skill: skillCount,
      agent: agentCount,
    }
  }, [images])

  const filteredImages = useMemo(() => {
    return images.filter((item) => {
      const matchKeyword =
        !searchText ||
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description.toLowerCase().includes(searchText.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()))

      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter
      const matchUsage = usageFilter === 'all' || getUsageType(item.tags) === usageFilter

      return matchKeyword && matchCategory && matchUsage
    })
  }, [categoryFilter, images, searchText, usageFilter])

  const handleDelete = async (imageId: string) => {
    try {
      const res = await deleteImage(imageId)
      if (res.success) {
        message.success('删除成功')
        loadImages()
      } else {
        message.error(res.msg || '删除失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleViewDetail = async (image: AdminImage) => {
    setDetailModalOpen(true)
    setDetailLoading(true)
    setViewingImage(buildImageFallback(image))
    try {
      const res = await fetchImageDetail(image.image_id)
      if (res.success) {
        setViewingImage(buildImageFallback(res.data))
      } else {
        message.error(res.msg || '获取详情失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleEdit = (image: AdminImage) => {
    setEditingImage(image)
    editForm.setFieldsValue({
      name: image.name,
      category: image.category || 'misc',
      tags: image.tags.join(', '),
      description: image.description,
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: {
    name: string
    category: string
    tags: string
    description: string
  }) => {
    if (!editingImage) return
    try {
      const res = await updateImage(editingImage.image_id, {
        name: values.name,
        category: values.category,
        tags: normalizeTagList(values.tags),
        description: values.description,
      })
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingImage(null)
        loadImages()
      } else {
        message.error(res.msg || '更新失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleUpload = async (values: {
    name: string
    category: ImageCategory
    usage_type: UsageFilter
    extra_tags: string
    description: string
  }) => {
    if (!uploadFile) {
      message.error('请先选择图片文件')
      return
    }

    try {
      const usageTags = values.usage_type === 'all' ? [] : [values.usage_type]
      const extraTags = normalizeTagList(values.extra_tags)
      const tags = Array.from(new Set([...usageTags, ...extraTags]))
      const res = await uploadImage({
        file: uploadFile,
        name: values.name,
        category: values.category,
        tags,
        description: values.description,
      })
      if (res.success) {
        message.success('上传成功')
        setUploadModalOpen(false)
        setUploadFile(null)
        uploadForm.resetFields()
        loadImages()
      } else {
        message.error(res.msg || '上传失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleGenerate = async (values: {
    prompt: string
    style: string
    size: string
    name: string
    category: ImageCategory
    usage_type: UsageFilter
    extra_tags: string
  }) => {
    try {
      const usageTags = values.usage_type === 'all' ? [] : [values.usage_type]
      const extraTags = normalizeTagList(values.extra_tags)
      const tags = Array.from(new Set([...usageTags, ...extraTags]))
      const res = await generateImage({
        prompt: values.prompt,
        style: values.style || null,
        size: values.size || '1024x1024',
        name: values.name || null,
        category: values.category,
        tags,
      })
      if (res.success) {
        message.success('AI 生图任务已完成')
        setGenerateModalOpen(false)
        generateForm.resetFields()
        loadImages()
      } else {
        message.error(res.msg || 'AI 生图失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const columns: ColumnsType<AdminImage> = [
    {
      title: '预览',
      key: 'preview',
      width: 92,
      render: (_: unknown, record) => (
        record.thumbnail_url || record.url ? (
          <Image
            src={record.thumbnail_url || record.url}
            alt={record.name}
            width={48}
            height={48}
            style={{ objectFit: 'cover', borderRadius: 8 }}
            preview={{ src: record.url || record.thumbnail_url || undefined }}
            fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNDgiIHk9IjUyIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7ml6Dlm748L3RleHQ+PC9zdmc+"
          />
        ) : (
          <div className={styles.skillIcon}>
            <PictureOutlined />
          </div>
        )
      ),
    },
    {
      title: '图片信息',
      key: 'name',
      width: 240,
      render: (_: unknown, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Typography.Text
            strong
            title={record.name}
            ellipsis={{ tooltip: record.name }}
            style={{ maxWidth: 180 }}
          >
            {record.name}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.image_id || '-'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '主类目',
      key: 'category',
      width: 100,
      render: (_: unknown, record) => (
        <Tag>{CATEGORY_LABEL_MAP[record.category] || record.category || '未分类'}</Tag>
      ),
    },
    {
      title: '系统用途',
      key: 'usage',
      width: 110,
      render: (_: unknown, record) => {
        const usage = getUsageType(record.tags)
        const color = usage === 'skill' ? 'blue' : usage === 'agent' ? 'green' : 'default'
        return <Tag color={color}>{getUsageLabel(record.tags)}</Tag>
      },
    },
    {
      title: '标签',
      key: 'tags',
      width: 220,
      render: (_: unknown, record) => (
        <Space size={[4, 4]} wrap>
          {record.tags.length > 0 ? record.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <span style={{ color: '#999' }}>无</span>}
        </Space>
      ),
    },
    {
      title: '尺寸 / 大小',
      key: 'meta',
      width: 140,
      render: (_: unknown, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>{record.width && record.height ? `${record.width} x ${record.height}` : '-'}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatSize(record.file_size)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right',
      render: (_: unknown, record) => (
        <Space size={4}>
          <Tooltip title="详情">
            <Button type="link" size="small" icon={<EyeOutlined />} style={{ padding: '0 4px' }} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} style={{ padding: '0 4px' }} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除图片 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.image_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>图片管理</h1>
          <p className={styles.pageDesc}>统一管理系统里的图片资源，覆盖技能图片、智能体图片等用途，主视图支持按类目和用途筛选。</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadImages}>刷新</Button>
          <Button icon={<BulbOutlined />} onClick={() => setGenerateModalOpen(true)}>AI 生图</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadModalOpen(true)}>
            上传图片
          </Button>
        </Space>
      </div>

      <div className={styles.summaryGrid}>
        <Card size="small" className={styles.summaryCard}>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary" className={styles.summaryLabel}>全部图片</Typography.Text>
            <Typography.Title level={3} className={styles.summaryValue}>{summary.total}</Typography.Title>
          </Space>
        </Card>
        <Card size="small" className={styles.summaryCard}>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary" className={styles.summaryLabel}>技能图片</Typography.Text>
            <Typography.Title level={3} className={styles.summaryValue}>{summary.skill}</Typography.Title>
          </Space>
        </Card>
        <Card size="small" className={styles.summaryCard}>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary" className={styles.summaryLabel}>智能体图片</Typography.Text>
            <Typography.Title level={3} className={styles.summaryValue}>{summary.agent}</Typography.Title>
          </Space>
        </Card>
      </div>

      <div className={styles.tableCard}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Segmented options={CATEGORY_OPTIONS} value={categoryFilter} onChange={(value) => setCategoryFilter(value as CategoryFilter)} />
            <Segmented options={USAGE_OPTIONS} value={usageFilter} onChange={(value) => setUsageFilter(value as UsageFilter)} />
            <Input.Search
              placeholder="搜索图片名称、描述或标签..."
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              style={{ width: 320, maxWidth: '100%' }}
            />
          </div>
          <Space size={[8, 8]} wrap>
            <Tag icon={<PictureOutlined />}>主类目: 头像 / 图标 / 横幅 / 其他</Tag>
            <Tag icon={<TagsOutlined />}>用途标签: `skill` 标记技能图，`agent` 标记智能体图</Tag>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredImages}
          rowKey="image_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: false,
          }}
          scroll={{ x: 1180 }}
        />
      </div>

      <Modal
        title="AI 生图"
        open={generateModalOpen}
        onCancel={() => {
          setGenerateModalOpen(false)
          generateForm.resetFields()
        }}
        onOk={async () => {
          await generateForm.validateFields()
          generateForm.submit()
        }}
        width={720}
      >
        <Form
          form={generateForm}
          layout="vertical"
          onFinish={handleGenerate}
          initialValues={{
            style: '',
            size: '1024x1024',
            name: '',
            category: 'avatar',
            usage_type: 'skill',
            extra_tags: '',
          }}
        >
          <Form.Item
            label="图片描述"
            name="prompt"
            rules={[{ required: true, message: '请输入图片描述' }]}
            extra="这里直接写你想生成的图片内容、风格、主体和构图要求。"
          >
            <Input.TextArea rows={4} placeholder="例如：一个蓝色科技风格的 AI 编程助手头像，简约扁平设计，干净白底" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="风格" name="style">
              <Select
                allowClear
                options={[
                  { label: '写实', value: '写实' },
                  { label: '卡通', value: '卡通' },
                  { label: '水彩', value: '水彩' },
                  { label: '油画', value: '油画' },
                ]}
                placeholder="可选"
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
          <Form.Item label="图片名称" name="name" extra="可以留空，后端会根据 prompt 自动生成。">
            <Input placeholder="例如：AI 编程助手头像" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="主类目" name="category" rules={[{ required: true, message: '请选择主类目' }]}>
              <Select
                options={CATEGORY_OPTIONS.filter((item) => item.value !== 'all').map((item) => ({
                  label: item.label,
                  value: item.value,
                }))}
              />
            </Form.Item>
            <Form.Item label="系统用途" name="usage_type" rules={[{ required: true, message: '请选择系统用途' }]}>
              <Select
                options={USAGE_OPTIONS.filter((item) => item.value !== 'all').map((item) => ({
                  label: item.label,
                  value: item.value,
                }))}
              />
            </Form.Item>
          </div>
          <Form.Item label="附加标签" name="extra_tags" extra="多个标签用英文逗号分隔，比如：蓝色, 扁平, 助手">
            <Input placeholder="蓝色, 扁平, 助手" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上传图片"
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false)
          setUploadFile(null)
          uploadForm.resetFields()
        }}
        onOk={async () => {
          await uploadForm.validateFields()
          uploadForm.submit()
        }}
        width={720}
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleUpload}
          initialValues={{
            category: 'avatar',
            usage_type: 'skill',
            extra_tags: '',
            description: '',
          }}
        >
          <Form.Item
            label="图片文件"
            required
            extra="支持 png、jpg、jpeg、gif、webp、svg，大小不超过 5MB。"
          >
            <Upload.Dragger
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              maxCount={1}
              beforeUpload={(file) => {
                setUploadFile(file)
                if (!uploadForm.getFieldValue('name')) {
                  uploadForm.setFieldValue('name', file.name.replace(/\.[^.]+$/, ''))
                }
                return false
              }}
              onRemove={() => setUploadFile(null)}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p>点击或拖拽图片到此处上传</p>
              <p className="ant-upload-hint">上传后会进入系统图片库，方便技能和智能体统一复用</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item label="图片名称" name="name" rules={[{ required: true, message: '请输入图片名称' }]}>
            <Input placeholder="例如：AI 编程助手头像" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="主类目" name="category" rules={[{ required: true, message: '请选择主类目' }]}>
              <Select
                options={CATEGORY_OPTIONS.filter((item) => item.value !== 'all').map((item) => ({
                  label: item.label,
                  value: item.value,
                }))}
              />
            </Form.Item>
            <Form.Item label="系统用途" name="usage_type" rules={[{ required: true, message: '请选择系统用途' }]}>
              <Select
                options={USAGE_OPTIONS.filter((item) => item.value !== 'all').map((item) => ({
                  label: item.label,
                  value: item.value,
                }))}
              />
            </Form.Item>
          </div>
          <Form.Item label="附加标签" name="extra_tags" extra="多个标签用英文逗号分隔，比如：蓝色, 扁平, 助手">
            <Input placeholder="蓝色, 扁平, 助手" />
          </Form.Item>
          <Form.Item label="图片描述" name="description">
            <Input.TextArea rows={3} placeholder="补充图片风格、适用场景或约束说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑图片元数据"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          setEditingImage(null)
        }}
        onOk={async () => {
          await editForm.validateFields()
          editForm.submit()
        }}
        width={640}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item label="图片名称" name="name" rules={[{ required: true, message: '请输入图片名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="主类目" name="category" rules={[{ required: true, message: '请选择主类目' }]}>
            <Select
              options={CATEGORY_OPTIONS.filter((item) => item.value !== 'all').map((item) => ({
                label: item.label,
                value: item.value,
              }))}
            />
          </Form.Item>
          <Form.Item label="标签" name="tags" extra="多个标签用英文逗号分隔，系统用途建议保留 skill 或 agent。">
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="图片详情"
        open={detailModalOpen}
        footer={null}
        onCancel={() => {
          setDetailModalOpen(false)
          setViewingImage(null)
        }}
        width={820}
      >
        {viewingImage && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fafafa', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {viewingImage.url || viewingImage.thumbnail_url ? (
                <Image
                  src={viewingImage.url || viewingImage.thumbnail_url || ''}
                  alt={viewingImage.name}
                  style={{ maxHeight: 320, objectFit: 'contain' }}
                />
              ) : (
                <PictureOutlined style={{ fontSize: 40, color: '#999' }} />
              )}
            </div>
            <Spin spinning={detailLoading}>
              <Descriptions
                bordered
                column={1}
                size="small"
                items={[
                  { key: 'name', label: '图片名称', children: viewingImage.name || '-' },
                  { key: 'id', label: '图片 ID', children: viewingImage.image_id || '-' },
                  { key: 'category', label: '主类目', children: CATEGORY_LABEL_MAP[viewingImage.category] || viewingImage.category || '-' },
                  { key: 'usage', label: '系统用途', children: getUsageLabel(viewingImage.tags) },
                  { key: 'tags', label: '标签', children: viewingImage.tags.length ? <Space size={[4, 4]} wrap>{viewingImage.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space> : '-' },
                  { key: 'description', label: '描述', children: viewingImage.description || '-' },
                  { key: 'resolution', label: '分辨率', children: viewingImage.width && viewingImage.height ? `${viewingImage.width} x ${viewingImage.height}` : '-' },
                  { key: 'size', label: '文件大小', children: formatSize(viewingImage.file_size) },
                  { key: 'mime_type', label: '文件类型', children: viewingImage.mime_type || '-' },
                  { key: 'url', label: '访问地址', children: viewingImage.url ? <Typography.Link href={viewingImage.url} target="_blank">{viewingImage.url}</Typography.Link> : '-' },
                  { key: 'created_at', label: '创建时间', children: formatDate(viewingImage.created_at) },
                  { key: 'updated_at', label: '更新时间', children: formatDate(viewingImage.updated_at) },
                ]}
              />
            </Spin>
          </div>
        )}
      </Modal>
    </div>
  )
}
