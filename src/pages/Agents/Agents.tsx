import { useCallback, useEffect, useState } from 'react'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PoweroffOutlined,
  EyeOutlined,
  PictureOutlined,
  UploadOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, App, Popconfirm, Space, Switch, Tooltip, Select, Segmented, Image, Upload, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchAgents,
  fetchAllAgents,
  fetchAgentDetail,
  createAgent,
  updateAgent,
  deleteAgent,
  toggleAgent,
  type AdminAgent,
} from '../../services/agentService'
import { fetchImages, uploadImage, generateImage, type AdminImage } from '../../services/imageService'
import styles from '../SystemSkills/SystemSkills.module.less'

type AgentFormValues = {
  agent_name: string
  description: string
  avatar_url?: string | null
  agent_prompt: string
  enabled_skills: string[]
  resource_ids: string[]
  preset_questions: Array<{ question: string; answer: string }>
  enable_web_search: boolean
  is_public: boolean
}

function normalizeTagList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildAgentAvatarPrompt(values: {
  agent_name: string
  description: string
  agent_prompt: string
}): string {
  return [values.agent_name, values.description, values.agent_prompt]
    .map((item) => item.trim())
    .filter(Boolean)
    .join('，')
}

function extractImageUrl(data: unknown): string {
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

function normalizeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function buildAgentSubmitPayload(
  values: AgentFormValues,
  form: ReturnType<typeof Form.useForm>[0],
): AgentFormValues {
  return {
    ...values,
    avatar_url: normalizeAvatarUrl(form.getFieldValue('avatar_url')),
  }
}

function AgentAvatar(props: { url?: string | null; size?: number }) {
  const { url, size = 40 } = props
  const avatarUrl = normalizeAvatarUrl(url)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
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
          alt="智能体头像"
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

function AvatarSelector(props: {
  value?: string
  onChange?: (value: string) => void
  agentNameField: string
  descriptionField: string
  promptField: string
  form: ReturnType<typeof Form.useForm>[0]
}) {
  const { message } = App.useApp()
  const { value, onChange, form, agentNameField, descriptionField, promptField } = props
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [imagesLoading, setImagesLoading] = useState(false)
  const [images, setImages] = useState<AdminImage[]>([])
  const [imageKeyword, setImageKeyword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateForm] = Form.useForm()

  const syncAvatarValue = useCallback((nextValue: string) => {
    form.setFieldValue('avatar_url', nextValue)
    onChange?.(nextValue)
  }, [form, onChange])

  const loadAvatarImages = useCallback(async () => {
    setImagesLoading(true)
    try {
      const res = await fetchImages({
        category: 'avatar',
        tags: 'agent',
        keyword: imageKeyword || undefined,
        limit: 100,
      })
      if (res.success) {
        setImages(res.data.images || [])
      } else {
        message.error(res.msg || '加载头像库失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setImagesLoading(false)
    }
  }, [imageKeyword, message])

  useEffect(() => {
    if (libraryOpen) {
      loadAvatarImages()
    }
  }, [libraryOpen, loadAvatarImages])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const agentName = form.getFieldValue(agentNameField) || '智能体头像'
      const res = await uploadImage({
        file,
        name: `${agentName}头像`,
        category: 'avatar',
        tags: ['agent'],
        description: form.getFieldValue(descriptionField) || '',
      })
      if (res.success) {
        const uploadedUrl = extractImageUrl(res.data)
        if (uploadedUrl) {
          syncAvatarValue(uploadedUrl)
          message.success('头像上传成功')
        } else {
          message.warning('图片已上传到图片库，但返回结果里没有拿到图片地址')
        }
      } else {
        message.error(res.msg || '头像上传失败')
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
      const agentName = form.getFieldValue(agentNameField) || '智能体'
      const description = form.getFieldValue(descriptionField) || ''
      const promptText = form.getFieldValue(promptField) || ''
      const prompt = buildAgentAvatarPrompt({
        agent_name: agentName,
        description,
        agent_prompt: promptText,
      })
      const extraTags = normalizeTagList(values.extra_tags)
      const res = await generateImage({
        prompt,
        style: values.style || null,
        size: values.size || '1024x1024',
        name: `${agentName}头像`,
        category: 'avatar',
        tags: ['agent', ...extraTags],
      })
      if (res.success) {
        const generatedUrl = extractImageUrl(res.data)
        if (generatedUrl) {
          syncAvatarValue(generatedUrl)
        }
        setGenerateOpen(false)
        generateForm.resetFields()
        message.success('AI 头像已生成并入库')
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
        <AgentAvatar url={value} size={72} />
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
              <Button onClick={() => syncAvatarValue('')}>
                清空头像
              </Button>
            )}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            三条路径都会把图片落入当前图片管理库，最终回填成智能体的头像地址。
          </Typography.Text>
        </div>
      </div>

      <Modal
        title="从图片库选择头像"
        open={libraryOpen}
        onCancel={() => setLibraryOpen(false)}
        footer={null}
        width={860}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input.Search
            placeholder="搜索头像名称或标签..."
            allowClear
            value={imageKeyword}
            onChange={(event) => setImageKeyword(event.target.value)}
            onSearch={() => loadAvatarImages()}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {images.map((image) => (
              <button
                key={image.image_id}
                type="button"
                onClick={() => {
                  syncAvatarValue(image.url)
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
            <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>当前没有可选的智能体头像</div>
          )}
        </div>
      </Modal>

      <Modal
        title="AI 生成头像"
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
            extra="会自动把智能体名称、描述、提示词拼接起来发给 AI 生图接口。"
          >
            <Input.TextArea
              value={buildAgentAvatarPrompt({
                agent_name: form.getFieldValue(agentNameField) || '',
                description: form.getFieldValue(descriptionField) || '',
                agent_prompt: form.getFieldValue(promptField) || '',
              })}
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

export default function Agents() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AdminAgent | null>(null)
  const [viewingAgent, setViewingAgent] = useState<AdminAgent | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const loadAgents = useCallback(async () => {
    setLoading(true)
    try {
      let agentsData: { agents: AdminAgent[] }
      if (statusFilter === 'all') {
        const res = await fetchAllAgents()
        agentsData = res
      } else {
        const isActive = statusFilter === 'active'
        const res = await fetchAgents(isActive)
        if (!res.success) {
          message.error(res.msg || '加载失败')
          return
        }
        agentsData = res.data
      }
      setAgents(agentsData.agents)
    } catch {
      message.error('网络请求失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, message])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const handleDelete = async (agent_id: string) => {
    try {
      const res = await deleteAgent(agent_id)
      if (res.success) {
        message.success('删除成功')
        loadAgents()
      } else {
        message.error(res.msg || '删除失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleToggle = async (agent_id: string) => {
    try {
      const res = await toggleAgent(agent_id)
      if (res.success) {
        message.success('状态已更新')
        loadAgents()
      } else {
        message.error(res.msg || '操作失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleCreate = async (values: AgentFormValues) => {
    try {
      const payload = buildAgentSubmitPayload(values, createForm)
      const res = await createAgent(payload)
      if (res.success) {
        message.success('创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        loadAgents()
      } else {
        message.error(res.msg || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const handleEdit = (agent: AdminAgent) => {
    setEditingAgent(agent)
    editForm.setFieldsValue({
      agent_name: agent.agent_name,
      description: agent.description,
      avatar_url: agent.avatar_url || '',
      agent_prompt: agent.agent_prompt,
      enabled_skills: agent.enabled_skills || [],
      resource_ids: agent.resource_ids || [],
      preset_questions: agent.preset_questions || [],
      enable_web_search: agent.enable_web_search,
      is_public: agent.is_public,
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: AgentFormValues) => {
    if (!editingAgent) return
    try {
      const payload = buildAgentSubmitPayload(values, editForm)
      const res = await updateAgent(editingAgent.agent_id, payload)
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingAgent(null)
        loadAgents()
      } else {
        message.error(res.msg || '更新失败')
      }
    } catch {
      message.error('更新失败')
    }
  }

  const handleViewDetail = async (agent: AdminAgent) => {
    setViewingAgent(null)
    setDetailLoading(true)
    setDetailModalOpen(true)
    try {
      const res = await fetchAgentDetail(agent.agent_id)
      if (res.success) {
        setViewingAgent(res.data)
      } else {
        message.error(res.msg || '获取详情失败')
        setViewingAgent(agent) // fallback to list data
      }
    } catch {
      message.error('网络请求失败')
      setViewingAgent(agent)
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredAgents = agents.filter(
    (a) =>
      a.agent_name.toLowerCase().includes(searchText.toLowerCase()) ||
      a.description.toLowerCase().includes(searchText.toLowerCase()),
  )

  const columns: ColumnsType<AdminAgent> = [
    {
      title: '头像',
      dataIndex: 'avatar_url',
      key: 'avatar_url',
      width: 88,
      align: 'center',
      render: (avatarUrl: string | null) => <AgentAvatar url={avatarUrl} />,
    },
    {
      title: '智能体名称',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 160,
      ellipsis: true,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      render: (isActive: boolean) =>
        isActive ? (
          <Tag color="blue" icon={<CheckCircleOutlined />}>
            已启用
          </Tag>
        ) : (
          <Tag icon={<StopOutlined />}>已停用</Tag>
        ),
    },
    {
      title: '技能数',
      key: 'skills',
      width: 70,
      align: 'center',
      render: (_: unknown, record: AdminAgent) => record.enabled_skills?.length || 0,
    },
    {
      title: '知识库',
      key: 'resources',
      width: 70,
      align: 'center',
      render: (_: unknown, record: AdminAgent) => record.resource_ids?.length || 0,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 100,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: AdminAgent) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} style={{ padding: '0 4px' }} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} style={{ padding: '0 4px' }} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Tooltip title={record.is_active ? '停用' : '启用'}>
            <Button
              type="link"
              size="small"
              icon={<PoweroffOutlined />}
              style={{ padding: '0 4px' }}
              onClick={() => handleToggle(record.agent_id)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除智能体 "${record.agent_name}" 吗？`}
            onConfirm={() => handleDelete(record.agent_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>智能体</h1>
          <p className={styles.pageDesc}>管理官方智能体，支持创建、编辑、删除、启用/停用和可见性设置</p>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            创建智能体
          </Button>
        </Space>
      </div>

      <div className={styles.tableCard}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <Segmented
            options={[
              { label: '全部', value: 'all' },
              { label: '已启用', value: 'active' },
              { label: '已停用', value: 'inactive' },
            ]}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          />
          <Input.Search
            placeholder="搜索智能体名称或描述..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1, maxWidth: 320 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredAgents}
          rowKey="agent_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `共 ${t} 条记录`,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* 创建智能体弹窗 */}
      <Modal
        title="创建智能体"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields() }}
        onOk={createForm.submit}
        width={720}
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="智能体名称" name="agent_name" rules={[{ required: true }]}>
            <Input placeholder="例如: 文档助手" />
          </Form.Item>
          <Form.Item label="描述" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="智能体功能描述" />
          </Form.Item>
          <Form.Item label="头像" name="avatar_url">
            <AvatarSelector
              form={createForm}
              agentNameField="agent_name"
              descriptionField="description"
              promptField="agent_prompt"
            />
          </Form.Item>
          <Form.Item label="智能体提示词" name="agent_prompt" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="智能体的 system prompt" />
          </Form.Item>
          <Form.Item label="启用技能" name="enabled_skills" initialValue={[]}>
            <Select mode="tags" placeholder="输入技能ID，回车添加" />
          </Form.Item>
          <Form.Item label="知识库文档" name="resource_ids" initialValue={[]}>
            <Select mode="tags" placeholder="输入文档ID，回车添加" />
          </Form.Item>
          <Form.Item label="公开" name="is_public" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="启用网络搜索" name="enable_web_search" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑智能体弹窗 */}
      <Modal
        title="编辑智能体"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingAgent(null) }}
        onOk={editForm.submit}
        width={720}
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
      >
        {editingAgent && (
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item label="智能体名称" name="agent_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="描述" name="description" rules={[{ required: true }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="头像" name="avatar_url">
              <AvatarSelector
                form={editForm}
                agentNameField="agent_name"
                descriptionField="description"
                promptField="agent_prompt"
              />
            </Form.Item>
            <Form.Item label="智能体提示词" name="agent_prompt" rules={[{ required: true }]}>
              <Input.TextArea rows={6} />
            </Form.Item>
            <Form.Item label="启用技能" name="enabled_skills">
              <Select mode="tags" placeholder="输入技能ID，回车添加" />
            </Form.Item>
            <Form.Item label="知识库文档" name="resource_ids">
              <Select mode="tags" placeholder="输入文档ID，回车添加" />
            </Form.Item>
            <Form.Item label="公开" name="is_public" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="启用网络搜索" name="enable_web_search" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="智能体详情"
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setViewingAgent(null) }}
        footer={null}
        width={720}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : viewingAgent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <strong>名称：</strong>{viewingAgent.agent_name}
            </div>
            <div>
              <strong>ID：</strong>{viewingAgent.agent_id}
            </div>
            <div>
              <strong>描述：</strong>{viewingAgent.description}
            </div>
            <div>
              <strong>头像：</strong>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 8 }}>
                <AgentAvatar url={viewingAgent.avatar_url} size={96} />
                {!viewingAgent.avatar_url && (
                  <Typography.Text type="secondary">当前未设置头像</Typography.Text>
                )}
              </div>
            </div>
            <div>
              <strong>状态：</strong>
              <Tag color={viewingAgent.is_active ? 'blue' : 'default'} style={{ marginLeft: 8 }}>
                {viewingAgent.is_active ? '已启用' : '已停用'}
              </Tag>
            </div>
            <div>
              <strong>可见性：</strong>
              <Tag color={viewingAgent.is_public ? 'green' : 'default'} style={{ marginLeft: 8 }}>
                {viewingAgent.is_public ? '公开' : '私有'}
              </Tag>
            </div>
            <div>
              <strong>网络搜索：</strong>{viewingAgent.enable_web_search ? '已启用' : '未启用'}
            </div>
            <div>
              <strong>技能：</strong>{viewingAgent.enabled_skills?.join(', ') || '无'}
            </div>
            <div>
              <strong>知识库：</strong>{viewingAgent.resource_ids?.join(', ') || '无'}
            </div>
            <div>
              <strong>预置问题：</strong>
              {viewingAgent.preset_questions?.length ? (
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {viewingAgent.preset_questions.map((q, i) => (
                    <li key={i}><strong>{q.question}</strong>：{q.answer}</li>
                  ))}
                </ul>
              ) : '无'}
            </div>
            <div>
              <strong>提示词：</strong>
              <pre style={{
                background: '#f5f5f5', padding: 12, borderRadius: 6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, margin: '4px 0 0',
              }}>
                {viewingAgent.agent_prompt}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#999' }}>
              <span>创建时间：{viewingAgent.created_at?.slice(0, 19).replace('T', ' ')}</span>
              <span>更新时间：{viewingAgent.updated_at?.slice(0, 19).replace('T', ' ')}</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
