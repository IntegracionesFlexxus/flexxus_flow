import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RoleManagement from './pages/RoleManagement';

console.log('🎭 RolesModule: index.tsx loaded');

const RolesModule: React.FC = () => {
  console.log('🎭 RolesModule: Component rendering');
  
  return (
    <Routes>
      <Route path="/" element={<RoleManagement />} />
      <Route path="/list" element={<RoleManagement />} />
    </Routes>
  );
};

console.log('🎭 RolesModule: Component defined');

export default RolesModule;