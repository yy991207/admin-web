import { useCallback, useEffect, useState } from 'react'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  GlobalOutlined,
  LockOutlined,
  PoweroffOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, message, Popconfirm, Space, Switch, Tooltip, Select, Segmented } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchAgents,
  fetchAllAgents,
  fetchAgentDetail,
  createAgent,
  updateAgent,
  deleteAgent,
  toggleAgent,
  setAgentVisibility,
  type AdminAgent,
} from '../../services/agentService'
import styles from '../SystemSkills/SystemSkills.module.less'

export default function Agents() {
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
  }, [statusFilter])

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

  const handleVisibilityChange = async (agent_id: string, is_public: boolean) => {
    try {
      const res = await setAgentVisibility(agent_id, is_public)
      if (res.success) {
        message.success(is_public ? '已设为公开' : '已设为私有')
        loadAgents()
      } else {
        message.error(res.msg || '操作失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleCreate = async (values: {
    agent_name: string
    description: string
    avatar_url?: string
    agent_prompt: string
    enabled_skills: string[]
    resource_ids: string[]
    preset_questions: Array<{ question: string; answer: string }>
    enable_web_search: boolean
    is_public: boolean
  }) => {
    try {
      const res = await createAgent(values)
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

  const handleUpdate = async (values: {
    agent_name: string
    description: string
    avatar_url?: string
    agent_prompt: string
    enabled_skills: string[]
    resource_ids: string[]
    preset_questions: Array<{ question: string; answer: string }>
    enable_web_search: boolean
    is_public: boolean
  }) => {
    if (!editingAgent) return
    try {
      const res = await updateAgent(editingAgent.agent_id, values)
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
      title: '智能体名称',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 160,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
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
      title: '可见性',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 80,
      render: (isPublic: boolean, record: AdminAgent) => (
        <Switch
          size="small"
          checked={isPublic}
          checkedChildren={<GlobalOutlined />}
          unCheckedChildren={<LockOutlined />}
          onChange={(checked) => handleVisibilityChange(record.agent_id, checked)}
        />
      ),
    },
    {
      title: '技能数',
      key: 'skills',
      width: 80,
      render: (_: unknown, record: AdminAgent) => record.enabled_skills?.length || 0,
    },
    {
      title: '知识库',
      key: 'resources',
      width: 80,
      render: (_: unknown, record: AdminAgent) => record.resource_ids?.length || 0,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
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
          <h1 className={styles.pageTitle}>Agents</h1>
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
        width={640}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="智能体名称" name="agent_name" rules={[{ required: true }]}>
            <Input placeholder="例如: 文档助手" />
          </Form.Item>
          <Form.Item label="描述" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="智能体功能描述" />
          </Form.Item>
          <Form.Item label="头像URL" name="avatar_url">
            <Input placeholder="https://..." />
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
        width={640}
      >
        {editingAgent && (
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item label="智能体名称" name="agent_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="描述" name="description" rules={[{ required: true }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="头像URL" name="avatar_url">
              <Input />
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
              <strong>头像：</strong>{viewingAgent.avatar_url || '无'}
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
