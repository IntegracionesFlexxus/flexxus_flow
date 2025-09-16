import { Routes, Route } from 'react-router-dom'
import CrmDashboard from './pages/CrmDashboard'

// Módulo CRM - MVP Nivel 1
// TODO: En Nivel 2 implementar gestión completa de clientes
export function CrmModule() {
  return (
    <Routes>
      <Route index element={<CrmDashboard />} />
      {/* TODO: Nivel 2 - Agregar más rutas
      <Route path="contacts" element={<ContactsPage />} />
      <Route path="contacts/:id" element={<ContactDetail />} />
      <Route path="companies" element={<CompaniesPage />} />
      <Route path="deals" element={<DealsPage />} />
      */}
    </Routes>
  )
}

export default CrmModule