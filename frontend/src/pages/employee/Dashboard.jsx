import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../utils/api';

export default function EmployeeDashboard() {
  const [balances, setBalances] = useState([]);
  const [applications, setApplications] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [workingDays, setWorkingDays] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBalances();
    fetchApplications();
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (form.start_date && form.end_date) {
      calcDays(form.start_date, form.end_date);
    } else {
      setWorkingDays(null);
    }
  }, [form.start_date, form.end_date]);

  const fetchBalances = async () => {
    try {
      const res = await api.get('/me/balances');
      setBalances(res.data.balances);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBalances(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get('/me/applications');
      setApplications(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchLeaveTypes = async () => {
  try {
    const res = await api.get('/me/leave-types');
    setLeaveTypes(res.data);
  } catch (err) {
    console.error(err);
  }
};

  const holidays2026 = ['2026-01-01','2026-03-20','2026-04-03','2026-04-06','2026-05-01','2026-05-27','2026-06-01','2026-10-10','2026-10-20','2026-12-12','2026-12-25','2026-12-26'];

  const calcDays = (start, end) => {
    let count = 0;
    const d = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (d > e) { setWorkingDays(0); return; }
    while (d <= e) {
      const day = d.getDay();
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (day !== 0 && day !== 6 && !holidays2026.includes(iso)) count++;
      d.setDate(d.getDate() + 1);
    }
    setWorkingDays(count);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);
    try {
      const res = await api.post('/applications', {
        leave_type_id: Number(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      });
      setSubmitSuccess(`Application submitted successfully! Reference #${res.data.id}`);
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      setWorkingDays(null);
      fetchBalances();
      fetchApplications();
    } catch (err) {
      setSubmitError(err.response?.data?.error?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this application?')) return;
    try {
      await api.delete(`/applications/${id}`);
      fetchApplications();
      fetchBalances();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Could not cancel');
    }
  };

  const pillStyle = (status) => {
    const map = {
      PENDING: { background: '#FEF3DC', color: '#7A5200', border: '1px solid #E8B84B' },
      APPROVED: { background: '#E0F2E9', color: '#1A5C36', border: '1px solid #3D9B62' },
      REJECTED: { background: '#FDEBEB', color: '#8B1A1A', border: '1px solid #D94040' },
      CANCELLED: { background: '#EEEAEB', color: '#5A4F52', border: '1px solid #B0A4A8' },
    };
    return { ...s.pill, ...map[status] };
  };

  return (
    <Layout>
      <div style={s.pageHeader}>
        <h1 style={s.h1}>My Leave — 2026</h1>
        <p style={s.sub}>View your balance, apply for leave, and track your applications</p>
      </div>

      {/* Balance Cards */}
      {loadingBalances ? <p>Loading balances...</p> : (
        <div style={s.cards}>
          {balances.map((b, i) => (
            <div key={i} style={s.card}>
              <div style={s.cardType}>{b.leave_type.toUpperCase()}</div>
              <div style={s.cardNum}>{b.remaining_days ?? '∞'}</div>
              <div style={s.cardLabel}>days remaining</div>
              <div style={s.cardDetail}>{b.allocated_days} allocated · {b.used_days} used · {b.pending_days} pending</div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Form */}
      <div style={s.panel}>
        <div style={s.panelHead}><h2 style={s.h2}>Apply for Leave</h2></div>
        <div style={s.panelBody}>
          <form onSubmit={handleSubmit}>
            <div style={s.formRow}>
              <div style={s.field}>
                <label style={s.label}>Leave type</label>
                <select style={s.input} value={form.leave_type_id} onChange={e => setForm({ ...form, leave_type_id: e.target.value })} required>
                  <option value="">Select leave type</option>
                    {leaveTypes.map(lt => {
             const balance = balances.find(b => b.leave_type === lt.name);
               return (
                   <option key={lt.id} value={lt.id}>
               {lt.name} {balance ? `(${balance.remaining_days} days remaining)` : ''}
              </option>
             );
            })}
          </select>
              </div>
            </div>
            <div style={s.formRow2}>
              <div style={s.field}>
                <label style={s.label}>Start date</label>
                <input style={s.input} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>End date</label>
                <input style={s.input} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Reason (optional)</label>
              <textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical' }} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Briefly describe the reason..." />
            </div>
            {workingDays !== null && (
              <div style={s.daysHint}>
                <strong>{workingDays}</strong> working day{workingDays !== 1 ? 's' : ''} requested (weekends & public holidays excluded)
              </div>
            )}
            {submitError && <div style={s.errorBox}>{submitError}</div>}
            {submitSuccess && <div style={s.successBox}>{submitSuccess}</div>}
            <div style={s.formActions}>
              <button type="button" style={s.btnGhost} onClick={() => setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })}>Clear</button>
              <button type="submit" style={s.btnPrimary} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit application'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Application History */}
      <div style={s.panel}>
        <div style={s.panelHead}><h2 style={s.h2}>Application History</h2></div>
        {loadingApps ? <p style={{ padding: '20px' }}>Loading...</p> : applications.length === 0 ? (
          <p style={{ padding: '20px', color: '#888' }}>No applications yet.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Leave type', 'Dates', 'Days', 'Status', 'Submitted', 'Manager note', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id} style={s.tr}>
                  <td style={s.td}>{app.leave_type}</td>
                  <td style={s.td}>{app.start_date?.slice(0,10)} – {app.end_date?.slice(0,10)}</td>
                  <td style={s.td}>{app.working_days}</td>
                  <td style={s.td}><span style={pillStyle(app.status)}>{app.status}</span></td>
                  <td style={s.td}>{app.created_at?.slice(0,10)}</td>
                  <td style={{ ...s.td, fontSize: '12px', color: '#888' }}>{app.manager_comment || '—'}</td>
                  <td style={s.td}>
                    {app.status === 'PENDING' && (
                      <button onClick={() => handleCancel(app.id)} style={s.btnSmall}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const s = {
  pageHeader: { marginBottom: '24px' },
  h1: { fontSize: '22px', fontWeight: '700', margin: '0 0 4px', color: '#1A1214' },
  h2: { fontSize: '14px', fontWeight: '600', margin: 0, color: '#1A1214' },
  sub: { color: '#6B5A60', fontSize: '13px', margin: 0 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px', marginBottom: '28px' },
  card: { background: '#fff', border: '1px solid #E4DCE0', borderTop: '3px solid #9B1C2E', borderRadius: '8px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardType: { fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B5A60' },
  cardNum: { fontSize: '32px', fontWeight: '800', color: '#9B1C2E', lineHeight: 1.1, margin: '6px 0 4px' },
  cardLabel: { fontSize: '11px', color: '#6B5A60' },
  cardDetail: { marginTop: '8px', fontSize: '11px', color: '#9C8A90', borderTop: '1px solid #E4DCE0', paddingTop: '8px' },
  panel: { background: '#fff', border: '1px solid #E4DCE0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px', overflow: 'hidden' },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E4DCE0', background: '#F2EDEF' },
  panelBody: { padding: '20px' },
  formRow: { marginBottom: '16px' },
  formRow2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#6B5A60' },
  input: { padding: '9px 12px', border: '1.5px solid #CBBFC4', borderRadius: '5px', fontSize: '13px', background: '#fff', color: '#1A1214', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  daysHint: { background: '#F9ECEE', border: '1px solid rgba(155,28,46,.2)', color: '#9B1C2E', padding: '8px 14px', borderRadius: '5px', fontSize: '13px', marginBottom: '16px' },
  errorBox: { background: '#FDEBEB', color: '#8B1A1A', border: '1px solid #D94040', borderRadius: '5px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  successBox: { background: '#E0F2E9', color: '#1A5C36', border: '1px solid #3D9B62', borderRadius: '5px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  btnPrimary: { background: '#9B1C2E', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnGhost: { background: '#fff', color: '#1A1214', border: '1px solid #CBBFC4', padding: '8px 16px', borderRadius: '5px', fontSize: '13px', cursor: 'pointer' },
  btnSmall: { background: '#fff', color: '#1A1214', border: '1px solid #CBBFC4', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 16px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B5A60', borderBottom: '1px solid #E4DCE0', background: '#F2EDEF' },
  td: { padding: '12px 16px', borderBottom: '1px solid #E4DCE0', color: '#1A1214' },
  tr: { transition: 'background 0.15s' },
  pill: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
};