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
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, Popconfirm, Space, Tooltip, Segmented, App } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchCommands,
  fetchAllCommands,
  fetchCommandDetail,
  createCommand,
  updateCommand,
  deleteCommand,
  toggleCommand,
  reorderCommands,
  type AdminCommand,
} from '../../services/commandService'
import AttachmentsEditor from '../../components/AttachmentsEditor/AttachmentsEditor'
import type { Attachment } from '../../components/AttachmentsEditor/AttachmentsEditor'
import styles from '../SystemSkills/SystemSkills.module.less'

export default function Commands() {
  return (
    <App>
      <CommandsContent />
    </App>
  )
}

function CommandsContent() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [commands, setCommands] = useState<AdminCommand[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [reorderModalOpen, setReorderModalOpen] = useState(false)
  const [reorderList, setReorderList] = useState<AdminCommand[]>([])
  const [editingCommand, setEditingCommand] = useState<AdminCommand | null>(null)
  const [viewingCommand, setViewingCommand] = useState<AdminCommand | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  // Attachments 编辑状态
  const [createAttachments, setCreateAttachments] = useState<Attachment[]>([])
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([])
  const [isCreateUploading, setIsCreateUploading] = useState(false)
  const [isEditUploading, setIsEditUploading] = useState(false)

  const loadCommands = useCallback(async () => {
    setLoading(true)
    try {
      let commandsData: { commands: AdminCommand[] }
      if (statusFilter === 'all') {
        const res = await fetchAllCommands()
        commandsData = res
      } else {
        const isActive = statusFilter === 'active'
        const res = await fetchCommands(isActive)
        if (!res.success) {
          message.error(res.msg || '加载失败')
          return
        }
        commandsData = res.data
      }
      setCommands(commandsData.commands)
    } catch {
      message.error('网络请求失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, message])

  useEffect(() => {
    loadCommands()
  }, [loadCommands])

  const handleDelete = async (command_id: string) => {
    try {
      const res = await deleteCommand(command_id)
      if (res.success) {
        message.success('删除成功')
        loadCommands()
      } else {
        message.error(res.msg || '删除失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleToggle = async (command_id: string) => {
    try {
      const res = await toggleCommand(command_id)
      if (res.success) {
        message.success('状态已更新')
        loadCommands()
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
    icon: string
    sort_order: number
  }) => {
    try {
      const res = await createCommand({
        id: values.id,
        name: values.name,
        template: values.template,
        description: values.description || null,
        icon: values.icon || null,
        sort_order: values.sort_order ?? 0,
        attachments: createAttachments.map(a => ({
          file_name: a.file_name,
          url: a.url,
          resource_id: a.resource_id || null,
        })),
      })
      if (res.success) {
        message.success('创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        setCreateAttachments([])
        loadCommands()
      } else {
        message.error(res.msg || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const handleEdit = (command: AdminCommand) => {
    setEditingCommand(command)
    editForm.setFieldsValue({
      name: command.name,
      description: command.description || '',
      template: command.template,
      icon: command.icon || '',
      sort_order: command.sort_order,
    })
    setEditAttachments((command.attachments || []).map(a => ({
      file_name: a.file_name,
      url: a.url,
      resource_id: a.resource_id || null,
    })))
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: {
    name: string
    description: string
    template: string
    icon: string
    sort_order: number
  }) => {
    if (!editingCommand) return
    try {
      const res = await updateCommand(editingCommand.command_id, {
        name: values.name,
        description: values.description || null,
        template: values.template,
        icon: values.icon || null,
        sort_order: values.sort_order,
        attachments: editAttachments.map(a => ({
          file_name: a.file_name,
          url: a.url,
          resource_id: a.resource_id || null,
        })),
      })
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingCommand(null)
        setEditAttachments([])
        loadCommands()
      } else {
        message.error(res.msg || '更新失败')
      }
    } catch {
      message.error('更新失败')
    }
  }

  const handleViewDetail = async (command: AdminCommand) => {
    setViewingCommand(null)
    setDetailLoading(true)
    setDetailModalOpen(true)
    try {
      const res = await fetchCommandDetail(command.command_id)
      if (res.success) {
        setViewingCommand(res.data)
      } else {
        message.error(res.msg || '获取详情失败')
        setViewingCommand(command)
      }
    } catch {
      message.error('网络请求失败')
      setViewingCommand(command)
    } finally {
      setDetailLoading(false)
    }
  }

  const openReorderModal = async () => {
    try {
      const res = await fetchCommands(true)
      if (res.success) {
        const sorted = [...res.data.commands].sort((a, b) => a.sort_order - b.sort_order)
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
    const items = reorderList.map((cmd, idx) => ({
      id: cmd.command_id,
      sort_order: idx + 1,
    }))
    try {
      const res = await reorderCommands(items)
      if (res.success) {
        message.success('排序已保存')
        setReorderModalOpen(false)
        loadCommands()
      } else {
        message.error(res.msg || '保存失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const filteredCommands = commands.filter(
    (c) =>
      c.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
      c.command_id.toLowerCase().includes(searchText.toLowerCase()),
  )

  const columns: ColumnsType<AdminCommand> = [
    {
      title: '指令ID',
      dataIndex: 'command_id',
      key: 'id',
      width: 160,
      ellipsis: true,
      render: (id: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{id}</span>,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      align: 'center',
      render: (icon: string | null) => icon ? <span style={{ fontSize: 20 }}>{icon}</span> : '—',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
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
          <Tag color="blue" icon={<CheckCircleOutlined />}>
            已启用
          </Tag>
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
      render: (_: unknown, record: AdminCommand) => (
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
              onClick={() => handleToggle(record.command_id)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除指令 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.command_id)}
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
          <h1 className={styles.pageTitle}>推荐指令</h1>
          <p className={styles.pageDesc}>管理推荐指令，支持创建、编辑、删除、启用/停用和排序</p>
        </div>
        <Space>
          <Button icon={<OrderedListOutlined />} onClick={openReorderModal}>
            排序管理
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            创建指令
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
            placeholder="搜索指令ID、名称或描述..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1, maxWidth: 320 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredCommands}
          rowKey="command_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `共 ${t} 条记录`,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* 创建指令弹窗 */}
      <Modal
        title="创建指令"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); setCreateAttachments([]) }}
        onOk={createForm.submit}
        confirmLoading={isCreateUploading}
        okButtonProps={{ disabled: isCreateUploading }}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="指令ID" name="id" rules={[{ required: true }]}>
            <Input placeholder="例如: cmd_weekly_report" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例如: 生成周报" />
          </Form.Item>
          <Form.Item label="模板" name="template" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="指令模板，变量用 /变量名 表示" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="指令描述" />
          </Form.Item>
          <Form.Item label="图标" name="icon">
            <Input placeholder="emoji 或图标字符" />
          </Form.Item>
          <Form.Item label="排序权重" name="sort_order" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="附件">
            <AttachmentsEditor attachments={createAttachments} onChange={setCreateAttachments} onUploadingChange={setIsCreateUploading} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑指令弹窗 */}
      <Modal
        title="编辑指令"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingCommand(null); setEditAttachments([]) }}
        onOk={editForm.submit}
        confirmLoading={isEditUploading}
        okButtonProps={{ disabled: isEditUploading }}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        {editingCommand && (
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item label="指令ID">
              <Input value={editingCommand.command_id} disabled />
            </Form.Item>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="模板" name="template" rules={[{ required: true }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item label="描述" name="description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="图标" name="icon">
              <Input />
            </Form.Item>
            <Form.Item label="排序权重" name="sort_order">
              <Input type="number" />
            </Form.Item>
            <Form.Item label="附件">
              <AttachmentsEditor attachments={editAttachments} onChange={setEditAttachments} onUploadingChange={setIsEditUploading} />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="指令详情"
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setViewingCommand(null) }}
        footer={null}
        width={720}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : viewingCommand ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <strong>指令ID：</strong>{viewingCommand.command_id}
            </div>
            <div>
              <strong>名称：</strong>{viewingCommand.name}
            </div>
            <div>
              <strong>图标：</strong>{viewingCommand.icon || '无'}
            </div>
            <div>
              <strong>描述：</strong>{viewingCommand.description || '无'}
            </div>
            <div>
              <strong>状态：</strong>
              <Tag color={viewingCommand.is_active ? 'blue' : 'default'} style={{ marginLeft: 8 }}>
                {viewingCommand.is_active ? '已启用' : '已停用'}
              </Tag>
            </div>
            <div>
              <strong>排序权重：</strong>{viewingCommand.sort_order}
            </div>
            <div>
              <strong>附件：</strong>
              {viewingCommand.attachments?.length === 0 ? (
                '无'
              ) : (
                <div style={{ marginTop: 8 }}>
                  {viewingCommand.attachments?.map((att, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                      <a href={att.url} target="_blank" rel="noopener noreferrer">{att.file_name}</a>
                      {att.resource_id && <Tag color="green" style={{ marginLeft: 8 }}>已解析</Tag>}
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
                {viewingCommand.template}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#999' }}>
              <span>创建时间：{viewingCommand.created_at?.slice(0, 19).replace('T', ' ')}</span>
              <span>更新时间：{viewingCommand.updated_at?.slice(0, 19).replace('T', ' ')}</span>
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
        <p style={{ marginBottom: 12, color: '#666' }}>拖动或使用上下箭头调整已启用指令的显示顺序</p>
        {reorderList.map((cmd, index) => (
          <div
            key={cmd.command_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #f0f0f0',
              background: index % 2 === 0 ? '#fafafa' : '#fff',
            }}
          >
            <span style={{ width: 30, color: '#999' }}>{index + 1}</span>
            <span style={{ width: 32, fontSize: 18 }}>{cmd.icon || '—'}</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{cmd.name}</span>
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
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无已启用的指令</div>
        )}
      </Modal>
    </div>
  )
}
