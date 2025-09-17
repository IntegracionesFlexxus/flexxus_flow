import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RoleManagement from './pages/RoleManagement';
import PermissionGuard from '@/shared/components/PermissionGuard';

console.log('🎭 RolesModule: index.tsx loaded');

const RolesModule: React.FC = () => {
  console.log('🎭 RolesModule: Component rendering');

  return (
    <PermissionGuard requireSuperAdmin={true}>
      <Routes>
        <Route path="/" element={<RoleManagement />} />
        <Route path="/list" element={<RoleManagement />} />
      </Routes>
    </PermissionGuard>
  );
};

console.log('🎭 RolesModule: Component defined');

export default RolesModule;