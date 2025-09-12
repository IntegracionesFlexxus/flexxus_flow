import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import UserManagement from './pages/UserManagement';

const UsersModule: React.FC = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔍 UsersModule mounted');
    console.log('📍 Current location:', location);
    console.log('📍 Pathname:', location.pathname);
  }, [location]);

  // Para React Router v6 con rutas anidadas usando /*
  return (
    <Routes>
      <Route index element={<UserManagement />} />
      <Route path="list" element={<UserManagement />} />
      <Route path="*" element={<UserManagement />} />
    </Routes>
  );
};

export default UsersModule;