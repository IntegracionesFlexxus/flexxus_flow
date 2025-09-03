import { Routes, Route } from 'react-router-dom'
import OmniDashboard from './pages/OmniDashboard'

// Módulo Omnicanalidad - MVP Nivel 1
// TODO: En Nivel 2 implementar funcionalidad completa de mensajería
export function OmniModule() {
  return (
    <Routes>
      <Route index element={<OmniDashboard />} />
      {/* TODO: Nivel 2 - Agregar más rutas
      <Route path="conversations" element={<ConversationsPage />} />
      <Route path="conversations/:id" element={<ConversationDetail />} />
      <Route path="channels" element={<ChannelsPage />} />
      <Route path="templates" element={<TemplatesPage />} />
      */}
    </Routes>
  )
}

export default OmniModule