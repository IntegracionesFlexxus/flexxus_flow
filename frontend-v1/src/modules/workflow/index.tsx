import { Routes, Route } from 'react-router-dom'
import WorkflowDashboard from './pages/WorkflowDashboard'

// Módulo Workflows - MVP Nivel 1
// TODO: En Nivel 2 implementar editor visual de workflows
export function WorkflowModule() {
  return (
    <Routes>
      <Route index element={<WorkflowDashboard />} />
      {/* TODO: Nivel 2 - Agregar más rutas
      <Route path="builder" element={<WorkflowBuilder />} />
      <Route path="templates" element={<WorkflowTemplates />} />
      <Route path="executions" element={<WorkflowExecutions />} />
      <Route path=":id" element={<WorkflowDetail />} />
      */}
    </Routes>
  )
}

export default WorkflowModule