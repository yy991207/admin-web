import {
  ThunderboltOutlined,
  FileTextOutlined,
  RobotOutlined,
  TrophyOutlined,
  CodeOutlined,
  CloudOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Sidebar.module.less'

interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
  path?: string
}

const SYSTEM_ITEMS: NavItem[] = [
  { key: 'skills', label: '系统技能', icon: <ThunderboltOutlined />, path: '/skills' },
  { key: 'templates', label: '模板管理', icon: <FileTextOutlined />, path: '/templates' },
  { key: 'agents', label: '智能体', icon: <RobotOutlined />, path: '/agents' },
  { key: 'practices', label: '最佳实践', icon: <TrophyOutlined />, path: '/practices' },
  { key: 'commands', label: '推荐指令', icon: <CodeOutlined />, path: '/commands' },
]

const EXTRA_ITEMS: NavItem[] = [
  { key: 'clawhub', label: '技能市场', icon: <CloudOutlined />, path: '/clawhub' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  function isActive(path?: string): boolean {
    if (!path) return false
    return location.pathname === path
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {!collapsed && (
        <button className={styles.toggleBtn} onClick={onToggle} title="收起">
          <MenuFoldOutlined />
        </button>
      )}
      <div className={styles.navContent}>
        {collapsed && (
          <nav className={styles.nav}>
            <div className={styles.navItem} onClick={onToggle} title="展开">
              <span className={styles.navIcon}><MenuUnfoldOutlined /></span>
            </div>
          </nav>
        )}
        {!collapsed && (
          <>
            <div className={styles.navSection}>后台管理</div>
            <nav className={styles.nav}>
              {SYSTEM_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                  onClick={() => item.path && navigate(item.path)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </div>
              ))}
            </nav>
            <div className={styles.divider} />
            <nav className={styles.nav}>
              {EXTRA_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                  onClick={() => item.path && navigate(item.path)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </div>
              ))}
            </nav>
          </>
        )}
        {collapsed && (
          <nav className={styles.nav}>
            {[...SYSTEM_ITEMS, ...EXTRA_ITEMS].map((item) => (
              <div
                key={item.key}
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => item.path && navigate(item.path)}
                title={item.label}
              >
                <span className={styles.navIcon}>{item.icon}</span>
              </div>
            ))}
          </nav>
        )}
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>G</div>
          {!collapsed && <span className={styles.userName}>guoren</span>}
        </div>
      </div>
    </aside>
  )
}
