import './index.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import Register from './pages/Register';
import Login from './pages/Login';
import ConfirmEmail from './pages/ConfirmEmail';
import AuthCallback from './pages/AuthCallback';
import Home from './pages/Home';
import AdminDash from './pages/AdminDash';
import { UserDash } from './pages/UserDash';
import { DriverDashboard } from './components/DriverDash/DriverDashboard';
import { TestOrderStatusControl } from './components/DriverDash/KeyFeatures/Orders/TestOrderStatusControl';
import DriverOrders from './pages/DriverOrders';
import DriverDashboardPage from './pages/DriverDashboard';
import DriverSettings from './pages/DriverSettings';
import DriverMessages from "./pages/DriverMessages";
import DriverWalletPage from "./pages/DriverWallet";
import FretersManagement from './admincomponents/FretersManagement';
import OrdersManagement from './admincomponents/OrdersManagement';
import UsersManagement from './admincomponents/UsersManagement';
import DeliveriesManagement from './admincomponents/DeliveriesManagement';
import { ThemeProvider } from './utils/theme';
import ProtectedRoute from './components/routes/ProtectedRoutes';
import RoleBasedRedirect from './components/routes/RoleBasedRedirect';
import SessionChecker from './components/routes/SessionChecker';
import { AuthProvider } from './context/AuthContext';
import { TranslationProvider } from './components/GeminiTranslate';
// Language selector removed
import { getPreferredLanguage } from './utils/getPreferredLanguage';
import i18n from './i18n';
import { supabase } from './lib/supabaseClient';

function App() {
  useEffect(() => {
    const lang = getPreferredLanguage();
    i18n.changeLanguage(lang);
  }, []);

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <TranslationProvider>
        <ThemeProvider>
          <div className="min-h-screen bg-white dark:bg-midnight-900 text-gray-900 dark:text-white transition-colors duration-500">
            <BrowserRouter>
              <SessionChecker />
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/confirm-email" element={<ConfirmEmail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/test" element={<TestOrderStatusControl />} />
              <Route path="/test-order-status-control" element={<TestOrderStatusControl />} />
              {/* Role-based redirect route */}
              <Route path="/auth/redirect" element={<RoleBasedRedirect />} />
              
              {/* Protected User Dashboard Routes */}
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <UserDash />
                </ProtectedRoute>
              } />

              {/* Protected Driver Dashboard Routes */}
              <Route path="/driver/*" element={
                <ProtectedRoute driverRequired>
                  <DriverDashboard />
                </ProtectedRoute>
              }>
                <Route index element={<DriverDashboardPage />} />
                <Route path="dashboard" element={<DriverDashboardPage />} />
                <Route path="orders" element={<DriverOrders />} />
                <Route path="chat/:orderId/:customerId" element={<DriverMessages chatMode="single" />} />
                <Route path="messages" element={<DriverMessages />} />
                <Route path="wallet" element={<DriverWalletPage />} />
                <Route path="settings" element={<DriverSettings />} />
              </Route>
              
              {/* Protected Admin Routes with adminRequired */}
              <Route path="/admin/*" element={
                <ProtectedRoute adminRequired>
                  <AdminDash />
                </ProtectedRoute>
              }>
                <Route index element={<UsersManagement />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="freters" element={<FretersManagement />} />
                <Route path="orders" element={<OrdersManagement />} />
                <Route path="deliveries" element={<DeliveriesManagement />} />
              </Route>
            </Routes>
          </BrowserRouter>
          {/* Language selector removed */}
        </div>
      </ThemeProvider>
    </TranslationProvider>
      </AuthProvider>
    </SessionContextProvider>
  );
}

export default App;