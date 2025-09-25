/**
 * CRM Module - Sprint 15-19
 * Complete CRM module with all routes and components
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// Lazy load CRM pages
const CrmDashboard = lazy(() => import('./pages/CrmDashboard'));
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage'));
const PipelinePage = lazy(() => import('./pages/PipelinePage'));

// Sprint 21 - Activities & Task Management
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));

// Sprint 19 - Product Quote Management
const ProductQuoteRoutes = lazy(() => import('./product-quote'));

// Export new Sprint 18 components
export { default as PipelineKanbanBoard } from './components/pipeline/PipelineKanbanBoard';
export { default as OpportunityCard } from './components/pipeline/OpportunityCard';
export { default as StageColumn } from './components/pipeline/StageColumn';
export { default as PipelineFiltersPanel } from './components/pipeline/PipelineFiltersPanel';
export { default as ForecastingDashboard } from './components/forecasting/ForecastingDashboard';
export { default as ForecastAccuracyChart } from './components/forecasting/ForecastAccuracyChart';

// Export stores
export { default as usePipelineStore } from './stores/usePipelineStore';
export { default as useForecastStore } from './stores/useForecastStore';

// Export hooks
export { default as usePipelineDragDrop } from './hooks/usePipelineDragDrop';
export { default as usePipelineMetrics } from './hooks/usePipelineMetrics';
export { default as useWebSocketUpdates } from './hooks/useWebSocketUpdates';

// Export services
export { default as pipelineService } from './services/pipelineService';
export { default as forecastService } from './services/forecastService';
export { default as analyticsService } from './services/analyticsService';

// Export types
export * from './types/pipeline.types';

// TODO: Create these pages in next iteration
// const ContactsPage = lazy(() => import('./pages/ContactsPage'));
// const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'));

// Loading component
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

export function CrmModule() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Dashboard */}
        <Route index element={<CrmDashboard />} />

        {/* Lead Management */}
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadsPage />} />

        {/* Account Management */}
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountDetailPage />} />

        {/* Contact Management - Placeholder routes */}
        <Route path="contacts" element={<ComingSoonPage title="Contactos" />} />
        <Route path="contacts/:id" element={<ComingSoonPage title="Detalle de Contacto" />} />

        {/* Opportunity Management */}
        <Route path="opportunities" element={<PipelinePage />} />
        <Route path="opportunities/:id" element={<PipelinePage />} />
        <Route path="pipeline" element={<PipelinePage />} />

        {/* Sprint 21 - Activities & Task Management */}
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="activities/:id" element={<ActivitiesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="tasks" element={<TasksPage />} />

        {/* Sprint 19 - Product Quote Management Routes */}
        <Route path="product-quote/*" element={<ProductQuoteRoutes />} />

        {/* Redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/crm" replace />} />
      </Routes>
    </Suspense>
  );
}

// Temporary placeholder component for pages not yet implemented
const ComingSoonPage = ({ title }: { title: string }) => (
  <Box sx={{ p: 3, textAlign: 'center' }}>
    <h2>{title}</h2>
    <p>Esta sección estará disponible próximamente</p>
  </Box>
);

export default CrmModule;