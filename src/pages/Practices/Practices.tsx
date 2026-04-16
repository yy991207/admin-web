import { useCallback, useEffect, useState } from 'react'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PoweroffOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  OrderedListOutlined,
  MessageOutlined,
  UserOutlined,
  RobotOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, Popconfirm, Space, Tooltip, Segmented, App, Select, Divider } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchPractices,
  fetchPracticeDetail,
  createPractice,
  updatePractice,
  deletePractice,
  togglePractice,
  reorderPractices,
  type AdminPractice,
  type PracticeMessage,
  type PracticeAttachment,
} from '../../services/practiceService'
import { fetchCommands, type AdminCommand } from '../../services/commandService'
import AttachmentsEditor from '../../components/AttachmentsEditor/AttachmentsEditor'
import type { Attachment } from '../../components/AttachmentsEditor/AttachmentsEditor'
import styles from '../SystemSkills/SystemSkills.module.less'

export default function Practices() {
  return (
    <App>
      <PracticesContent />
    </App>
  )
}

function PracticesContent() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [practices, setPractices] = useState<AdminPractice[]>([])
  const [commands, setCommands] = useState<AdminCommand[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [reorderModalOpen, setReorderModalOpen] = useState(false)
  const [reorderList, setReorderList] = useState<AdminPractice[]>([])
  const [editingPractice, setEditingPractice] = useState<AdminPractice | null>(null)
  const [viewingPractice, setViewingPractice] = useState<AdminPractice | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  // Messages 编辑状态
  const [createMessages, setCreateMessages] = useState<PracticeMessage[]>([])
  const [editMessages, setEditMessages] = useState<PracticeMessage[]>([])

  // Attachments 编辑状态
  const [createAttachments, setCreateAttachments] = useState<Attachment[]>([])
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([])
  const [isCreateUploading, setIsCreateUploading] = useState(false)
  const [isEditUploading, setIsEditUploading] = useState(false)

  const loadPractices = useCallback(async () => {
    setLoading(true)
    try {
      const isActive = statusFilter === 'all' ? null : statusFilter === 'active'
      const res = await fetchPractices(isActive)
      if (res.success) {
        setPractices(res.data.practices || [])
      } else {
        message.error(res.msg || '加载失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, message])

  const loadCommands = useCallback(async () => {
    try {
      const res = await fetchCommands(true)
      if (res.success) {
        setCommands(res.data.commands || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadPractices()
    loadCommands()
  }, [loadPractices, loadCommands])

  const handleDelete = async (practiceId: string) => {
    try {
      const res = await deletePractice(practiceId)
      if (res.success) {
        message.success('删除成功')
        loadPractices()
      } else {
        message.error(res.msg || '删除失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleToggle = async (practiceId: string) => {
    try {
      const res = await togglePractice(practiceId)
      if (res.success) {
        message.success('状态已更新')
        loadPractices()
      } else {
        message.error(res.msg || '操作失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleCreate = async (values: {
    id: string
    name: string
    template: string
    description: string
    command_id: string
    sort_order: number
  }) => {
    try {
      const res = await createPractice({
        id: values.id,
        name: values.name,
        template: values.template,
        description: values.description || null,
        command_id: values.command_id || null,
        sort_order: values.sort_order ?? 0,
        messages: createMessages,
        attachments: createAttachments,
      })
      if (res.success) {
        message.success('创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        setCreateMessages([])
        setCreateAttachments([])
        loadPractices()
      } else {
        message.error(res.msg || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const handleEdit = (practice: AdminPractice) => {
    setEditingPractice(practice)
    editForm.setFieldsValue({
      name: practice.name,
      description: practice.description || '',
      template: practice.template,
      command_id: practice.command_id || '',
      sort_order: practice.sort_order,
    })
    setEditMessages(practice.messages || [])
    setEditAttachments(practice.attachments || [])
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: {
    name: string
    description: string
    template: string
    command_id: string
    sort_order: number
  }) => {
    if (!editingPractice) return
    try {
      const res = await updatePractice(editingPractice.practice_id, {
        name: values.name,
        description: values.description || null,
        template: values.template,
        command_id: values.command_id || null,
        sort_order: values.sort_order,
        messages: editMessages,
        attachments: editAttachments,
      })
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingPractice(null)
        setEditMessages([])
        setEditAttachments([])
        loadPractices()
      } else {
        message.error(res.msg || '更新失败')
      }
    } catch {
      message.error('更新失败')
    }
  }

  const handleViewDetail = async (practice: AdminPractice) => {
    setViewingPractice(null)
    setDetailLoading(true)
    setDetailModalOpen(true)
    try {
      const res = await fetchPracticeDetail(practice.practice_id)
      if (res.success) {
        setViewingPractice(res.data)
      } else {
        message.error(res.msg || '获取详情失败')
        setViewingPractice(practice)
      }
    } catch {
      message.error('网络请求失败')
      setViewingPractice(practice)
    } finally {
      setDetailLoading(false)
    }
  }

  const openReorderModal = async () => {
    try {
      const res = await fetchPractices(true)
      if (res.success) {
        const sorted = [...res.data.practices].sort((a, b) => a.sort_order - b.sort_order)
        setReorderList(sorted)
        setReorderModalOpen(true)
      } else {
        message.error(res.msg || '加载失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newList = [...reorderList]
    ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
    setReorderList(newList)
  }

  const moveDown = (index: number) => {
    if (index === reorderList.length - 1) return
    const newList = [...reorderList]
    ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
    setReorderList(newList)
  }

  const handleReorderSave = async () => {
    const items = reorderList.map((p, idx) => ({
      id: p.practice_id,
      sort_order: idx + 1,
    }))
    try {
      const res = await reorderPractices(items)
      if (res.success) {
        message.success('排序已保存')
        setReorderModalOpen(false)
        loadPractices()
      } else {
        message.error(res.msg || '保存失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  // Messages 编辑器函数
  const addMessage = (role: 'user' | 'assistant', messages: PracticeMessage[], setMessages: (m: PracticeMessage[]) => void) => {
    setMessages([...messages, { role, content: '', attachments: [] }])
  }

  const updateMessage = (index: number, field: 'role' | 'content', value: string, messages: PracticeMessage[], setMessages: (m: PracticeMessage[]) => void) => {
    const newMessages = [...messages]
    newMessages[index] = { ...newMessages[index], [field]: value }
    setMessages(newMessages)
  }

  const removeMessage = (index: number, messages: PracticeMessage[], setMessages: (m: PracticeMessage[]) => void) => {
    setMessages(messages.filter((_, i) => i !== index))
  }

  const filteredPractices = practices.filter(
    (p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
      p.practice_id.toLowerCase().includes(searchText.toLowerCase()),
  )

  const getCommandName = (commandId: string | null) => {
    if (!commandId) return '—'
    const cmd = commands.find(c => c.command_id === commandId)
    return cmd ? cmd.name : commandId
  }

  const columns: ColumnsType<AdminPractice> = [
    {
      title: '实践ID',
      dataIndex: 'practice_id',
      key: 'id',
      width: 160,
      ellipsis: true,
      render: (id: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{id}</span>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      ellipsis: true,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: '关联指令',
      dataIndex: 'command_id',
      key: 'command_id',
      width: 120,
      ellipsis: true,
      render: (commandId: string | null) => getCommandName(commandId),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '对话示例',
      dataIndex: 'messages',
      key: 'messages',
      width: 90,
      align: 'center',
      render: (messages: PracticeMessage[]) => (
        <Tag icon={<MessageOutlined />} color={messages?.length > 0 ? 'blue' : 'default'}>
          {messages?.length || 0} 条
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 60,
      align: 'center',
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      render: (isActive: boolean) =>
        isActive ? (
          <Tag color="blue" icon={<CheckCircleOutlined />}>已启用</Tag>
        ) : (
          <Tag icon={<StopOutlined />}>已停用</Tag>
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
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: AdminPractice) => (
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
              onClick={() => handleToggle(record.practice_id)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除实践 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.practice_id)}
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

  // Messages 编辑器组件
  const MessagesEditor = ({ messages, setMessages }: { messages: PracticeMessage[]; setMessages: (m: PracticeMessage[]) => void }) => (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>
        <MessageOutlined style={{ marginRight: 6 }} />
        对话消息示例
      </div>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', padding: 16, color: '#999', background: '#f5f5f5', borderRadius: 6 }}>
          暂无对话示例，点击下方按钮添加
        </div>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 8,
            padding: 12,
            background: msg.role === 'user' ? '#e6f7ff' : '#f6ffed',
            borderRadius: 6,
            border: `1px solid ${msg.role === 'user' ? '#91d5ff' : '#b7eb8f'}`,
          }}
        >
          <Select
            value={msg.role}
            onChange={(v) => updateMessage(index, 'role', v, messages, setMessages)}
            style={{ width: 100 }}
            options={[
              { value: 'user', label: <><UserOutlined /> 用户</> },
              { value: 'assistant', label: <><RobotOutlined /> AI</> },
            ]}
          />
          <Input.TextArea
            value={msg.content}
            onChange={(e) => updateMessage(index, 'content', e.target.value, messages, setMessages)}
            placeholder="输入消息内容..."
            rows={2}
            style={{ flex: 1 }}
          />
          <Button
            type="text"
            danger
            icon={<MinusCircleOutlined />}
            onClick={() => removeMessage(index, messages, setMessages)}
          />
        </div>
      ))}
      <Space>
        <Button type="dashed" icon={<UserOutlined />} onClick={() => addMessage('user', messages, setMessages)}>
          添加用户消息
        </Button>
        <Button type="dashed" icon={<RobotOutlined />} onClick={() => addMessage('assistant', messages, setMessages)}>
          添加AI回复
        </Button>
      </Space>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>最佳实践</h1>
          <p className={styles.pageDesc}>管理最佳实践，支持创建、编辑、删除、启用/停用、排序和对话示例</p>
        </div>
        <Space>
          <Button icon={<OrderedListOutlined />} onClick={openReorderModal}>
            排序管理
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalOpen(true); setCreateMessages([]); setCreateAttachments([]) }}>
            创建实践
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
            placeholder="搜索实践ID、名称或描述..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1, maxWidth: 320 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredPractices}
          rowKey="practice_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `共 ${t} 条记录`,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* 创建实践弹窗 */}
      <Modal
        title="创建最佳实践"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); setCreateMessages([]); setCreateAttachments([]) }}
        onOk={createForm.submit}
        confirmLoading={isCreateUploading}
        okButtonProps={{ disabled: isCreateUploading }}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="实践ID" name="id" rules={[{ required: true }]}>
            <Input placeholder="例如: bp_weekly_report" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例如: 周报生成示例" />
          </Form.Item>
          <Form.Item label="关联指令" name="command_id">
            <Select
              placeholder="选择关联的推荐指令"
              allowClear
              options={commands.map(c => ({ label: `${c.icon || ''} ${c.name}`, value: c.command_id }))}
            />
          </Form.Item>
          <Form.Item label="模板" name="template" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="指令模板，变量用 /变量名 表示" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="实践描述" />
          </Form.Item>
          <Form.Item label="排序权重" name="sort_order" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Divider />
          <MessagesEditor messages={createMessages} setMessages={setCreateMessages} />
          <Divider />
          <AttachmentsEditor attachments={createAttachments} onChange={setCreateAttachments} onUploadingChange={setIsCreateUploading} />
        </Form>
      </Modal>

      {/* 编辑实践弹窗 */}
      <Modal
        title="编辑最佳实践"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingPractice(null); setEditMessages([]); setEditAttachments([]) }}
        onOk={editForm.submit}
        confirmLoading={isEditUploading}
        okButtonProps={{ disabled: isEditUploading }}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        {editingPractice && (
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item label="实践ID">
              <Input value={editingPractice.practice_id} disabled />
            </Form.Item>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="关联指令" name="command_id">
              <Select
                placeholder="选择关联的推荐指令"
                allowClear
                options={commands.map(c => ({ label: `${c.icon || ''} ${c.name}`, value: c.command_id }))}
              />
            </Form.Item>
            <Form.Item label="模板" name="template" rules={[{ required: true }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item label="描述" name="description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="排序权重" name="sort_order">
              <Input type="number" />
            </Form.Item>
            <Divider />
            <MessagesEditor messages={editMessages} setMessages={setEditMessages} />
            <Divider />
            <AttachmentsEditor attachments={editAttachments} onChange={setEditAttachments} onUploadingChange={setIsEditUploading} />
          </Form>
        )}
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="实践详情"
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setViewingPractice(null) }}
        footer={null}
        width={720}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : viewingPractice ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <strong>实践ID：</strong>{viewingPractice.practice_id}
            </div>
            <div>
              <strong>名称：</strong>{viewingPractice.name}
            </div>
            <div>
              <strong>关联指令：</strong>{getCommandName(viewingPractice.command_id)}
            </div>
            <div>
              <strong>描述：</strong>{viewingPractice.description || '无'}
            </div>
            <div>
              <strong>状态：</strong>
              <Tag color={viewingPractice.is_active ? 'blue' : 'default'} style={{ marginLeft: 8 }}>
                {viewingPractice.is_active ? '已启用' : '已停用'}
              </Tag>
            </div>
            <div>
              <strong>排序权重：</strong>{viewingPractice.sort_order}
            </div>
            <div>
              <strong>附件：</strong>
              {viewingPractice.attachments?.length === 0 ? (
                '无'
              ) : (
                <div style={{ marginTop: 8 }}>
                  {viewingPractice.attachments?.map((att, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                      <a href={att.url} target="_blank" rel="noopener noreferrer">{att.file_name}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <strong>模板：</strong>
              <pre style={{
                background: '#f5f5f5', padding: 12, borderRadius: 6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, margin: '4px 0 0',
              }}>
                {viewingPractice.template}
              </pre>
            </div>
            {viewingPractice.messages?.length > 0 && (
              <div>
                <strong>对话示例：</strong>
                <div style={{ marginTop: 8 }}>
                  {viewingPractice.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 6,
                        background: msg.role === 'user' ? '#e6f7ff' : '#f6ffed',
                        border: `1px solid ${msg.role === 'user' ? '#91d5ff' : '#b7eb8f'}`,
                      }}
                    >
                      <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                        {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />} {msg.role === 'user' ? '用户' : 'AI'}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#999' }}>
              <span>创建时间：{viewingPractice.created_at?.slice(0, 19).replace('T', ' ')}</span>
              <span>更新时间：{viewingPractice.updated_at?.slice(0, 19).replace('T', ' ')}</span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 排序管理弹窗 */}
      <Modal
        title="排序管理"
        open={reorderModalOpen}
        onCancel={() => setReorderModalOpen(false)}
        onOk={handleReorderSave}
        okText="保存排序"
        width={480}
      >
        <p style={{ marginBottom: 12, color: '#666' }}>拖动或使用上下箭头调整已启用实践的显示顺序</p>
        {reorderList.map((p, index) => (
          <div
            key={p.practice_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #f0f0f0',
              background: index % 2 === 0 ? '#fafafa' : '#fff',
            }}
          >
            <span style={{ width: 30, color: '#999' }}>{index + 1}</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{p.name}</span>
            <Tag style={{ marginRight: 8 }}>{getCommandName(p.command_id)}</Tag>
            <Space size={0}>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => moveUp(index)}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === reorderList.length - 1}
                onClick={() => moveDown(index)}
              />
            </Space>
          </div>
        ))}
        {reorderList.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无已启用的实践</div>
        )}
      </Modal>
    </div>
  )
}