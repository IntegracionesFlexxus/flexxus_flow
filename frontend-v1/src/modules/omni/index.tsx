import { Routes, Route } from 'react-router-dom'
import { lazy } from 'react'

// Lazy load de páginas
const OmniDashboard = lazy(() => import('./pages/OmniDashboard'))
const ConversationsPage = lazy(() => import('./pages/ConversationsPage'))
const ChannelsPage = lazy(() => import('./pages/ChannelsPage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))

// Módulo Omnicanalidad
export function OmniModule() {
  return (
    <Routes>
      <Route index element={<OmniDashboard />} />
      <Route path="conversations" element={<ConversationsPage />} />
      <Route path="channels" element={<ChannelsPage />} />
      <Route path="templates" element={<TemplatesPage />} />
      <Route path="automations" element={<AutomationsPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
    </Routes>
  )
}

export default OmniModule