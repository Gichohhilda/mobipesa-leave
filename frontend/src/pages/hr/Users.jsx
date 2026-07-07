import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HRUsers() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#9B1C2E' }}>HR Console</h1>
      <p>Welcome, {user?.full_name}</p>
      <button onClick={() => { logout(); navigate('/login'); }} style={{ padding: '8px 16px', background: '#9B1C2E', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
}