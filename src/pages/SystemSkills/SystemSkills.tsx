import { useCallback, useEffect, useState, useRef } from 'react'
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
  FileOutlined,
  FolderOutlined,
  FileTextOutlined,
  ExpandOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, Modal, Form, App, Popconfirm, Space, Upload, Spin, Select, Switch, Card, Tooltip, Empty, Tree } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'
import { fetchSystemSkills, fetchSystemSkillDetail, deleteSystemSkill, createSystemSkill, updateSystemSkill, uploadZipSkill, fetchSkillFileContent, type SystemSkill, type ConfigField } from '../../services/skillService'
import { Section, Row } from '../ClawHub/ClawHub'
import ImagePicker, { ImagePreview } from '../../components/ImagePicker/ImagePicker'
import { normalizeImageUrl } from '../../components/ImagePicker/imageUtils'
import clawhubStyles from '../ClawHub/ClawHub.module.less'
import styles from './SystemSkills.module.less'

// --- 附件编辑器 ---

const MEDIA_EXTENSIONS = /\.(jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff|mp4|mp3|wav|avi|mov|mkv|flv|webm|ogg|wma|flac|aac|m4a)$/i

function isMediaFile(name: string): boolean {
  return MEDIA_EXTENSIONS.test(name)
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = reject
    reader.readAsText(file)
  })
}

interface TreeNode extends DataNode {
  key: string
  title: string
  isLeaf?: boolean
  children?: TreeNode[]
  fullPath: string // 完整路径
}

/** 将 flat {path: content} 构建为树结构（仅用于展示） */
function buildTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode[] = []
  const folderMap: Record<string, TreeNode> = {}

  const getOrCreateFolder = (parts: string[]): TreeNode[] => {
    if (parts.length === 0) return root
    const folderPath = parts.join('/')
    if (folderMap[folderPath]) return folderMap[folderPath].children!
    // 递归确保父级存在
    const parent = getOrCreateFolder(parts.slice(0, -1))
    const node: TreeNode = {
      key: folderPath,
      title: parts[parts.length - 1],
      isLeaf: false,
      children: [],
      fullPath: folderPath,
    }
    folderMap[folderPath] = node
    parent.push(node)
    return node.children!
  }

  for (const path of Object.keys(files).sort()) {
    const parts = path.split('/')
    const fileName = parts[parts.length - 1]
    const folderParts = parts.slice(0, -1)
    const parent = getOrCreateFolder(folderParts)
    parent.push({
      key: path,
      title: fileName,
      isLeaf: true,
      fullPath: path,
    })
  }

  // 根级别：文件在前，文件夹在后；嵌套层级：文件夹在前，文件在后
  const sortNodes = (nodes: TreeNode[], isRoot: boolean): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.isLeaf === b.isLeaf) return a.title.localeCompare(b.title)
      if (isRoot) return a.isLeaf ? -1 : 1 // 根目录：文件优先
      return a.isLeaf ? 1 : -1 // 子目录：文件夹优先
    })
    nodes.forEach(n => { if (n.children) sortNodes(n.children, false) })
    return nodes
  }
  return sortNodes(root, true)
}

function hasOwnFile(files: Record<string, string>, path: string): boolean {
  return Object.prototype.hasOwnProperty.call(files, path)
}

function FilesEditor({ value, onChange, msg }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void; msg: { warning: (s: string) => void; error: (s: string) => void; success: (s: string) => void } }) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [renamingKey, setRenamingKey] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [expandEditorOpen, setExpandEditorOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const treeData = buildTree(value)
  const selectedContent = selectedPath !== null && value[selectedPath] !== undefined ? value[selectedPath] : ''
  const isFileSelected = selectedPath !== null && value[selectedPath] !== undefined

  // 初始化展开所有文件夹
  useEffect(() => {
    const folders: string[] = []
    const collectFolders = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        if (!n.isLeaf) {
          folders.push(n.key)
          if (n.children) collectFolders(n.children)
        }
      })
    }
    collectFolders(treeData)
    setExpandedKeys(prev => {
      const merged = new Set([...prev, ...folders])
      return Array.from(merged)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(value).join(',')])

  // --- 文件操作 ---
  const addFileAt = (parentPath: string) => {
    const prefix = parentPath ? `${parentPath}/` : ''
    let name = '新建文件.txt'
    let i = 1
    while (value[`${prefix}${name}`] !== undefined) { name = `新建文件${i++}.txt` }
    const fullPath = `${prefix}${name}`
    onChange({ ...value, [fullPath]: '' })
    setSelectedPath(fullPath)
    setRenamingKey(fullPath)
    setRenameValue(name)
  }

  const addFolderAt = (parentPath: string) => {
    const prefix = parentPath ? `${parentPath}/` : ''
    let name = '新建文件夹'
    let i = 1
    // 文件夹存在判定：有任何路径以此为前缀
    const folderExists = (n: string) => Object.keys(value).some(k => k.startsWith(`${prefix}${n}/`))
    while (folderExists(name)) { name = `新建文件夹${i++}` }
    // 创建一个占位文件使文件夹可见
    const placeholderPath = `${prefix}${name}/.gitkeep`
    onChange({ ...value, [placeholderPath]: '' })
    setExpandedKeys(prev => [...prev, `${prefix}${name}`])
    setRenamingKey(`${prefix}${name}`)
    setRenameValue(name)
  }

  const removePath = (path: string, isFolder: boolean) => {
    const next = { ...value }
    if (isFolder) {
      // 删除文件夹下所有文件
      for (const k of Object.keys(next)) {
        if (k === path || k.startsWith(`${path}/`)) delete next[k]
      }
    } else {
      delete next[path]
    }
    onChange(next)
    if (selectedPath && (selectedPath === path || selectedPath.startsWith(`${path}/`))) {
      setSelectedPath(null)
    }
  }

  const startRename = (key: string, title: string) => {
    setRenamingKey(key)
    setRenameValue(title)
  }

  const commitRename = () => {
    if (!renamingKey) return
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingKey(null); return }
    if (trimmed.includes('/')) {
      msg.error('名称不能包含 /')
      return
    }

    const parts = renamingKey.split('/')
    const oldName = parts[parts.length - 1]
    if (trimmed === oldName) { setRenamingKey(null); return }

    const parentPath = parts.slice(0, -1).join('/')
    const newPrefix = parentPath ? `${parentPath}/${trimmed}` : trimmed
    const oldPrefix = renamingKey

    // 检查是否是文件夹
    const isFolder = !hasOwnFile(value, renamingKey)
    const next = { ...value }
    const pathExists = Object.keys(next).some((key) => (
      isFolder
        ? key === newPrefix || key.startsWith(`${newPrefix}/`)
        : key === newPrefix
    ))

    if (pathExists) {
      msg.error('路径已存在')
      setRenamingKey(null)
      return
    }

    if (isFolder) {
      // 重命名文件夹：更新所有子路径
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${oldPrefix}/`)) {
          const newKey = `${newPrefix}${k.slice(oldPrefix.length)}`
          next[newKey] = next[k]
          delete next[k]
        }
      }
      setExpandedKeys(prev => prev.map(k => k === oldPrefix || k.startsWith(`${oldPrefix}/`) ? `${newPrefix}${k.slice(oldPrefix.length)}` : k))
      if (selectedPath && (selectedPath === oldPrefix || selectedPath.startsWith(`${oldPrefix}/`))) {
        setSelectedPath(`${newPrefix}${selectedPath.slice(oldPrefix.length)}`)
      }
    } else {
      // 重命名文件
      next[newPrefix] = next[oldPrefix]
      delete next[oldPrefix]
      if (selectedPath === oldPrefix) setSelectedPath(newPrefix)
    }

    onChange(next)
    setRenamingKey(null)
  }

  const updateContent = (content: string) => {
    if (selectedPath === null) return
    onChange({ ...value, [selectedPath]: content })
  }

  // --- 上传 ---
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    let mediaCount = 0
    let added = 0
    const next = { ...value }
    for (const file of Array.from(fileList)) {
      if (isMediaFile(file.name)) { mediaCount++; continue }
      const content = await readFileAsText(file)
      next[file.name] = content
      added++
    }
    onChange(next)
    if (mediaCount > 0) msg.warning(`已跳过 ${mediaCount} 个媒体文件`)
    if (added > 0) msg.success(`已导入 ${added} 个文件`)
  }

  const handleUploadFolder = async (fileList: FileList) => {
    let mediaCount = 0
    let added = 0
    const next = { ...value }
    for (const file of Array.from(fileList)) {
      if (isMediaFile(file.name)) { mediaCount++; continue }
      const content = await readFileAsText(file)
      const relativePath = file.webkitRelativePath || file.name
      next[relativePath] = content
      added++
    }
    onChange(next)
    if (mediaCount > 0) msg.warning(`已跳过 ${mediaCount} 个媒体文件`)
    if (added > 0) msg.success(`已导入 ${added} 个文件`)
  }

  // --- 树节点渲染 ---
  const renderTreeTitle = (nodeData: DataNode) => {
    const node = nodeData as TreeNode
    const isRenaming = renamingKey === node.key

    if (isRenaming) {
      return (
        <span className={styles.treeNodeRow}>
          <span className={styles.treeNodeIcon}>
            {node.isLeaf ? <FileTextOutlined /> : <FolderOutlined />}
          </span>
          <Input
            size="small"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onPressEnter={commitRename}
            onBlur={commitRename}
            onClick={e => e.stopPropagation()}
            autoFocus
            style={{ width: 140 }}
          />
        </span>
      )
    }

    return (
      <span className={styles.treeNodeRow}>
        <span className={styles.treeNodeIcon}>
          {node.isLeaf ? <FileTextOutlined /> : <FolderOutlined style={{ color: 'var(--blue-500, #3b82f6)' }} />}
        </span>
        <span className={styles.treeNodeName}>{node.title}</span>
        <span className={styles.treeNodeActions}>
          {/* 文件夹额外操作：新建文件、新建子文件夹 */}
          {!node.isLeaf && (
            <>
              <Tooltip title="新建文件">
                <Button type="text" size="small" icon={<PlusOutlined />}
                  onClick={e => { e.stopPropagation(); addFileAt(node.fullPath) }}
                  className={styles.treeActionBtn} />
              </Tooltip>
              <Tooltip title="新建子文件夹">
                <Button type="text" size="small" icon={<FolderOutlined />}
                  onClick={e => { e.stopPropagation(); addFolderAt(node.fullPath) }}
                  className={styles.treeActionBtn} />
              </Tooltip>
            </>
          )}
          <Tooltip title="重命名">
            <Button type="text" size="small" icon={<EditOutlined />}
              onClick={e => { e.stopPropagation(); startRename(node.key, node.title) }}
              className={styles.treeActionBtn} />
          </Tooltip>
          <Popconfirm
            title={`删除 "${node.title}"${node.isLeaf ? '' : ' 及其所有内容'}？`}
            onConfirm={() => removePath(node.fullPath, !node.isLeaf)}
            okText="确定" cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}
              onClick={e => e.stopPropagation()}
              className={styles.treeActionBtn} />
          </Popconfirm>
        </span>
      </span>
    )
  }

  return (
    <div className={styles.filesEditor}>
      {/* 隐藏的 input */}
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files) handleUploadFiles(e.target.files); e.target.value = '' }} />
      <input ref={folderInputRef} type="file"
        // @ts-expect-error webkitdirectory is non-standard
        webkitdirectory="" directory="" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files) handleUploadFolder(e.target.files); e.target.value = '' }} />

      {/* 工具栏 */}
      <div className={styles.filesToolbar}>
        <span className={styles.filesToolbarTitle}>附件列表</span>
        <Space size={4}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => addFileAt('')}>新建文件</Button>
          <Button size="small" icon={<FolderOutlined />} onClick={() => addFolderAt('')}>新建文件夹</Button>
          <Button size="small" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>上传文件</Button>
          <Button size="small" icon={<UploadOutlined />} onClick={() => folderInputRef.current?.click()}>上传文件夹</Button>
        </Space>
      </div>

      {Object.keys(value).length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" className={styles.filesEmpty} />
      ) : (
        <div className={styles.filesBody}>
          {/* 左侧树 */}
          <div className={styles.filesTreePanel}>
            <Tree
              treeData={treeData}
              titleRender={renderTreeTitle}
              selectedKeys={selectedPath ? [selectedPath] : []}
              expandedKeys={expandedKeys}
              onExpand={keys => setExpandedKeys(keys as string[])}
              onSelect={keys => {
                const key = keys[0] as string
                // 只选中文件（叶子节点）
                if (key && hasOwnFile(value, key)) {
                  setSelectedPath(key)
                }
              }}
              blockNode
            />
          </div>

          {/* 右侧编辑 */}
          <div className={styles.fileContentPanel}>
            {isFileSelected ? (
              <>
                <div className={styles.fileContentHeader}>
                  <FileOutlined style={{ color: 'var(--gray-400)' }} />
                  <span className={styles.fileContentPath}>{selectedPath}</span>
                  <Tooltip title="放大编辑">
                    <Button
                      type="text"
                      size="small"
                      icon={<ExpandOutlined />}
                      onClick={() => setExpandEditorOpen(true)}
                      style={{ marginLeft: 'auto' }}
                    />
                  </Tooltip>
                </div>
                <Input.TextArea
                  className={styles.fileContentEditor}
                  value={selectedContent}
                  onChange={e => updateContent(e.target.value)}
                  placeholder="输入文件内容..."
                  autoSize={{ minRows: 14, maxRows: 28 }}
                />
              </>
            ) : (
              <div className={styles.fileContentEmpty}>
                选择左侧文件查看和编辑内容
              </div>
            )}
          </div>
        </div>
      )}

      {/* 放大编辑弹窗 */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <FileOutlined style={{ color: 'var(--gray-400)' }} />
            <span style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 13, color: 'var(--gray-500)' }}>
              {selectedPath}
            </span>
          </span>
        }
        open={expandEditorOpen}
        onCancel={() => setExpandEditorOpen(false)}
        footer={[
          <Button key="close" onClick={() => setExpandEditorOpen(false)}>关闭</Button>,
        ]}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0, height: 'calc(90vh - 110px)', background: 'var(--gray-50)' } }}
      >
        <div className={styles.fileContentEditorLargeWrapper}>
          <Input.TextArea
            className={styles.fileContentEditorLarge}
            value={selectedContent}
            onChange={e => updateContent(e.target.value)}
            placeholder="输入文件内容..."
          />
        </div>
      </Modal>
    </div>
  )
}

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
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<SystemSkill[]>([])
  const [searchText, setSearchText] = useState('')
  const [configFields, setConfigFields] = useState<ConfigField[]>([])
  const [createFiles, setCreateFiles] = useState<Record<string, string>>({})
  const [editConfigFields, setEditConfigFields] = useState<ConfigField[]>([])
  const [editFiles, setEditFiles] = useState<Record<string, string>>({})
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
  const [activeTab, setActiveTab] = useState<'basic' | 'configFields' | 'skillMd' | 'files'>('basic')
  const [createIconUrl, setCreateIconUrl] = useState<string>('')
  const [editIconUrl, setEditIconUrl] = useState<string>('')

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
  }, [message])

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
    enabled: boolean
    source: string
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
        config_fields: configFields.length > 0 ? configFields : undefined,
        skill_md_content: values.skill_md_content,
        files: Object.keys(createFiles).length > 0 ? createFiles : undefined,
        source: values.source,
        enabled: values.enabled,
        icon_url: normalizeImageUrl(createIconUrl),
      })
      if (res.success) {
        message.success('创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        setConfigFields([])
        setCreateFiles({})
        setCreateIconUrl('')
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
    setActiveTab('basic')
    setEditModalOpen(true)
    setEditConfigFields(skill.config_fields || [])
    setEditFiles({})
    setEditIconUrl(skill.icon_url || '')
    editForm.setFieldsValue({
      name: skill.name,
      chinese_name: skill.chinese_name,
      description: skill.description,
      template: skill.template || '',
      placeholders: skill.placeholders?.join(', ') || '',
      skill_md_content: '',
      enabled: skill.enabled,
      source: skill.source,
    })
    try {
      const res = await fetchSystemSkillDetail(skill.name)
      if (res.success) {
        editForm.setFieldValue('skill_md_content', res.data.skill_md || '')
        // 逐个拉取 file_list 中的文件内容（排除 SKILL.md）
        const fileList = (res.data.file_list || []).filter(f => f !== 'SKILL.md')
        if (fileList.length > 0) {
          const files: Record<string, string> = {}
          await Promise.all(
            fileList.map(async (filePath) => {
              try {
                const fileRes = await fetchSkillFileContent(skill.name, filePath)
                if (fileRes.success && !fileRes.data.is_binary) {
                  files[filePath] = fileRes.data.content
                }
              } catch {
                // 单个文件失败不影响其他
              }
            }),
          )
          setEditFiles(files)
        }
      }
    } catch {
      // 静默失败
    }
  }

  const handleUpdate = async (values: {
    chinese_name: string
    description: string
    template: string
    placeholders: string
    skill_md_content: string
    enabled: boolean
    source: string
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
        config_fields: editConfigFields.length > 0 ? editConfigFields : undefined,
        enabled: values.enabled,
        source: values.source,
        icon_url: normalizeImageUrl(editIconUrl),
      }
      if (values.skill_md_content) {
        data.skill_md_content = values.skill_md_content
      }
      if (Object.keys(editFiles).length > 0) {
        data.files = editFiles
      }
      const res = await updateSystemSkill(editingSkill.name, data)
      if (res.success) {
        message.success('更新成功')
        setEditModalOpen(false)
        setEditingSkill(null)
        setEditConfigFields([])
        setEditFiles({})
        setEditIconUrl('')
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
      render: (name: string, record: SystemSkill) => (
        <div className={styles.skillName}>
          {record.icon_url ? (
            <ImagePreview url={record.icon_url} size={28} radius={6} alt={name} />
          ) : (
            <div className={styles.skillIcon}>
              <ThunderboltOutlined />
            </div>
          )}
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
        onOk={async () => {
          try {
            await createForm.validateFields()
            createForm.submit()
          } catch (err: unknown) {
            const info = err as { errorFields?: { name: string[] }[] }
            const firstField = info.errorFields?.[0]?.name?.[0]
            if (firstField === 'skill_md_content') {
              setActiveTab('skillMd')
            } else {
              setActiveTab('basic')
            }
          }
        }}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); setConfigFields([]); setCreateFiles({}); setCreateIconUrl(''); setActiveTab('basic') }}
        width={960}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto', padding: 0 } }}
      >
        <div className={styles.editLayout}>
          {/* 左侧导航 */}
          <div className={styles.editSidebar}>
            <div
              className={`${styles.editSidebarItem} ${activeTab === 'basic' ? styles.editSidebarActive : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              基础配置
            </div>
            <div
              className={`${styles.editSidebarItem} ${activeTab === 'configFields' ? styles.editSidebarActive : ''}`}
              onClick={() => setActiveTab('configFields')}
            >
              配置字段
            </div>
            <div
              className={`${styles.editSidebarItem} ${activeTab === 'skillMd' ? styles.editSidebarActive : ''}`}
              onClick={() => setActiveTab('skillMd')}
            >
              skill.md
            </div>
            <div
              className={`${styles.editSidebarItem} ${activeTab === 'files' ? styles.editSidebarActive : ''}`}
              onClick={() => setActiveTab('files')}
            >
              附件
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className={styles.editContent}>
            <Form form={createForm} layout="vertical" onFinish={handleCreate}>
              <div style={{ display: activeTab === 'basic' ? undefined : 'none' }}>
                <Form.Item label="技能名称" name="name" rules={[{ required: true, message: '请输入技能名称' }]} tooltip="技能的唯一标识，创建后不可修改">
                  <Input placeholder="例如: ai-drawing" />
                </Form.Item>
                <Form.Item label="中文名" name="chinese_name" rules={[{ required: true, message: '请输入中文名' }]}>
                  <Input placeholder="例如: AI 绘图" />
                </Form.Item>
                <Form.Item label="图标">
                  <ImagePicker
                    value={createIconUrl}
                    onChange={setCreateIconUrl}
                    category="icon"
                    libraryTag="skill"
                    entityLabel="图标"
                    alt="技能图标"
                    hint="三条路径都会把图片落入当前图片管理库，最终回填成技能图标地址。"
                    getUploadName={() => createForm.getFieldValue('chinese_name') || createForm.getFieldValue('name') || '技能'}
                    getDescription={() => createForm.getFieldValue('description') || ''}
                    getPrompt={() => [
                      createForm.getFieldValue('chinese_name') || createForm.getFieldValue('name') || '',
                      createForm.getFieldValue('description') || '',
                    ].filter(Boolean).join('，')}
                  />
                </Form.Item>
                <Form.Item label="描述" name="description" rules={[{ required: true, message: '请输入描述' }]}>
                  <Input.TextArea rows={3} placeholder="技能功能描述" />
                </Form.Item>
                <Form.Item label="模板" name="template">
                  <Input.TextArea rows={2} placeholder="模板文本，如: 帮我画一张关于 /主题 的图片" />
                </Form.Item>
                <Form.Item label="占位符" name="placeholders" tooltip="逗号分隔，如: 主题, 风格">
                  <Input placeholder="主题, 风格" />
                </Form.Item>
                <Form.Item label="来源" name="source" initialValue="guoren">
                  <Select>
                    <Select.Option value="guoren">guoren（原生）</Select.Option>
                    <Select.Option value="clawhub">ClawHub 安装</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="启用" name="enabled" valuePropName="checked" initialValue={true}>
                  <Switch />
                </Form.Item>
              </div>
              <div style={{ display: activeTab === 'configFields' ? undefined : 'none' }}>
                <Form.Item label="配置字段" style={{ marginBottom: 0 }}>
                  <ConfigFieldEditor value={configFields} onChange={setConfigFields} />
                </Form.Item>
              </div>
              <div style={{ display: activeTab === 'skillMd' ? undefined : 'none' }}>
                <Form.Item label="SKILL.md 内容" name="skill_md_content" rules={[{ required: true, message: '请输入 SKILL.md 内容' }]} style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={16} placeholder="输入 SKILL.md 的完整内容" style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 13 }} />
                </Form.Item>
              </div>
              <div style={{ display: activeTab === 'files' ? undefined : 'none' }}>
                <Form.Item label="附加文件" style={{ marginBottom: 0 }}>
                  <FilesEditor value={createFiles} onChange={setCreateFiles} msg={message} />
                </Form.Item>
              </div>
            </Form>
          </div>
        </div>
      </Modal>

      {/* 编辑技能弹窗 */}
      <Modal
        title="编辑系统技能"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingSkill(null); setEditConfigFields([]); setEditFiles({}); setEditIconUrl(''); setActiveTab('basic') }}
        onOk={async () => {
          try {
            await editForm.validateFields()
            editForm.submit()
          } catch (err: unknown) {
            const info = err as { errorFields?: { name: string[] }[] }
            const firstField = info.errorFields?.[0]?.name?.[0]
            if (firstField === 'skill_md_content') {
              setActiveTab('skillMd')
            } else {
              setActiveTab('basic')
            }
          }
        }}
        width={960}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto', padding: 0 } }}
      >
        {editingSkill && (
          <div className={styles.editLayout}>
            {/* 左侧导航 */}
            <div className={styles.editSidebar}>
              <div
                className={`${styles.editSidebarItem} ${activeTab === 'basic' ? styles.editSidebarActive : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                基础配置
              </div>
              <div
                className={`${styles.editSidebarItem} ${activeTab === 'configFields' ? styles.editSidebarActive : ''}`}
                onClick={() => setActiveTab('configFields')}
              >
                配置字段
              </div>
              <div
                className={`${styles.editSidebarItem} ${activeTab === 'skillMd' ? styles.editSidebarActive : ''}`}
                onClick={() => setActiveTab('skillMd')}
              >
                skill.md
              </div>
              <div
                className={`${styles.editSidebarItem} ${activeTab === 'files' ? styles.editSidebarActive : ''}`}
                onClick={() => setActiveTab('files')}
              >
                附件
              </div>
            </div>

            {/* 右侧内容区 */}
            <div className={styles.editContent}>
              <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
                <div style={{ display: activeTab === 'basic' ? undefined : 'none' }}>
                  <Form.Item label="技能名称" name="name" tooltip="唯一标识，不可修改">
                    <Input disabled />
                  </Form.Item>
                  <Form.Item label="中文名" name="chinese_name" rules={[{ required: true, message: '请输入中文名' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="图标">
                    <ImagePicker
                      value={editIconUrl}
                      onChange={setEditIconUrl}
                      category="icon"
                      libraryTag="skill"
                      entityLabel="图标"
                      alt="技能图标"
                      hint="三条路径都会把图片落入当前图片管理库，最终回填成技能图标地址。"
                      getUploadName={() => editForm.getFieldValue('chinese_name') || editForm.getFieldValue('name') || '技能'}
                      getDescription={() => editForm.getFieldValue('description') || ''}
                      getPrompt={() => [
                        editForm.getFieldValue('chinese_name') || editForm.getFieldValue('name') || '',
                        editForm.getFieldValue('description') || '',
                      ].filter(Boolean).join('，')}
                    />
                  </Form.Item>
                  <Form.Item label="描述" name="description" rules={[{ required: true, message: '请输入描述' }]}>
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item label="模板" name="template">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="占位符" name="placeholders" tooltip="逗号分隔">
                    <Input />
                  </Form.Item>
                  <Form.Item label="来源" name="source">
                    <Select>
                      <Select.Option value="guoren">guoren（原生）</Select.Option>
                      <Select.Option value="clawhub">ClawHub 安装</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="启用" name="enabled" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </div>
                <div style={{ display: activeTab === 'configFields' ? undefined : 'none' }}>
                  <Form.Item label="配置字段" style={{ marginBottom: 0 }}>
                    <ConfigFieldEditor value={editConfigFields} onChange={setEditConfigFields} />
                  </Form.Item>
                </div>
                <div style={{ display: activeTab === 'skillMd' ? undefined : 'none' }}>
                  <Form.Item label="SKILL.md 内容" name="skill_md_content" style={{ marginBottom: 0 }}>
                    <Input.TextArea rows={16} placeholder="留空则不更新 SKILL.md" style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 13 }} />
                  </Form.Item>
                </div>
                <div style={{ display: activeTab === 'files' ? undefined : 'none' }}>
                  <Form.Item label="附加文件" style={{ marginBottom: 0 }}>
                    <FilesEditor value={editFiles} onChange={setEditFiles} msg={message} />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </div>
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
                {detailData.icon_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <span style={{ color: 'var(--gray-500)' }}>图标：</span>
                    <ImagePreview url={detailData.icon_url} size={64} radius={10} alt={detailData.name} />
                  </div>
                )}
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
