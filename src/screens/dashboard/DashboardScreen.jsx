import { AlertTriangle, CalendarDays, Moon, RefreshCw, Sun } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDashboardApi } from '../../api/dashboardApi';
import socket from '../../socket/socket';
import { currentInputMonth, formatDisplayDate, formatDisplayMonth } from '../../utils/dateTime';
import './DashboardScreen.css';

const number = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const weight = value => `${number(value)} KG`;

function ShiftCard({ title, icon: Icon, data }) {
  return <article className="app-dashboard-shift">
    <header><span className="app-dashboard-shift-icon"><Icon size={22} /></span><h3>{title}</h3></header>
    <div className="app-dashboard-shift-grid">
      <div><span>MS production</span><strong>{weight(data?.total_ms_production_kg)}</strong></div>
      <div><span>GI production</span><strong>{weight(data?.total_gi_production_kg)}</strong></div>
      <div><span>Zinc used</span><strong>{weight(data?.zink_used ?? data?.zinc_used)}</strong></div>
      <div><span>Zinc consumption</span><strong>{number(data?.zinc_consumption)}%</strong></div>
    </div>
  </article>;
}

export default function DashboardScreen() {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadDashboard = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError('');
    try { setResponse(await getDashboardApi()); }
    catch (requestError) { setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load dashboard.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadDashboard(true); }, [loadDashboard]);
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refresh = () => loadDashboard();
    ['production_updated', 'shift_updated', 'plant_status_updated'].forEach(event => socket.on(event, refresh));
    const interval = window.setInterval(refresh, 10000);
    return () => { ['production_updated', 'shift_updated', 'plant_status_updated'].forEach(event => socket.off(event, refresh)); window.clearInterval(interval); };
  }, [loadDashboard]);

  const dashboard = useMemo(() => response?.data || response || {}, [response]);
  const today = dashboard.today_summary || dashboard.today_shift_summary || {};
  const month = dashboard.current_month || dashboard.current_month_summary || dashboard.monthly_summary || {};
  const plant = dashboard.plant_status || {};
  const date = new Date();

  if (loading) return <div className="app-dashboard-loading"><RefreshCw className="spinning" size={28} />Loading dashboard...</div>;

  return <main className="app-dashboard">
    <header className="app-dashboard-intro">
      <div><span>Your plant at a glance</span><h1>Dashboard</h1></div>
      <div className="app-dashboard-intro-actions">
        <span className="app-dashboard-date"><CalendarDays size={16} />{formatDisplayDate(date)}</span>
        <button type="button" onClick={() => loadDashboard()} disabled={refreshing} aria-label="Refresh dashboard"><RefreshCw size={17} className={refreshing ? 'spinning' : ''} /></button>
      </div>
    </header>

    {(dashboard.stock_alerts || []).map((message, index) => <div key={`${index}-${message}`} className="app-dashboard-alert" role="alert"><AlertTriangle size={18} />{message}</div>)}
    {error && <div className="app-dashboard-alert" role="alert"><AlertTriangle size={18} />{error}<button type="button" onClick={() => loadDashboard(true)}>Try again</button></div>}

    <section className="app-dashboard-month">
      <header><h2>Monthly production</h2><span>{formatDisplayMonth(currentInputMonth())}</span></header>
      <div className="app-dashboard-month-grid">
        <div><span>MS Production</span><strong>{weight(month.total_ms_production_kg)}</strong></div>
        <div><span>GI Production</span><strong>{weight(month.total_gi_production_kg)}</strong></div>
        <div><span>Zinc Used</span><strong>{weight(month.zink_used ?? month.zinc_used)}</strong></div>
        <div><span>Zinc Consumption</span><strong>{number(month.zinc_consumption)}%</strong></div>
      </div>
    </section>

    <h2 className="app-dashboard-section-title">Today’s shifts</h2>
    <div className="app-dashboard-shifts">
      <ShiftCard title="Day Shift" icon={Sun} data={today.day || today.day_shift || dashboard.day_shift || dashboard.today_day_shift} />
      <ShiftCard title="Night Shift" icon={Moon} data={today.night || today.night_shift || dashboard.night_shift || dashboard.today_night_shift} />
    </div>

    {plant.production_allowed === false && <div className="app-dashboard-status"><AlertTriangle size={23} /><div><strong>{plant.title || (plant.status === 'maintenance' ? 'Plant Under Maintenance' : 'Plant Stopped')}</strong><p>{plant.message || 'Plant operations are currently stopped.'}</p><span>Production entry is blocked. Dashboard totals show completed production only.</span></div></div>}
  </main>;
}
