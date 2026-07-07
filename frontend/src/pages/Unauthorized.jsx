import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#9B1C2E' }}>403 — Access Denied</h1>
      <p>You don't have permission to view this page.</p>
      <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#9B1C2E', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        Go back
      </button>
    </div>
  );
}