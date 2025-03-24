import './index.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminDash from './pages/AdminDash';
import { UserDash } from './pages/UserDash';
import DriverDashboard from './pages/DriverDashboard';
import FretersManagement from './admincomponents/FretersManagement';
import OrdersManagement from './admincomponents/OrdersManagement';
import UsersManagement from './admincomponents/UsersManagement';
import DeliveriesManagement from './admincomponents/DeliveriesManagement';
import { ThemeProvider } from './utils/theme';
import ProtectedRoute from './components/routes/ProtectedRoutes';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-white dark:bg-midnight-900 text-gray-900 dark:text-white transition-colors duration-500">
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              
              {/* Protected User Dashboard Routes */}
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <UserDash />
                </ProtectedRoute>
              } />

              {/* Protected Driver Dashboard Routes */}
              <Route path="/driver/dashboard" element={
                <ProtectedRoute driverRequired>
                  <DriverDashboard />
                </ProtectedRoute>
              } />
              
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
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;