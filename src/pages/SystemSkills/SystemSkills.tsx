import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, message, Popconfirm, Space, Upload, Spin, Select, Switch, Card } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { fetchSystemSkills, fetchSystemSkillDetail, deleteSystemSkill, createSystemSkill, updateSystemSkill, uploadZipSkill, type SystemSkill, type ConfigField } from '../../services/skillService'
import { Section, Row } from '../ClawHub/ClawHub'
import clawhubStyles from '../ClawHub/ClawHub.module.less'
import styles from './SystemSkills.module.less'

// 配置字段编辑器组件
function ConfigFieldEditor({ value, onChange }: { value: ConfigField[]; onChange: (v: ConfigField[]) => void }) {
  const addField = () => {
    onChange([...value, { key: '', label: '', type: 'text', required: false, default: '' }])
  }

  const updateField = (index: number, field: Partial<ConfigField>) => {
    const newFields = [...value]
    newFields[index] = { ...newFields[index], ...field }
    onChange(newFields)
  }

  const removeField = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const addOption = (index: number) => {
    const newFields = [...value]
    if (!newFields[index].options) newFields[index].options = []
    newFields[index].options!.push({ label: '', value: '' })
    onChange(newFields)
  }

  const updateOption = (fieldIndex: number, optionIndex: number, opt: Partial<{ label: string; value: string }>) => {
    const newFields = [...value]
    if (newFields[fieldIndex].options) {
      newFields[fieldIndex].options![optionIndex] = { ...newFields[fieldIndex].options![optionIndex], ...opt }
      onChange(newFields)
    }
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...value]
    if (newFields[fieldIndex].options) {
      newFields[fieldIndex].options = newFields[fieldIndex].options!.filter((_, i) => i !== optionIndex)
      onChange(newFields)
    }
  }

  return (
    <div className={styles.configEditor}>
      {value.length === 0 && (
        <div className={styles.configEmpty}>暂无配置字段，点击下方按钮添加</div>
      )}
      {value.map((field, idx) => (
        <Card key={idx} className={styles.configCard} size="small" title={
          <div className={styles.configCardHeader}>
            <span>字段 {idx + 1}</span>
            <Button type="text" size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeField(idx)} />
          </div>
        }>
          <div className={styles.configGrid}>
            <Form.Item label="字段键名">
              <Input placeholder="如: style" value={field.key} onChange={(e) => updateField(idx, { key: e.target.value })} />
            </Form.Item>
            <Form.Item label="显示标签">
              <Input placeholder="如: 画风" value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
            </Form.Item>
            <Form.Item label="字段类型">
              <Select value={field.type} onChange={(v) => updateField(idx, { type: v })} style={{ width: '100%' }}>
                <Select.Option value="text">文本输入</Select.Option>
                <Select.Option value="select">下拉选择</Select.Option>
                <Select.Option value="number">数字输入</Select.Option>
                <Select.Option value="switch">开关</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="是否必填">
              <Switch checked={field.required} onChange={(v) => updateField(idx, { required: v })} />
            </Form.Item>
            <Form.Item label="默认值" className={styles.configFullWidth}>
              <Input placeholder="默认值" value={String(field.default ?? '')} onChange={(e) => updateField(idx, { default: e.target.value })} />
            </Form.Item>
          </div>
          {field.type === 'select' && (
            <div className={styles.optionsSection}>
              <div className={styles.optionsHeader}>
                <span>选项列表</span>
                <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => addOption(idx)}>添加选项</Button>
              </div>
              {field.options?.map((opt, optIdx) => (
                <div key={optIdx} className={styles.optionRow}>
                  <Input placeholder="标签" value={opt.label} onChange={(e) => updateOption(idx, optIdx, { label: e.target.value })} style={{ width: 120 }} />
                  <Input placeholder="值" value={opt.value} onChange={(e) => updateOption(idx, optIdx, { value: e.target.value })} style={{ width: 120 }} />
                  <Button type="text" size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeOption(idx, optIdx)} />
                </div>
              ))}
              {!field.options?.length && <div className={styles.optionsEmpty}>暂无选项</div>}
            </div>
          )}
        </Card>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={addField} block className={styles.addFieldBtn}>
        添加配置字段
      </Button>
    </div>
  )
}

// 配置字段展示组件
function ConfigFieldDisplay({ fields }: { fields: ConfigField[] }) {
  if (!fields || fields.length === 0) return <span className={styles.noConfig}>无配置字段</span>
  return (
    <div className={styles.configDisplay}>
      {fields.map((f, idx) => (
        <div key={idx} className={styles.configItem}>
          <div className={styles.configItemHeader}>
            <Tag color="blue">{f.key}</Tag>
            <span className={styles.configItemLabel}>{f.label}</span>
            {f.required && <Tag color="red">必填</Tag>}
          </div>
          <div className={styles.configItemMeta}>
            <span>类型: {f.type}</span>
            {f.default !== undefined && f.default !== null && f.default !== '' && (
              <span>默认: {String(f.default)}</span>
            )}
          </div>
          {f.type === 'select' && f.options && f.options.length > 0 && (
            <div className={styles.configOptions}>
              {f.options.map((opt, i) => (
                <Tag key={i}>{opt.label} ({opt.value})</Tag>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function SystemSkills() {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<SystemSkill[]>([])
  const [searchText, setSearchText] = useState('')
  const [configFields, setConfigFields] = useState<ConfigField[]>([])
  const [editConfigFields, setEditConfigFields] = useState<ConfigField[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SystemSkill | null>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<SystemSkill | null>(null)

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
    skill_md_content: string
  }) => {
    try {
      const placeholders = values.placeholders
        ? values.placeholders.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const res = await createSystemSkill({
        name: values.name,
        chinese_name: values.chinese_name,
        description: values.description,
        template: values.template,
        placeholders,
        config_fields: configFields,
        skill_md_content: values.skill_md_content,
      })
      if (res.success) {
        message.success('创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        setConfigFields([])
        loadSkills()
      } else {
        message.error(res.msg || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const handleEdit = async (skill: SystemSkill) => {
    setEditingSkill(skill)
    setEditModalOpen(true)
    setEditConfigFields(skill.config_fields || [])
    editForm.setFieldsValue({
      name: skill.name,
      chinese_name: skill.chinese_name,
      description: skill.description,
      template: skill.template || '',
      placeholders: skill.placeholders?.join(', ') || '',
      skill_md_content: '',
    })
    // 从详情接口获取完整 SKILL.md 内容
    try {
      const res = await fetchSystemSkillDetail(skill.name)
      if (res.success) {
        editForm.setFieldValue('skill_md_content', res.data.skill_md || '')
      }
    } catch {
      // 静默失败，SKILL.md 保持为空
    }
  }

  const handleUpdate = async (values: {
    chinese_name: string
    description: string
    template: string
    placeholders: string
    skill_md_content: string
  }) => {
    if (!editingSkill) return
    try {
      const placeholders = values.placeholders
        ? values.placeholders.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const data: Record<string, unknown> = {
        chinese_name: values.chinese_name,
        description: values.description,
        template: values.template,
        placeholders,
        config_fields: editConfigFields,
      }
      if (values.skill_md_content) {
        data.skill_md_content = values.skill_md_content
      }
      const res = await updateSystemSkill(editingSkill.name, data)
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingSkill(null)
        setEditConfigFields([])
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
      const res = await uploadZipSkill(uploadFile)
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

  const handleViewDetail = async (skill: SystemSkill) => {
    setDetailModalOpen(true)
    setDetailLoading(true)
    setDetailData(null)
    try {
      const res = await fetchSystemSkillDetail(skill.name)
      if (res.success) {
        setDetailData(res.data)
      } else {
        message.error(res.msg || '获取详情失败')
        setDetailModalOpen(false)
      }
    } catch {
      message.error('网络请求失败')
      setDetailModalOpen(false)
    } finally {
      setDetailLoading(false)
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
      ellipsis: true,
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
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <span title={text} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
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
      ellipsis: true,
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
      width: 170,
      fixed: 'right',
      render: (_: unknown, record: SystemSkill) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<InfoCircleOutlined />} style={{ padding: '0 4px' }} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
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
          <h1 className={styles.pageTitle}>系统技能</h1>
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
          scroll={{ x: 740 }}
        />
      </div>

      {/* 创建技能弹窗 */}
      <Modal
        title="创建系统技能"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); setConfigFields([]) }}
        onOk={createForm.submit}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="技能名称" name="name" rules={[{ required: true }]} tooltip="技能的唯一标识，创建后不可修改">
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
          <Form.Item label="配置字段">
            <ConfigFieldEditor value={configFields} onChange={setConfigFields} />
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
        onCancel={() => { setEditModalOpen(false); setEditingSkill(null); setEditConfigFields([]) }}
        onOk={editForm.submit}
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        {editingSkill && (
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item label="技能名称" name="name" tooltip="唯一标识，不可修改">
              <Input disabled />
            </Form.Item>
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
            <Form.Item label="配置字段">
              <ConfigFieldEditor value={editConfigFields} onChange={setEditConfigFields} />
            </Form.Item>
            <Form.Item label="SKILL.md 内容" name="skill_md_content">
              <Input.TextArea rows={8} placeholder="留空则不更新 SKILL.md" />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 技能详情弹窗 */}
      <Modal
        title={<span style={{ fontSize: 18 }}>{detailData?.name || '技能详情'}</span>}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={720}
      >
        <Spin spinning={detailLoading}>
          {detailData && (
            <div className={clawhubStyles.detailContent}>
              {/* 基本信息 */}
              <Section title="基本信息">
                <Row label="名称" value={detailData.name} mono />
                <Row label="中文名" value={detailData.chinese_name} />
                <Row label="状态" value={detailData.enabled ? '已启用' : '已停用'} />
                <Row label="来源" value={detailData.source} />
                <Row label="描述" value={detailData.description} />
              </Section>

              {/* 模板 */}
              {detailData.template && (
                <Section title="模板">
                  <div className={clawhubStyles.detailValueMono} style={{ whiteSpace: 'pre-wrap' }}>
                    {detailData.template}
                  </div>
                </Section>
              )}

              {/* 占位符 */}
              {detailData.placeholders && detailData.placeholders.length > 0 && (
                <Section title="占位符">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detailData.placeholders.map(p => <Tag key={p}>{p}</Tag>)}
                  </div>
                </Section>
              )}

              {/* 配置字段 */}
              {detailData.config_fields && detailData.config_fields.length > 0 && (
                <Section title="配置字段">
                  <ConfigFieldDisplay fields={detailData.config_fields} />
                </Section>
              )}

              {/* 路径 */}
              {detailData.skill_path && (
                <Section title="路径">
                  <div className={clawhubStyles.detailValueMono} style={{ wordBreak: 'break-all' }}>
                    {detailData.skill_path}
                  </div>
                </Section>
              )}

              {/* 文件列表 */}
              {detailData.file_list && detailData.file_list.length > 0 && (
                <Section title="文件列表">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detailData.file_list.map(f => <Tag key={f}>{f}</Tag>)}
                  </div>
                </Section>
              )}

              {/* SKILL.md */}
              {detailData.skill_md && (
                <Section title="SKILL.md">
                  <div className={clawhubStyles.skillMdContent}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {detailData.skill_md}
                    </ReactMarkdown>
                  </div>
                </Section>
              )}

              {/* 时间 */}
              <Section title="时间">
                <Row label="创建时间" value={detailData.created_at} />
                <Row label="更新时间" value={detailData.updated_at} />
              </Section>
            </div>
          )}
        </Spin>
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
