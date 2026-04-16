export default function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-400)', marginBottom: 8 }}>
          <span>System</span>
          <span>/</span>
          <span style={{ color: 'var(--geist-foreground)', fontWeight: 500 }}>Dashboard</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.04, margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--gray-500)', margin: '8px 0 0' }}>系统概览和关键指标</p>
      </div>
      <div style={{
        padding: 80,
        textAlign: 'center',
        border: '1px solid var(--gray-100)',
        borderRadius: 8,
        color: 'var(--gray-400)',
      }}>
        <p>Dashboard 页面开发中...</p>
      </div>
    </div>
  )
}
