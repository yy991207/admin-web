import { useCallback, useEffect, useState } from 'react'
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, message, Popconfirm, Space, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  fetchSystemSkills,
  deleteSystemSkill,
  createSystemSkill,
  updateSystemSkill,
  uploadZipSkill,
  type SystemSkill,
  type ConfigField,
} from '../../services/skillService'
import styles from './SystemSkills.module.less'

export default function SystemSkills() {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<SystemSkill[]>([])
  const [searchText, setSearchText] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SystemSkill | null>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [uploadFile, setUploadFile] = useState<UploadFile | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchSystemSkills()
      if (res.success) {
        setSkills(res.data.skills)
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
    loadSkills()
  }, [loadSkills])

  const handleDelete = async (name: string) => {
    try {
      const res = await deleteSystemSkill(name)
      if (res.success) {
        message.success('删除成功')
        loadSkills()
      } else {
        message.error(res.msg || '删除失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  const handleCreate = async (values: {
    name: string
    chinese_name: string
    description: string
    template: string
    placeholders: string
    config_fields: string
    skill_md_content: string
  }) => {
    try {
      const placeholders = values.placeholders
        ? values.placeholders.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const config_fields: ConfigField[] = values.config_fields
        ? JSON.parse(values.config_fields)
        : []
      const res = await createSystemSkill({
        name: values.name,
        chinese_name: values.chinese_name,
        description: values.description,
        template: values.template,
        placeholders,
        config_fields,
        skill_md_content: values.skill_md_content,
      })
      if (res.success) {
        message.success('创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        loadSkills()
      } else {
        message.error(res.msg || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const handleEdit = (skill: SystemSkill) => {
    setEditingSkill(skill)
    editForm.setFieldsValue({
      chinese_name: skill.chinese_name,
      description: skill.description,
      template: skill.template || '',
      placeholders: skill.placeholders?.join(', ') || '',
      config_fields: skill.config_fields ? JSON.stringify(skill.config_fields, null, 2) : '',
      skill_md_content: '',
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (values: {
    chinese_name: string
    description: string
    template: string
    placeholders: string
    config_fields: string
    skill_md_content: string
  }) => {
    if (!editingSkill) return
    try {
      const placeholders = values.placeholders
        ? values.placeholders.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const config_fields: ConfigField[] = values.config_fields
        ? JSON.parse(values.config_fields)
        : []
      const data: Record<string, unknown> = {
        chinese_name: values.chinese_name,
        description: values.description,
        template: values.template,
        placeholders,
        config_fields,
      }
      if (values.skill_md_content) {
        data.skill_md_content = values.skill_md_content
      }
      const res = await updateSystemSkill(editingSkill.name, data)
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingSkill(null)
        loadSkills()
      } else {
        message.error(res.msg || '更新失败')
      }
    } catch {
      message.error('更新失败')
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      message.error('请选择文件')
      return
    }
    try {
      const res = await uploadZipSkill(uploadFile.originFileObj as File)
      if (res.success) {
        message.success('导入成功')
        setUploadModalOpen(false)
        setUploadFile(null)
        loadSkills()
      } else {
        message.error(res.msg || '导入失败')
      }
    } catch {
      message.error('导入失败')
    }
  }

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.chinese_name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.description.toLowerCase().includes(searchText.toLowerCase()),
  )

  const columns: ColumnsType<SystemSkill> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string) => (
        <div className={styles.skillName}>
          <div className={styles.skillIcon}>
            <ThunderboltOutlined />
          </div>
          <span>{name}</span>
        </div>
      ),
    },
    {
      title: '中文名',
      dataIndex: 'chinese_name',
      key: 'chinese_name',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="blue" icon={<CheckCircleOutlined />}>
            已启用
          </Tag>
        ) : (
          <Tag icon={<StopOutlined />}>已停用</Tag>
        ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 80,
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
      width: 120,
      render: (_: unknown, record: SystemSkill) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} style={{ padding: '0 4px' }} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除技能 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.name)}
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
          <h1 className={styles.pageTitle}>System Skills</h1>
          <p className={styles.pageDesc}>
            管理系统技能列表，支持创建、编辑、删除和从 ClawHub 安装
          </p>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>ZIP 导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            创建技能
          </Button>
        </Space>
      </div>

      <div className={styles.tableCard}>
        <Input.Search
          placeholder="搜索技能名称或描述..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.tableSearch}
        />
        <Table
          columns={columns}
          dataSource={filteredSkills}
          rowKey="name"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `共 ${t} 条记录`,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* 创建技能弹窗 */}
      <Modal
        title="创建系统技能"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields() }}
        onOk={createForm.submit}
        width={640}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="技能名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例如: ai-drawing" />
          </Form.Item>
          <Form.Item label="中文名" name="chinese_name" rules={[{ required: true }]}>
            <Input placeholder="例如: AI 绘图" />
          </Form.Item>
          <Form.Item label="描述" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="技能功能描述" />
          </Form.Item>
          <Form.Item label="模板" name="template">
            <Input.TextArea rows={2} placeholder="模板文本，如: 帮我画一张关于 /主题 的图片" />
          </Form.Item>
          <Form.Item label="占位符" name="placeholders" tooltip="逗号分隔，如: 主题, 风格">
            <Input placeholder="主题, 风格" />
          </Form.Item>
          <Form.Item label="配置字段" name="config_fields" tooltip="JSON 数组格式">
            <Input.TextArea rows={4} placeholder='[{"key":"style","label":"画风","type":"select","required":false,"default":"写实","options":[{"label":"写实","value":"写实"}]}]' />
          </Form.Item>
          <Form.Item label="SKILL.md 内容" name="skill_md_content" rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder="输入 SKILL.md 的完整内容" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑技能弹窗 */}
      <Modal
        title="编辑系统技能"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingSkill(null) }}
        onOk={editForm.submit}
        width={640}
      >
        {editingSkill && (
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item label="中文名" name="chinese_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="描述" name="description" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="模板" name="template">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="占位符" name="placeholders" tooltip="逗号分隔">
              <Input />
            </Form.Item>
            <Form.Item label="配置字段" name="config_fields" tooltip="JSON 数组格式">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item label="SKILL.md 内容" name="skill_md_content">
              <Input.TextArea rows={8} placeholder="留空则不更新 SKILL.md" />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* ZIP 导入弹窗 */}
      <Modal
        title="ZIP 导入技能"
        open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); setUploadFile(null) }}
        onOk={handleUpload}
        okText="导入"
      >
        <Upload.Dragger
          accept=".zip"
          maxCount={1}
          beforeUpload={(file) => {
            setUploadFile(file)
            return false
          }}
          onRemove={() => setUploadFile(null)}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p>点击或拖拽 ZIP 文件到此处</p>
          <p className="ant-upload-hint">支持批量导入/更新技能</p>
        </Upload.Dragger>
      </Modal>
    </div>
  )
}

function ThunderboltOutlined() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
