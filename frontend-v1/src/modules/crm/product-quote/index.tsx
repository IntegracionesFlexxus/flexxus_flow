/**
 * Product Quote Management System - Main Module
 * Sprint 19 - Complete Integration Module
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PRODUCT_QUOTE_PERMISSIONS } from './config/permissions';

// Lazy load all main pages for code splitting
const ProductCatalogPage = lazy(() => import('./catalog/pages/ProductCatalogPage'));
const ProductDetailPage = lazy(() => import('./catalog/pages/ProductDetailPage'));
const CategoryManagementPage = lazy(() => import('./catalog/pages/CategoryManagementPage'));

const PricingDashboardPage = lazy(() => import('./pricing/pages/PricingDashboardPage'));
const PricingRulesPage = lazy(() => import('./pricing/pages/PricingRulesPage'));
const PriceSimulatorPage = lazy(() => import('./pricing/pages/PriceSimulatorPage'));

const QuoteBuilderPage = lazy(() => import('./quotes/pages/QuoteBuilderPage'));
const QuoteListPage = lazy(() => import('./quotes/pages/QuoteListPage'));
const QuoteDetailPage = lazy(() => import('./quotes/pages/QuoteDetailPage'));
const QuoteComparisonPage = lazy(() => import('./quotes/pages/QuoteComparisonPage'));

const DocumentGeneratorPage = lazy(() => import('./documents/pages/DocumentGeneratorPage'));
const TemplateManagementPage = lazy(() => import('./documents/pages/TemplateManagementPage'));
const DocumentHistoryPage = lazy(() => import('./documents/pages/DocumentHistoryPage'));
const RevenueRecognitionPage = lazy(() => import('./documents/pages/RevenueRecognitionPage'));

const ApprovalDashboardPage = lazy(() => import('./approval/pages/ApprovalDashboardPage'));
const WorkflowManagementPage = lazy(() => import('./approval/pages/WorkflowManagementPage'));
const ApprovalHistoryPage = lazy(() => import('./approval/pages/ApprovalHistoryPage'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Error Fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
      <h2 className="mb-4 text-2xl font-bold text-red-600">Something went wrong</h2>
      <p className="mb-4 text-gray-600">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  </div>
);

/**
 * Product Quote Module Routes
 * Main routing configuration for Sprint 19 modules
 */
export const ProductQuoteRoutes: React.FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Default Route */}
          <Route index element={<Navigate to="catalog" replace />} />

          {/* Product Catalog Routes */}
          <Route path="catalog">
            <Route index element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW}>
                <ProductCatalogPage />
              </ProtectedRoute>
            } />
            <Route path="products/:id" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW}>
                <ProductDetailPage />
              </ProtectedRoute>
            } />
            <Route path="categories" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.CATEGORY_MANAGE}>
                <CategoryManagementPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Pricing Routes */}
          <Route path="pricing">
            <Route index element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW}>
                <PricingDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="rules" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_CREATE}>
                <PricingRulesPage />
              </ProtectedRoute>
            } />
            <Route path="simulator" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW}>
                <PriceSimulatorPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Quote Routes */}
          <Route path="quotes">
            <Route index element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW}>
                <QuoteListPage />
              </ProtectedRoute>
            } />
            <Route path="new" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE}>
                <QuoteBuilderPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW}>
                <QuoteDetailPage />
              </ProtectedRoute>
            } />
            <Route path=":id/edit" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE}>
                <QuoteBuilderPage />
              </ProtectedRoute>
            } />
            <Route path="compare" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW}>
                <QuoteComparisonPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Document Routes */}
          <Route path="documents">
            <Route index element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE}>
                <DocumentGeneratorPage />
              </ProtectedRoute>
            } />
            <Route path="templates" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE}>
                <TemplateManagementPage />
              </ProtectedRoute>
            } />
            <Route path="history" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW}>
                <DocumentHistoryPage />
              </ProtectedRoute>
            } />
            <Route path="revenue" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW}>
                <RevenueRecognitionPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Approval Routes */}
          <Route path="approvals">
            <Route index element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW}>
                <ApprovalDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="workflows" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.WORKFLOW_MANAGE}>
                <WorkflowManagementPage />
              </ProtectedRoute>
            } />
            <Route path="history" element={
              <ProtectedRoute permission={PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW}>
                <ApprovalHistoryPage />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

// Export all services for external use
export * from './shared/services/productService';
export * from './shared/services/pricingService';
export * from './shared/services/quoteService';
export * from './shared/services/documentService';
export * from './shared/services/approvalService';

// Export all stores for external use
export * from './shared/stores/productStore';
export * from './shared/stores/pricingStore';
export * from './shared/stores/quoteStore';
export * from './shared/stores/approvalStore';

// Export all types for external use
export * from './shared/types/product.types';
export * from './shared/types/pricing.types';
export * from './shared/types/quote.types';
export * from './shared/types/approval.types';

// Export commonly used components
export { default as AdvancedSearchFilter } from './shared/components/AdvancedSearchFilter';
export { default as BulkActionsBar } from './shared/components/BulkActionsBar';
export { default as DataExporter } from './shared/components/DataExporter';
export { default as MetricsCard } from './shared/components/MetricsCard';

// Export commonly used hooks
export { useDebounce } from './shared/hooks/useDebounce';
export { usePagination } from './shared/hooks/usePagination';
export { useWebSocket } from './shared/hooks/useWebSocket';

// Module metadata
export const MODULE_INFO = {
  name: 'Product Quote Management System',
  version: '1.0.0',
  sprint: 19,
  modules: [
    'Product Catalog',
    'Pricing Engine',
    'Quote Builder',
    'Document Generation',
    'Approval Workflows'
  ],
  features: {
    productCatalog: {
      maxProducts: 50000,
      virtualScrolling: true,
      bulkOperations: true,
      categories: 'nested-set-model'
    },
    pricing: {
      realTimeCalculation: true,
      responseTime: '<300ms',
      multiCurrency: true,
      rulesEngine: true
    },
    quotes: {
      dragAndDrop: true,
      versioning: true,
      comparison: true,
      pdfGeneration: true
    },
    documents: {
      formats: ['PDF', 'Excel', 'Word', 'HTML'],
      templates: true,
      wysiwyg: true,
      revenueRecognition: 'ASC-606'
    },
    approvals: {
      visualBuilder: true,
      realTimeNotifications: true,
      slaMonitoring: true,
      delegation: true
    }
  }
};

export default ProductQuoteRoutes;