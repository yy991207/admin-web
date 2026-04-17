import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import AppRoutes from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#171717', borderRadius: 6 } }}>
      <App>
        <AppRoutes />
      </App>
    </ConfigProvider>
  </StrictMode>,
)
