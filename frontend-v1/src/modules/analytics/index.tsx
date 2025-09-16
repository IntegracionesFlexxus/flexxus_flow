import { Routes, Route } from 'react-router-dom'
import AnalyticsDashboard from './pages/AnalyticsDashboard'

// Módulo Analytics - MVP Nivel 1
// TODO: En Nivel 2 implementar dashboards personalizables con gráficos
export function AnalyticsModule() {
  return (
    <Routes>
      <Route index element={<AnalyticsDashboard />} />
      {/* TODO: Nivel 2 - Agregar más rutas
      <Route path="reports" element={<ReportsPage />} />
      <Route path="metrics" element={<MetricsPage />} />
      <Route path="custom" element={<CustomDashboard />} />
      */}
    </Routes>
  )
}

export default AnalyticsModule