import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  StarOutlined,
  DownloadOutlined as DownloadIcon,
  UserOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { Button, Input, message, Modal, Popconfirm, Spin, Tag } from 'antd'
import {
  browseClawhub,
  searchClawhub,
  installClawhubSkill,
  fetchClawhubDetail,
  type ClawhubSkill,
  type ClawhubSkillDetail,
} from '../../services/skillService'
import styles from './ClawHub.module.less'

function formatTimestamp(ts?: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

function formatNumber(n?: number): string {
  if (n === undefined || n === null) return '0'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toString()
}

export default function ClawHub() {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<ClawhubSkill[]>([])
  const [searchText, setSearchText] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<ClawhubSkillDetail | null>(null)
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)

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
    setDetailData(null)
    try {
      const res = await fetchClawhubDetail(skill.name)
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

  const handleInstall = async (slug: string, displayName: string) => {
    setInstallingSlug(slug)
    try {
      const res = await installClawhubSkill(slug)
      if (res.success) {
        message.success(`技能 "${displayName}" 已安装`)
        loadSkills(searchText || undefined)
        setDetailModalOpen(false)
      } else {
        message.error(res.msg || '安装失败')
      }
    } catch {
      message.error('安装失败')
    } finally {
      setInstallingSlug(null)
    }
  }

  const currentInstallSlug = detailData?.skill?.slug

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
                      onConfirm={() => handleInstall(skill.name, skill.chinese_name || skill.name)}
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
        title={
          <span style={{ fontSize: 18 }}>
            {detailData?.skill?.displayName || '技能详情'}
          </span>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={720}
      >
        <Spin spinning={detailLoading}>
          {detailData && (
            <div className={styles.detailContent}>
              {/* 基本信息 */}
              <Section title="基本信息">
                <Row label="Slug" value={detailData.skill.slug} mono />
                <Row label="显示名称" value={detailData.skill.displayName} />
                <Row label="摘要" value={detailData.skill.summary} />
                {detailData.skill.tags.length > 0 && (
                  <Row label="标签" value={
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {detailData.skill.tags.map(t => <Tag key={t} icon={<TagOutlined />}>{t}</Tag>)}
                    </div>
                  } />
                )}
              </Section>

              {/* 统计数据 */}
              <Section title="统计数据">
                <div className={styles.statsGrid}>
                  <StatCard label="下载" value={detailData.skill.stats.downloads} icon={<DownloadIcon />} />
                  <StatCard label="收藏" value={detailData.skill.stats.stars} icon={<StarOutlined />} />
                  <StatCard label="当前安装" value={detailData.skill.stats.installsCurrent} icon={<CheckCircleOutlined />} />
                  <StatCard label="总安装" value={detailData.skill.stats.installsAllTime} icon={<DownloadIcon />} />
                </div>
              </Section>

              {/* 版本信息 */}
              <Section title="版本信息">
                <Row label="当前版本" value={detailData.latestVersion.version} />
                <Row label="发布时间" value={formatTimestamp(detailData.latestVersion.createdAt)} />
                <Row label="许可证" value={detailData.latestVersion.license || '-'} />
                {detailData.latestVersion.changelog && (
                  <Row label="更新日志" value={detailData.latestVersion.changelog} />
                )}
              </Section>

              {/* 作者信息 */}
              <Section title="作者">
                <Row label="用户名" value={detailData.owner.handle} />
                <Row label="显示名称" value={detailData.owner.displayName} />
              </Section>

              {/* Meta 内容 */}
              {detailData.metaContent && Object.keys(detailData.metaContent).filter(k => k !== 'skillMd').length > 0 && (
                <Section title="元数据">
                  {detailData.metaContent.DisplayDescription && (
                    <Row label="描述" value={detailData.metaContent.DisplayDescription} />
                  )}
                  {detailData.metaContent.Files && detailData.metaContent.Files.length > 0 && (
                    <Row label="文件" value={
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {detailData.metaContent.Files.map(f => <Tag key={f}>{f}</Tag>)}
                      </div>
                    } />
                  )}
                  {detailData.metaContent.Keywords && detailData.metaContent.Keywords.length > 0 && (
                    <Row label="关键词" value={
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {detailData.metaContent.Keywords.map(k => <Tag key={k}>{k}</Tag>)}
                      </div>
                    } />
                  )}
                  {detailData.metaContent.License && (
                    <Row label="许可证" value={detailData.metaContent.License} />
                  )}
                  {detailData.metaContent.latest && (
                    <>
                      <Row label="最新版本" value={detailData.metaContent.latest.version} />
                      <Row label="发布时间" value={formatTimestamp(detailData.metaContent.latest.publishedAt)} />
                      {detailData.metaContent.latest.commit && (
                        <Row label="Commit" value={
                          <a href={detailData.metaContent.latest.commit} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                            {detailData.metaContent.latest.commit}
                          </a>
                        } />
                      )}
                    </>
                  )}
                  {detailData.metaContent.owner && (
                    <Row label="所有者" value={detailData.metaContent.owner} />
                  )}
                </Section>
              )}

              {/* SKILL.md 内容 */}
              {detailData.metaContent?.skillMd && (
                <Section title="SKILL.md">
                  <div className={styles.skillMdContent}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {detailData.metaContent.skillMd}
                    </ReactMarkdown>
                  </div>
                </Section>
              )}

              {/* 时间信息 */}
              <Section title="时间">
                <Row label="创建时间" value={formatTimestamp(detailData.skill.createdAt)} />
                <Row label="更新时间" value={formatTimestamp(detailData.skill.updatedAt)} />
              </Section>

              {/* 操作按钮 */}
              <div className={styles.detailActions}>
                {currentInstallSlug && skills.find(s => s.name === currentInstallSlug)?.is_selected ? (
                  <Button disabled icon={<CheckCircleOutlined />}>已安装</Button>
                ) : currentInstallSlug ? (
                  <Popconfirm
                    title="确认安装"
                    description={`确定要安装技能 "${detailData.skill.displayName}" 吗？`}
                    onConfirm={() => handleInstall(currentInstallSlug, detailData.skill.displayName)}
                    okText="确定"
                    cancelText="取消"
                    disabled={installingSlug === currentInstallSlug}
                  >
                    <Button type="primary" icon={<DownloadOutlined />} loading={installingSlug === currentInstallSlug}>
                      安装
                    </Button>
                  </Popconfirm>
                ) : null}
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  )
}

// --- 子组件 ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.detailSection}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={mono ? styles.detailValueMono : styles.detailValue}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statCardIcon}>{icon}</span>
      <span className={styles.statCardLabel}>{label}</span>
      <span className={styles.statCardValue}>{formatNumber(value)}</span>
    </div>
  )
}
