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
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, message, Popconfirm, Space, Switch, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  toggleAgent,
  type AdminAgent,
} from '../../services/agentService'
import styles from '../SystemSkills/SystemSkills.module.less'

export default function Agents() {
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [searchText, setSearchText] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AdminAgent | null>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const loadAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAgents()
      if (res.success) {
        setAgents(res.data.agents)
      } else {
        message.error(res.msg || '加载失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const handleCreate = async (values: {
    agent_name: string
    description: string
    agent_prompt: string
    is_public: boolean
    enable_web_search: boolean
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
      agent_prompt: agent.agent_prompt,
      is_public: agent.is_public,
      enable_web_search: agent.enable_web_search,
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: {
    agent_name: string
    description: string
    agent_prompt: string
    is_public: boolean
    enable_web_search: boolean
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
      render: (isPublic: boolean) =>
        isPublic ? (
          <Tag color="green" icon={<GlobalOutlined />}>
            公开
          </Tag>
        ) : (
          <Tag icon={<LockOutlined />}>私有</Tag>
        ),
    },
    {
      title: '技能数',
      key: 'skills',
      width: 80,
      render: (_: unknown, record: AdminAgent) => record.enabled_skills?.length || 0,
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
      width: 200,
      render: (_: unknown, record: AdminAgent) => (
        <Space size={4}>
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
        <Input.Search
          placeholder="搜索智能体名称或描述..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.tableSearch}
        />
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
          <Form.Item label="智能体提示词" name="agent_prompt" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="智能体的 system prompt" />
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
            <Form.Item label="智能体提示词" name="agent_prompt" rules={[{ required: true }]}>
              <Input.TextArea rows={6} />
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
    </div>
  )
}
