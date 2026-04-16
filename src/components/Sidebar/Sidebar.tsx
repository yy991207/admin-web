import {
  ThunderboltOutlined,
  FileTextOutlined,
  RobotOutlined,
  CheckSquareOutlined,
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
  { key: 'skills', label: 'System Skills', icon: <ThunderboltOutlined />, path: '/skills' },
  { key: 'templates', label: 'Templates', icon: <FileTextOutlined />, path: '/templates' },
  { key: 'agents', label: 'Agents', icon: <RobotOutlined />, path: '/agents' },
  { key: 'tasks', label: 'Tasks', icon: <CheckSquareOutlined />, path: '/tasks' },
]

const EXTRA_ITEMS: NavItem[] = [
  { key: 'clawhub', label: 'ClawHub', icon: <CloudOutlined />, path: '/clawhub' },
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
      <button className={styles.toggleBtn} onClick={onToggle}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>
      {!collapsed && (
        <>
          <div className={styles.navSection}>SYSTEM</div>
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
    </aside>
  )
}
