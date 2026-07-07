import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import EmployeeDashboard from './pages/employee/Dashboard';
import ManagerQueue from './pages/manager/Queue';
import HRUsers from './pages/hr/Users';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/employee/dashboard" element={
            <ProtectedRoute roles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />

          <Route path="/manager/queue" element={
            <ProtectedRoute roles={['MANAGER', 'HR_ADMIN']}>
              <ManagerQueue />
            </ProtectedRoute>
          } />

          <Route path="/hr/users" element={
            <ProtectedRoute roles={['HR_ADMIN']}>
              <HRUsers />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}