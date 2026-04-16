import { useCallback, useEffect, useState } from 'react'
import {
  DeleteOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { Button, Table, Tag, Input, message, Popconfirm, Space, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchTasks,
  cancelTask,
  type AgentTask,
} from '../../services/taskService'
import styles from '../SystemSkills/SystemSkills.module.less'

const STATUS_MAP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  running: { color: 'blue', icon: <SyncOutlined spin />, label: '运行中' },
  completed: { color: 'green', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: 'red', icon: <CloseCircleOutlined />, label: '失败' },
  pending: { color: 'gold', icon: <ClockCircleOutlined />, label: '等待中' },
  cancelled: { color: 'default', icon: <CloseCircleOutlined />, label: '已取消' },
}

export default function Tasks() {
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [userId] = useState('guoren')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchTasks(userId)
      if (res.success) {
        setTasks(res.data.tasks || [])
      } else {
        message.error(res.msg || '加载失败')
      }
    } catch {
      message.error('网络请求失败')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleCancel = async (task_id: string) => {
    try {
      const res = await cancelTask(task_id)
      if (res.success) {
        message.success('任务已取消')
        loadTasks()
      } else {
        message.error(res.msg || '取消失败')
      }
    } catch {
      message.error('网络请求失败')
    }
  }

  let filteredTasks = tasks.filter(
    (t) =>
      (t.task_id || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (t.agent_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (t.session_id || '').toLowerCase().includes(searchText.toLowerCase()),
  )

  if (statusFilter) {
    filteredTasks = filteredTasks.filter((t) => t.status === statusFilter)
  }

  const columns: ColumnsType<AgentTask> = [
    {
      title: '任务 ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 180,
      render: (id: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{id}</span>,
    },
    {
      title: '智能体',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 140,
    },
    {
      title: '会话 ID',
      dataIndex: 'session_id',
      key: 'session_id',
      width: 160,
      render: (id: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{id}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = STATUS_MAP[status] || { color: 'default', icon: null, label: status }
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: AgentTask) => (
        <Space size={4}>
          {record.status === 'running' && (
            <Popconfirm
              title="确认取消"
              description="确定要取消此任务吗？"
              onConfirm={() => handleCancel(record.task_id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }}>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Tasks</h1>
          <p className={styles.pageDesc}>查看和管理智能体任务列表</p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div style={{ display: 'flex', gap: 12, margin: 16 }}>
          <Input.Search
            placeholder="搜索任务 ID、智能体或会话..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
          />
          <Select
            placeholder="筛选状态"
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || '')}
            style={{ width: 140 }}
            options={Object.entries(STATUS_MAP).map(([key, val]) => ({ label: val.label, value: key }))}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="task_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `共 ${t} 条记录`,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>
    </div>
  )
}
