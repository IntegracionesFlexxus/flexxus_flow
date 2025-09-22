// routes.tsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingSpinner } from './components/shared';

// Lazy loading de páginas
const ChannelsPage = lazy(() => import('./pages/ChannelsPage'));
const ConversationsPage = lazy(() => import('./pages/ConversationsPage'));

export const OmniRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        <Route index element={<Navigate to="conversations" replace />} />
        <Route path="conversations/*" element={<ConversationsPage />} />
        <Route path="conversations/:conversationId" element={<ConversationsPage />} />
        <Route path="channels/*" element={<ChannelsPage />} />
        {/* Rutas futuras */}
        <Route path="customers/*" element={<div>Customers Page (Coming Soon)</div>} />
        <Route path="templates/*" element={<div>Templates Page (Coming Soon)</div>} />
        <Route path="landing-pages/*" element={<div>Landing Pages (Coming Soon)</div>} />
        <Route path="email-marketing/*" element={<div>Email Marketing (Coming Soon)</div>} />
      </Routes>
    </Suspense>
  );
};