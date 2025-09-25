// Approval Module Index - Sprint 19 Frontend Implementation

// Pages
export * from './pages';

// Components
export * from './components';

// Dashboards
export * from './dashboards';

// Hooks
export * from './hooks';

// Workflows
export * from './workflows';

// Services
export { approvalService } from './services/approvalService';

// Default exports for main components
export { default as ApprovalDashboardPage } from './pages/ApprovalDashboardPage';
export { default as WorkflowManagementPage } from './pages/WorkflowManagementPage';
export { default as ApprovalHistoryPage } from './pages/ApprovalHistoryPage';

export { default as ApprovalQueue } from './components/ApprovalQueue';
export { default as WorkflowBuilder } from './components/WorkflowBuilder';
export { default as WorkflowCanvas } from './components/WorkflowCanvas';
export { default as ApprovalDecisionModal } from './components/ApprovalDecisionModal';

export { default as ApprovalStats } from './dashboards/ApprovalStats';
export { default as SLAMonitor } from './dashboards/SLAMonitor';
export { default as ApprovalTrends } from './dashboards/ApprovalTrends';