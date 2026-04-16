import { useCallback, useEffect, useState } from 'react'
import {
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { Button, Input, message, Popconfirm, Spin, Tag } from 'antd'
import {
  browseClawhub,
  searchClawhub,
  installClawhubSkill,
  type ClawhubSkill,
} from '../../services/skillService'
import styles from './ClawHub.module.less'

export default function ClawHub() {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<ClawhubSkill[]>([])
  const [searchText, setSearchText] = useState('')

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
    </div>
  )
}
