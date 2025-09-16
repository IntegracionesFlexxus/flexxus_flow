import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FeatureFlagList from './pages/FeatureFlagList';

const FeatureFlagsModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<FeatureFlagList />} />
      <Route path="/list" element={<FeatureFlagList />} />
    </Routes>
  );
};

export default FeatureFlagsModule;