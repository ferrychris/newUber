import React from 'react';

import {BrowserRouter, Route, Routes } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminDash from './pages/AdminDash';
import { UserDash } from './pages/UserDash';
import FretersManagement from './admincomponents/FretersManagement';
import OrdersManagement from './admincomponents/OrdersManagement';
import UsersManagement from './admincomponents/UsersManagement';
import DeliveriesManagement from './admincomponents/DeliveriesManagement';

function App() {
  return (
   <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/*" element={<UserDash/>} />
        
        {/* Admin Routes */}
        <Route path="/admin/" element={<AdminDash />}>
          <Route index element={<UsersManagement />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="freters" element={<FretersManagement />} />
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="deliveries" element={<DeliveriesManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;