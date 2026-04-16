import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import styles from './Layout.module.less'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={styles.layout}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
