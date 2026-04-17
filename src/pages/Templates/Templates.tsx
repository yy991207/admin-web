import { useCallback, useEffect, useState } from 'react'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  GlobalOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, message, Popconfirm, Space, Switch } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type AdminTemplate,
} from '../../services/templateService'
import styles from '../SystemSkills/SystemSkills.module.less'

export default function Templates() {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<AdminTemplate[]>([])
  const [searchText, setSearchText] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchTemplates()
      if (res.success) {
        setTemplates(res.data.templates)
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
    loadTemplates()
  }, [loadTemplates])

  const handleDelete = async (template_id: string) => {
    try {
      const res = await deleteTemplate(template_id)
      if (res.success) {
        message.success('删除成功')
        loadTemplates()
      } else {
        message.error(res.msg || '删除失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleCreate = async (values: {
    template_name: string
    description: string
    agent_prompt: string
    category: string
    is_public: boolean
    enable_web_search: boolean
  }) => {
    try {
      const res = await createTemplate(values)
      if (res.success) {
        message.success('创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        loadTemplates()
      } else {
        message.error(res.msg || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const handleEdit = (tpl: AdminTemplate) => {
    setEditingTemplate(tpl)
    editForm.setFieldsValue({
      template_name: tpl.template_name,
      description: tpl.description,
      agent_prompt: tpl.agent_prompt,
      category: tpl.category,
      is_public: tpl.is_public,
      enable_web_search: tpl.enable_web_search,
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: {
    template_name: string
    description: string
    agent_prompt: string
    category: string
    is_public: boolean
    enable_web_search: boolean
  }) => {
    if (!editingTemplate) return
    try {
      const res = await updateTemplate(editingTemplate.template_id, values)
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingTemplate(null)
        loadTemplates()
      } else {
        message.error(res.msg || '更新失败')
      }
    } catch {
      message.error('更新失败')
    }
  }

  const filteredTemplates = templates.filter(
    (t) =>
      t.template_name.toLowerCase().includes(searchText.toLowerCase()) ||
      t.description.toLowerCase().includes(searchText.toLowerCase()) ||
      t.category.toLowerCase().includes(searchText.toLowerCase()),
  )

  const columns: ColumnsType<AdminTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'template_name',
      key: 'template_name',
      width: 160,
      ellipsis: true,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat: string) => <Tag>{cat}</Tag>,
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
      key: 'status',
      width: 90,
      render: (_: unknown, record: AdminTemplate) =>
        record.is_active ? (
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
      align: 'center',
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
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 100,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: AdminTemplate) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} style={{ padding: '0 4px' }} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除模板 "${record.template_name}" 吗？`}
            onConfirm={() => handleDelete(record.template_id)}
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
          <h1 className={styles.pageTitle}>智能体模板</h1>
          <p className={styles.pageDesc}>管理智能体模板，支持创建、编辑、删除和配置</p>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            创建模板
          </Button>
        </Space>
      </div>

      <div className={styles.tableCard}>
        <Input.Search
          placeholder="搜索模板名称或描述..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.tableSearch}
        />
        <Table
          columns={columns}
          dataSource={filteredTemplates}
          rowKey="template_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `共 ${t} 条记录`,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* 创建模板弹窗 */}
      <Modal
        title="创建模板"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields() }}
        onOk={createForm.submit}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="模板名称" name="template_name" rules={[{ required: true }]}>
            <Input placeholder="例如: 文档助手" />
          </Form.Item>
          <Form.Item label="描述" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="模板功能描述" />
          </Form.Item>
          <Form.Item label="分类" name="category" initialValue="assistant">
            <Input placeholder="例如: assistant" />
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

      {/* 编辑模板弹窗 */}
      <Modal
        title="编辑模板"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingTemplate(null) }}
        onOk={editForm.submit}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        {editingTemplate && (
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item label="模板名称" name="template_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="描述" name="description" rules={[{ required: true }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="分类" name="category">
              <Input />
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
