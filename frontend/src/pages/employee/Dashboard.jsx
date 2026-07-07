import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#9B1C2E' }}>Welcome, {user?.full_name}</h1>
      <p>Role: {user?.role}</p>
      <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#9B1C2E', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
}