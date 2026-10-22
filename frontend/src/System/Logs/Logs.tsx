import React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from 'Components/NotFound';
import AppLogFiles from './App/AppLogFiles';
import UpdateLogFiles from './Update/UpdateLogFiles';

// Nested under /system/logs/files/* (App/AppRoutes).
function Logs() {
  return (
    <Routes>
      <Route index={true} element={<AppLogFiles />} />

      <Route path="update" element={<UpdateLogFiles />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default Logs;
