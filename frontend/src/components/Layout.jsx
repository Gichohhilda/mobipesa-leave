import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={s.shell}>
      <div style={s.topbar}>
        <div style={s.brand}>MOBIPESA <span style={s.brandSub}>/ Leave</span></div>
        <nav style={s.nav}>
          {(user?.role === 'EMPLOYEE' || user?.role === 'MANAGER' || user?.role === 'HR_ADMIN') && (
            <Link to="/employee/dashboard" style={s.navLink}>My Leave</Link>
          )}
          {(user?.role === 'MANAGER' || user?.role === 'HR_ADMIN') && (
            <Link to="/manager/queue" style={s.navLink}>Approvals</Link>
          )}
          {user?.role === 'HR_ADMIN' && (
            <Link to="/hr/users" style={s.navLink}>HR Console</Link>
          )}
        </nav>
        <div style={s.right}>
          <span style={s.userName}>{user?.full_name} · {user?.role}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>Logout</button>
        </div>
      </div>
      <div style={s.body}>{children}</div>
    </div>
  );
}

const s = {
  shell: { minHeight: '100vh', background: '#F7F4F5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  topbar: { background: '#9B1C2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '54px', position: 'sticky', top: 0, zIndex: 100 },
  brand: { fontWeight: '800', fontSize: '15px', color: '#fff', letterSpacing: '0.06em' },
  brandSub: { fontWeight: '300', opacity: 0.7, fontSize: '13px' },
  nav: { display: 'flex', gap: '4px' },
  navLink: { color: 'rgba(255,255,255,0.8)', textDecoration: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '13px', fontWeight: '500' },
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  userName: { fontSize: '12px', color: 'rgba(255,255,255,0.85)' },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' },
  body: { maxWidth: '1120px', margin: '0 auto', padding: '28px 24px' },
};