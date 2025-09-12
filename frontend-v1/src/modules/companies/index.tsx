import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CompanyList from './pages/CompanyList';

const CompaniesModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CompanyList />} />
      <Route path="/list" element={<CompanyList />} />
    </Routes>
  );
};

export default CompaniesModule;