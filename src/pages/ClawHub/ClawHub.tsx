import { useCallback, useEffect, useState } from 'react'
import {
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Button, Input, message, Modal, Popconfirm, Spin, Tag } from 'antd'
import {
  browseClawhub,
  searchClawhub,
  installClawhubSkill,
  fetchClawhubDetail,
  type ClawhubSkill,
} from '../../services/skillService'
import styles from './ClawHub.module.less'

export default function ClawHub() {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<ClawhubSkill[]>([])
  const [searchText, setSearchText] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSkill, setDetailSkill] = useState<ClawhubSkill | null>(null)

  const loadSkills = useCallback(async (keyword?: string) => {
    setLoading(true)
    try {
      const res = keyword
        ? await searchClawhub(keyword)
        : await browseClawhub()
      if (res.success) {
        setSkills(res.data.skills || [])
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

  const handleSearch = () => {
    loadSkills(searchText || undefined)
  }

  const handleViewDetail = async (skill: ClawhubSkill) => {
    setDetailModalOpen(true)
    setDetailLoading(true)
    setDetailSkill(null)
    try {
      const res = await fetchClawhubDetail(skill.name)
      if (res.success) {
        setDetailSkill(res.data)
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

  const handleInstall = async (skill: ClawhubSkill) => {
    try {
      const res = await installClawhubSkill(skill.name)
      if (res.success) {
        message.success(`技能 "${skill.chinese_name || skill.name}" 已安装`)
        loadSkills(searchText || undefined)
      } else {
        message.error(res.msg || '安装失败')
      }
    } catch {
      message.error('安装失败')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>ClawHub</h1>
          <p className={styles.pageDesc}>浏览和安装 ClawHub 上的系统技能</p>
        </div>
      </div>

      <div className={styles.searchBar}>
        <Input.Search
          placeholder="搜索技能名称或描述..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          className={styles.searchInput}
          prefix={<SearchOutlined />}
        />
        {searchText && (
          <Button onClick={() => { setSearchText(''); loadSkills() }}>
            清除搜索
          </Button>
        )}
      </div>

      <Spin spinning={loading}>
        {skills.length === 0 && !loading ? (
          <div className={styles.empty}>
            <p>暂无技能</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {skills.map((skill) => (
              <div key={skill.name} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span className={styles.skillName}>{skill.chinese_name || skill.name}</span>
                    {skill.is_selected && (
                      <Tag color="green" icon={<CheckCircleOutlined />}>已安装</Tag>
                    )}
                  </div>
                  <div className={styles.skillSlug}>{skill.name}</div>
                </div>
                <p className={styles.cardDesc}>{skill.description || '暂无描述'}</p>
                {skill.template && (
                  <div className={styles.cardTemplate}>
                    <span className={styles.templateLabel}>模板:</span>
                    <span className={styles.templateText}>{skill.template}</span>
                  </div>
                )}
                <div className={styles.cardFooter}>
                  <Button size="small" icon={<InfoCircleOutlined />} onClick={() => handleViewDetail(skill)}>
                    详情
                  </Button>
                  {skill.is_selected ? (
                    <Button size="small" disabled icon={<CheckCircleOutlined />}>
                      已安装
                    </Button>
                  ) : (
                    <Popconfirm
                      title="确认安装"
                      description={`确定要安装技能 "${skill.chinese_name || skill.name}" 吗？`}
                      onConfirm={() => handleInstall(skill)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button size="small" type="primary" icon={<DownloadOutlined />}>
                        安装
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>

      {/* 技能详情弹窗 */}
      <Modal
        title="技能详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={640}
      >
        <Spin spinning={detailLoading}>
          {detailSkill && (
            <div className={styles.detailContent}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>名称</span>
                <span>{detailSkill.chinese_name || detailSkill.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Slug</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--gray-400)' }}>{detailSkill.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>描述</span>
                <span>{detailSkill.description || '暂无描述'}</span>
              </div>
              {detailSkill.template && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>模板</span>
                  <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{detailSkill.template}</span>
                </div>
              )}
              {detailSkill.placeholders && detailSkill.placeholders.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>占位符</span>
                  <span>{detailSkill.placeholders.join(', ')}</span>
                </div>
              )}
              {detailSkill.config_fields && detailSkill.config_fields.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>配置字段</span>
                  <pre style={{ fontSize: 12, background: 'var(--gray-50)', padding: 8, borderRadius: 4, overflow: 'auto', maxWidth: '100%' }}>
                    {JSON.stringify(detailSkill.config_fields, null, 2)}
                  </pre>
                </div>
              )}
              <div className={styles.detailActions}>
                {detailSkill.is_selected ? (
                  <Button disabled icon={<CheckCircleOutlined />}>已安装</Button>
                ) : (
                  <Popconfirm
                    title="确认安装"
                    description={`确定要安装技能 "${detailSkill.chinese_name || detailSkill.name}" 吗？`}
                    onConfirm={() => {
                      handleInstall(detailSkill)
                      setDetailModalOpen(false)
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="primary" icon={<DownloadOutlined />}>安装</Button>
                  </Popconfirm>
                )}
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  )
}
