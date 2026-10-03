import { useState } from 'react';
import { sendTestNotificationApi, testLatestProductionZincApi } from '../../api/notificationApi';
import './Operations.css';

const initialTitle = 'IV Production Notification Test';
const initialBody = 'Backend notification delivery is working for this device.';

export default function NotificationTestScreen() {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [checkingZinc, setCheckingZinc] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [zincCheck, setZincCheck] = useState(null);
  const [error, setError] = useState('');

  const sendTest = async event => {
    event.preventDefault();
    setError('');
    setDelivery(null);
    if (!title.trim() || !body.trim()) {
      setError('Enter a notification title and message.');
      return;
    }
    setSending(true);
    try {
      const response = await sendTestNotificationApi({ title: title.trim(), body: body.trim() });
      setDelivery({ ...response.data, message: response.message });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'The backend could not run the notification test.');
    } finally {
      setSending(false);
    }
  };

  const testLatestZinc = async () => {
    setError('');
    setZincCheck(null);
    setCheckingZinc(true);
    try {
      const response = await testLatestProductionZincApi();
      setZincCheck(response.data || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'The backend could not evaluate the latest production entry.');
    } finally {
      setCheckingZinc(false);
    }
  };

  return <section className="ops-page">
    <header className="ops-header"><div><h2>Test Notifications</h2><p className="ops-muted">Tests send to active superadmins, admins and plant managers. Supervisors are excluded.</p></div></header>
    {error && <div className="ops-error" role="alert">{error}</div>}
    <form className="ops-card" onSubmit={sendTest}>
      <h3>Test message</h3>
      <div className="ops-form">
        <label className="ops-field">Notification title<input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} required /></label>
        <label className="ops-field">Notification message<textarea value={body} maxLength={500} onChange={event => setBody(event.target.value)} required /></label>
      </div>
      <div className="ops-actions"><button className="ops-button" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Trigger backend test'}</button></div>
    </form>
    {delivery && <div className="ops-card" role="status">
      <h3>Delivery result</h3><p className="ops-muted">{delivery.message}</p>
      <div className="ops-grid">
        {[["Eligible users", delivery.eligibleUserCount], ["Registered users", delivery.registeredUserCount], ["Push delivered", delivery.successCount], ["Device tokens", delivery.tokenCount], ["Push failures", delivery.failureCount]].map(([label, value]) => <div className="ops-metric" key={label}><small>{label}</small><strong>{Number(value) || 0}</strong></div>)}
      </div>
      <p className="ops-muted">Superadmins registered: {delivery.roleStats?.superadmin?.registeredUserCount || 0}/{delivery.roleStats?.superadmin?.eligibleUserCount || 0}</p>
      {delivery.pushErrorCode && <p className="ops-error">Firebase error: {delivery.pushErrorCode}</p>}
    </div>}
    <div className="ops-card">
      <h3>Production zinc trigger</h3>
      <p className="ops-muted">Evaluates the latest saved production entry against its planning challan target and replays a qualifying alert with a new notification key.</p>
      <div className="ops-actions"><button className="ops-button secondary" type="button" disabled={checkingZinc} onClick={testLatestZinc}>{checkingZinc ? 'Checking…' : 'Check latest zinc entry'}</button></div>
      {zincCheck && <div role="status"><strong>{zincCheck.result?.reason || 'UNKNOWN'}</strong><p className="ops-muted">Challan: {zincCheck.entry?.challan_no || '—'} · SR: {zincCheck.entry?.sr_no || '—'}</p><p className="ops-muted">Entry zinc: {zincCheck.result?.zinc ?? zincCheck.entry?.zinc_percentage ?? '—'}% · Target: {zincCheck.result?.target ?? zincCheck.entry?.target_zinc_percentage ?? '—'}%</p></div>}
    </div>
    <div className="ops-card"><h3>How to read the result</h3><p className="ops-muted">Registered users have saved device tokens. Push delivered means Firebase accepted the notification for those devices.</p></div>
  </section>;
}
