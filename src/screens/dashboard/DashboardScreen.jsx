import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Factory,
  Gauge,
  PackageCheck,
  RefreshCw,
  TrendingUp,
  Weight,
  Zap,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getDashboardApi } from '../../api/dashboardApi';
import socket from '../../socket/socket';
import './DashboardScreen.css';

const formatNumber = (
  value,
  maximumFractionDigits = 2,
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString('en-IN', {
        maximumFractionDigits,
      })
    : '0';
};

const formatName = value => {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character =>
      character.toUpperCase(),
    );
};

const normalizeDashboard = response => {
  const root = response?.data || response || {};

  const current =
    root.active_shift_summary ||
    root.current_shift_summary ||
    root.current_shift ||
    root.summary ||
    {};

  const today =
    root.today_summary || root.today_shift_summary || {};

  return {
    root,
    current,

    day:
      today.day ||
      today.day_shift ||
      root.day_shift ||
      root.today_day_shift ||
      {},

    night:
      today.night ||
      today.night_shift ||
      root.night_shift ||
      root.today_night_shift ||
      {},

    month:
      root.current_month ||
      root.current_month_summary ||
      root.monthly_summary ||
      {},

    shift:
      root.shift_status ||
      root.shift ||
      {},

    plant:
      root.plant_status ||
      {},

    monthlyRows: Array.isArray(
      (root.current_month || root.monthly_summary)?.daily_summary,
    )
      ? (root.current_month || root.monthly_summary).daily_summary
      : [],
  };
};

function MetricCard({
  icon: Icon,
  title,
  value,
  unit,
  color,
  description,
}) {
  return (
    <article
      className="metric-card"
      style={{ '--card-color': color }}
    >
      <div className="metric-card-icon">
        <Icon size={23} strokeWidth={1.8} />
      </div>

      <div>
        <span className="metric-title">
          {title}
        </span>

        <div className="metric-value">
          {value}

          <small>{unit}</small>
        </div>

        <span className="metric-description">
          {description}
        </span>
      </div>
    </article>
  );
}

function ShiftCard({
  title,
  data,
  icon: Icon,
}) {
  const ms =
    data.total_ms_production_kg ??
    data.total_ms ??
    0;

  const gi =
    data.total_gi_production_kg ??
    data.total_gi ??
    0;

  const zinc =
    data.zinc_consumption ?? 0;

  const quantity =
    data.total_dipping_qty ??
    data.dipping_qty ??
    0;

  return (
    <article className="dashboard-card shift-card">
      <div className="shift-heading">
        <div className="shift-icon">
          <Icon size={20} />
        </div>

        <div>
          <h3>{title}</h3>

          <span>
            {title === 'Day Shift'
              ? '08:00 AM – 08:00 PM'
              : '08:00 PM – 08:00 AM'}
          </span>
        </div>
      </div>

      <div className="shift-values">
        <div>
          <span>MS production</span>
          <strong>{formatNumber(ms)} kg</strong>
        </div>

        <div>
          <span>GI production</span>
          <strong>{formatNumber(gi)} kg</strong>
        </div>

        <div>
          <span>Zinc consumption</span>

          <strong
            className={
              Number(zinc) > 7.5
                ? 'danger-text'
                : ''
            }
          >
            {formatNumber(zinc)}%
          </strong>
        </div>

        <div>
          <span>Dip quantity</span>

          <strong>
            {formatNumber(quantity, 0)} NOS
          </strong>
        </div>
      </div>
    </article>
  );
}

export default function DashboardScreen() {
  const [response, setResponse] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState('');

  const loadDashboard = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      try {
        const result =
          await getDashboardApi();

        setResponse(result);
      } catch (requestError) {
        console.error(
          'Dashboard error:',
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            'Unable to load dashboard.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const refreshDashboard = () => {
      loadDashboard(false);
    };

    socket.on(
      'production_updated',
      refreshDashboard,
    );

    socket.on(
      'shift_updated',
      refreshDashboard,
    );

    socket.on(
      'plant_status_updated',
      refreshDashboard,
    );

    return () => {
      socket.off(
        'production_updated',
        refreshDashboard,
      );

      socket.off(
        'shift_updated',
        refreshDashboard,
      );

      socket.off(
        'plant_status_updated',
        refreshDashboard,
      );
    };
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(
      () => {
        loadDashboard(false);
      },
      30000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const dashboard = useMemo(
    () => normalizeDashboard(response),
    [response],
  );

  const current = dashboard.current;

  const ms =
    current.total_ms_production_kg ??
    current.total_ms ??
    dashboard.root
      .total_ms_production_kg ??
    0;

  const gi =
    current.total_gi_production_kg ??
    current.total_gi ??
    dashboard.root
      .total_gi_production_kg ??
    0;

  const zincUsed =
    current.zinc_used ??
    current.zink_used ??
    dashboard.root.zinc_used ??
    dashboard.root.zink_used ??
    0;

  const zincConsumption =
    current.zinc_consumption ??
    dashboard.root.zinc_consumption ??
    0;

  const activeShift =
    dashboard.shift.active_shift ||
    dashboard.root.active_shift ||
    {};

  const plantStatus =
    dashboard.plant.status ||
    dashboard.shift.plant_status ||
    'running';

  if (loading) {
    return (
      <div className="dashboard-loader">
        <RefreshCw
          className="spinning"
          size={30}
        />

        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-screen">
      <div className="dashboard-toolbar">
        <div>
          <span className="screen-overline">
            PRODUCTION OVERVIEW
          </span>

          <h2>Plant performance</h2>

          <p>
            Live production data for the current
            shift
          </p>
        </div>

        <button
          className="dashboard-refresh"
          type="button"
          onClick={() => loadDashboard(false)}
          disabled={refreshing}
        >
          <RefreshCw
            className={
              refreshing ? 'spinning' : ''
            }
            size={17}
          />

          Refresh
        </button>
      </div>

      {error ? (
        <div className="dashboard-error">
          <AlertTriangle size={19} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
          >
            Try again
          </button>
        </div>
      ) : null}

      <section
        className={`plant-banner ${plantStatus}`}
      >
        <div className="plant-banner-icon">
          {plantStatus === 'running' ? (
            <CheckCircle2 size={23} />
          ) : (
            <AlertTriangle size={23} />
          )}
        </div>

        <div>
          <span>Plant status</span>

          <strong>
            {formatName(plantStatus)}
          </strong>

          <p>
            {dashboard.plant.message ||
              (plantStatus === 'running'
                ? 'Plant operations and production entry are active.'
                : 'Production is currently restricted.')}
          </p>
        </div>

        <span className="live-badge">
          <i />
          Live
        </span>
      </section>

      <section className="metrics-grid">
        <MetricCard
          icon={Weight}
          title="MS Production"
          value={formatNumber(ms)}
          unit="kg"
          color="#2878ff"
          description="Current shift total"
        />

        <MetricCard
          icon={Factory}
          title="GI Production"
          value={formatNumber(gi)}
          unit="kg"
          color="#16abd0"
          description="Current shift total"
        />

        <MetricCard
          icon={Gauge}
          title="Zinc Used"
          value={formatNumber(zincUsed)}
          unit="kg"
          color="#d98c00"
          description="GI minus MS weight"
        />

        <MetricCard
          icon={TrendingUp}
          title="Zinc Consumption"
          value={formatNumber(
            zincConsumption,
          )}
          unit="%"
          color={
            Number(zincConsumption) > 7.5
              ? '#d14742'
              : '#6856d8'
          }
          description={
            Number(zincConsumption) > 7.5
              ? 'Above the 7.50% alert limit'
              : 'Within the alert limit'
          }
        />
      </section>

      <section className="dashboard-card">
        <div className="card-heading">
          <div><span className="screen-overline">CURRENT MONTH</span><h3>Monthly production summary</h3></div>
        </div>
        <div className="shift-values">
          <div><span>MS production</span><strong>{formatNumber(dashboard.month.total_ms_production_kg)} kg</strong></div>
          <div><span>GI production</span><strong>{formatNumber(dashboard.month.total_gi_production_kg)} kg</strong></div>
          <div><span>Zinc used</span><strong>{formatNumber(dashboard.month.zink_used)} kg</strong></div>
          <div><span>Zinc consumption</span><strong className={Number(dashboard.month.zinc_consumption) > 7.5 ? 'danger-text' : ''}>{formatNumber(dashboard.month.zinc_consumption)}%</strong></div>
        </div>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-card">
          <div className="card-heading">
            <div>
              <span className="screen-overline">
                ACTIVE SHIFT
              </span>

              <h3>Current shift</h3>
            </div>

            <span className="shift-badge">
              <Zap size={14} />

              {formatName(
                dashboard.shift
                  .current_shift ||
                  activeShift.shift_name ||
                  'No shift',
              )}
            </span>
          </div>

          <div className="shift-information">
            <div>
              <Clock3 />

              <span>
                <small>Shift name</small>

                <strong>
                  {formatName(
                    dashboard.shift
                      .current_shift ||
                      activeShift.shift_name ||
                      '-',
                  )}
                </strong>
              </span>
            </div>

            <div>
              <PackageCheck />

              <span>
                <small>Shift date</small>

                <strong>
                  {activeShift.shift_date ||
                    dashboard.shift
                      .shift_date ||
                    '-'}
                </strong>
              </span>
            </div>

            <div>
              <Clock3 />

              <span>
                <small>Start time</small>

                <strong>
                  {activeShift.start_time ||
                    dashboard.shift
                      .shift_start ||
                    '-'}
                </strong>
              </span>
            </div>

            <div>
              <Factory />

              <span>
                <small>Dip quantity</small>

                <strong>
                  {formatNumber(
                    current
                      .total_dipping_qty ??
                      current.dipping_qty,
                    0,
                  )}{' '}
                  NOS
                </strong>
              </span>
            </div>
          </div>
        </article>

        <ShiftCard
          title="Day Shift"
          data={dashboard.day}
          icon={Factory}
        />

        <ShiftCard
          title="Night Shift"
          data={dashboard.night}
          icon={Clock3}
        />
      </section>

      <section className="dashboard-card material-card">
        <div className="card-heading">
          <div>
            <span className="screen-overline">
              MONTHLY PRODUCTION
            </span>

            <h3>Daily summary for current month</h3>
          </div>

          <span className="material-count">
            {dashboard.monthlyRows.length}
            {' '}
            production days
          </span>
        </div>

        {dashboard.monthlyRows.length ? (
          <div className="material-table-wrapper">
            <table className="material-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>MS production</th>
                  <th>GI production</th>
                  <th>Zinc used</th>
                  <th>Zinc %</th>
                </tr>
              </thead>

              <tbody>
                {dashboard.monthlyRows.map(
                  (material, index) => {
                    const materialZinc =
                      material
                        .zinc_consumption ??
                      material
                        .zinc_percentage ??
                      0;

                    return (
                      <tr
                        key={
                            material.production_date ||
                          index
                        }
                      >
                        <td>
                          <strong>
                            {material.production_date ||
                              '-'}
                          </strong>
                        </td>

                        <td>
                          {formatNumber(
                            material.total_dipping_qty,
                            0,
                          )}{' '}
                          NOS
                        </td>

                        <td>
                          {formatNumber(
                            material.total_ms ??
                              material
                                .total_ms_production_kg,
                          )}{' '}
                          kg
                        </td>

                        <td>
                          {formatNumber(
                            material.total_gi ??
                              material
                                .total_gi_production_kg,
                          )}{' '}
                          kg
                        </td>

                        <td>
                          {formatNumber(
                            material.zinc_used ??
                              material.zink_used,
                          )}{' '}
                          kg
                        </td>

                        <td>
                          <span
                            className={
                              Number(
                                materialZinc,
                              ) > 7.5
                                ? 'zinc-value danger'
                                : 'zinc-value'
                            }
                          >
                            {formatNumber(
                              materialZinc,
                            )}
                            %
                          </span>
                        </td>

                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-materials">
            <PackageCheck size={34} />

            <strong>
              No monthly production available
            </strong>

            <span>
              Daily totals will appear after
              production entries are added.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
