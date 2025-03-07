import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/userDashcomponents/Sidebar';
import DashIndex from '../components/userDashcomponents/DashIndex';
import DashNav from '../components/userDashcomponents/Dashnav';
import Carpool from '../components/userDashcomponents/Carpool';
import Shopping from '../components/userDashcomponents/Shopping';
import LargeItems from '../components/userDashcomponents/Largeitems';
import Parcel from '../components/userDashcomponents/Parcel';
import { Card } from "@tremor/react";

export const UserDash = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      <div className="flex-1 ml-64">
        <DashNav />
        <Card className="mt-6 mx-6">
          <main className="p-4">
            <Routes>
              <Route index element={<DashIndex />} />
              <Route path="carpool" element={<Carpool />} />
              <Route path="parcels" element={<Parcel />} />
              <Route path="shopping" element={<Shopping />} />
              <Route path="large-items" element={<LargeItems />} />
            </Routes>
          </main>
        </Card>
      </div>
    </div>
  );
};

export default UserDash;