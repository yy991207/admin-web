import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import SystemSkills from './pages/SystemSkills/SystemSkills'
import Templates from './pages/Templates/Templates'
import Agents from './pages/Agents/Agents'
import Tasks from './pages/Tasks/Tasks'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/skills" replace />} />
          <Route path="skills" element={<SystemSkills />} />
          <Route path="templates" element={<Templates />} />
          <Route path="agents" element={<Agents />} />
          <Route path="tasks" element={<Tasks />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
