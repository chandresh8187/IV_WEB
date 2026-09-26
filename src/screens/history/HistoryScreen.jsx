import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Droplets,
  Factory,
  FileText,
  Layers3,
  Moon,
  Printer,
  RefreshCw,
  Search,
  Sun,
  X,
  Edit3,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getHistoryDatesApi,
  getHistoryDateSummaryApi,
  getHistoryMaterialSummaryApi,
  getHistoryPlanningSummaryApi,
  getHistoryShiftTableApi,
  downloadProductionReportApi,
} from "../../api/historyApi";
import { deleteProductionApi, updateProductionByIdApi } from "../../api/productionApi";
import socket from "../../socket/socket";
import { hasPermission } from "../../utils/permissions";
import "./HistoryScreen.css";

const today = new Date().toISOString().slice(0, 10);

const emptySummary = {
  total_ms_production_kg: 0,
  total_gi_production_kg: 0,
  zink_used: 0,
  zinc_consumption: 0,
};

const formatNumber = (value, maximumFractionDigits = 3) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-IN", {
    maximumFractionDigits,
  });
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const [hoursValue, minutesValue] = String(value).split(":");

  let hours = Number(hoursValue);
  const minutes = minutesValue || "00";

  if (!Number.isFinite(hours)) {
    return value;
  }

  const suffix = hours >= 12 ? "PM" : "AM";

  hours %= 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${hours}:${minutes} ${suffix}`;
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return error?.response?.data?.message || error?.message || fallback;
};

function SummaryCard({ icon: Icon, label, value, suffix, color }) {
  return (
    <article
      className="history-summary-card"
      style={{ "--history-card-color": color }}
    >
      <div className="history-summary-icon">
        <Icon size={20} />
      </div>

      <div>
        <span>{label}</span>

        <strong>
          {formatNumber(value)}
          {suffix ? <small>{suffix}</small> : null}
        </strong>
      </div>
    </article>
  );
}

function ShiftSummary({ title, icon: Icon, data, type, onReport }) {
  return (
    <article className={`history-shift-summary ${type}`}>
      <header>
        <div className="history-shift-icon">
          <Icon size={18} />
        </div>

        <div>
          <strong>{title}</strong>
          <span>Production summary</span>
        </div>
      </header>

      <div className="history-shift-values">
        <div>
          <span>MS Production</span>

          <strong>{formatNumber(data?.total_ms_production_kg)} KG</strong>
        </div>

        <div>
          <span>GI Production</span>

          <strong>{formatNumber(data?.total_gi_production_kg)} KG</strong>
        </div>

        <div>
          <span>Zinc Used</span>

          <strong>{formatNumber(data?.zink_used)} KG</strong>
        </div>

        <div>
          <span>Zinc Consumption</span>

          <strong>{formatNumber(data?.zinc_consumption, 2)}%</strong>
        </div>
      </div>
      {onReport ? <button className="history-secondary-button history-no-print" type="button" onClick={onReport}><Download size={15} /> PDF report</button> : null}
    </article>
  );
}

function ShiftTable({ rows, search, canEdit, onEdit, onDelete, deletingId }) {
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((item) =>
      [
        item.sr_no,
        item.challan_no,
        item.party_name,
        item.material,
        item.production_time,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [rows, search]);

  if (!filteredRows.length) {
    return (
      <div className="history-empty-state">
        <Factory size={38} />

        <strong>No production entries found</strong>

        <span>No production data matches the selected date and shift.</span>
      </div>
    );
  }

  return (
    <div className="history-table-wrapper">
      <table className="history-table">
        <thead>
          <tr>
            <th>SR No</th>
            <th>Time</th>
            <th>Challan</th>
            <th>Party</th>
            <th>Material</th>
            <th>Kettle</th>
            <th>Dip Qty</th>
            <th>MS Weight</th>
            <th>GI Weight</th>
            <th>Zinc %</th>

            <th>C1</th>
            <th>C2</th>
            <th>C3</th>
            <th>C4</th>
            <th>C5</th>
            <th>Average</th>
            {canEdit ? <th>Actions</th> : null}
          </tr>
        </thead>

        <tbody>
          {filteredRows.map((item) => (
            <tr key={item.id}>
              <td>
                <strong className="history-sr-number">
                  {item.sr_no ?? "-"}
                </strong>
              </td>
              <td>{formatTime(item.production_time)}</td>

              <td>{item.challan_no || "-"}</td>

              <td>
                <strong>{item.party_name || "-"}</strong>
              </td>

              <td>
                <span className="history-material-text">
                  {item.material || "-"}
                </span>
              </td>

              <td>
                {item.kettle_temperature
                  ? `${formatNumber(item.kettle_temperature, 1)} °C`
                  : "-"}
              </td>

              <td>{formatNumber(item.dipping_qty, 0)}</td>

              <td>
                {item.ms_weight ? `${formatNumber(item.ms_weight)} KG` : "-"}
              </td>

              <td>
                {item.gi_weight ? `${formatNumber(item.gi_weight)} KG` : "-"}
              </td>

              <td>
                <span
                  className={`history-zinc-value ${
                    Number(item.zinc_percentage) > 7.5 ? "high" : ""
                  }`}
                >
                  {item.zinc_percentage
                    ? `${formatNumber(item.zinc_percentage, 2)}%`
                    : "-"}
                </span>
              </td>



              <td>{formatNumber(item.c1, 0)}</td>
              <td>{formatNumber(item.c2, 0)}</td>
              <td>{formatNumber(item.c3, 0)}</td>
              <td>{formatNumber(item.c4, 0)}</td>
              <td>{formatNumber(item.c5, 0)}</td>

              <td>
                <strong className="history-coating-value">
                  {formatNumber(item.avg_coating, 0)}
                </strong>
              </td>
              {canEdit ? <td><div className="history-row-actions history-no-print"><button className="history-secondary-button" type="button" onClick={() => onEdit(item)}><Edit3 size={14} /> Edit</button><button className="history-delete-button" type="button" disabled={deletingId===item.id} onClick={() => onDelete(item)}><Trash2 size={14} /> {deletingId===item.id?"Deleting...":"Delete"}</button></div></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialSummary({ materials, search, onReport }) {
  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return materials;
    }

    return materials.filter((item) =>
      String(item.material || "")
        .toLowerCase()
        .includes(query),
    );
  }, [materials, search]);

  if (!filteredMaterials.length) {
    return (
      <div className="history-empty-state">
        <Layers3 size={38} />

        <strong>No material summary found</strong>

        <span>No material data matches the selected date.</span>
      </div>
    );
  }

  return (
    <div className="history-material-grid">
      {filteredMaterials.map((item, index) => (
        <article
          className="history-material-card"
          key={`${item.material}-${index}`}
        >
          <header>
            <div>
              <span>MATERIAL</span>

              <h3>{item.material || "-"}</h3>
            </div>

            <div
              className={`history-material-zinc ${
                Number(item.zinc_consumption) > 7.5 ? "high" : ""
              }`}
            >
              <Droplets size={14} />
              {formatNumber(item.zinc_consumption, 2)}%
            </div>
          </header>

          <div className="history-material-values">
            <div>
              <span>Total quantity</span>

              <strong>{formatNumber(item.total_dip_qty, 0)} NOS</strong>
            </div>

            <div>
              <span>Average MS</span>

              <strong>{formatNumber(item.avg_ms_weight)} KG</strong>
            </div>

            <div>
              <span>Average GI</span>

              <strong>{formatNumber(item.avg_gi_weight)} KG</strong>
            </div>

            <div>
              <span>MS Production</span>

              <strong>{formatNumber(item.total_ms_production_kg)} KG</strong>
            </div>

            <div>
              <span>GI Production</span>

              <strong>{formatNumber(item.total_gi_production_kg)} KG</strong>
            </div>

            <div>
              <span>Zinc Used</span>

              <strong>{formatNumber(item.zink_used)} KG</strong>
            </div>

            <div>
              <span>Average Coating</span>

              <strong>{formatNumber(item.avg_coating, 0)} µm</strong>
            </div>
          </div>
          {onReport ? <button className="history-secondary-button history-no-print" type="button" onClick={() => onReport(item.material)}><Download size={15} /> PDF report</button> : null}
        </article>
      ))}
    </div>
  );
}

function PlanningSummary({ planning, search, onReport }) {
  const filteredPlanning = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return planning;
    }

    return planning.filter((item) =>
      [
        item.challan_no,
        item.party_name,
        item.third_party_name,
        item.material_description,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [planning, search]);

  if (!filteredPlanning.length) {
    return (
      <div className="history-empty-state">
        <ClipboardList size={38} />

        <strong>No planning summary found</strong>

        <span>No planning data is connected to this production date.</span>
      </div>
    );
  }

  return (
    <div className="history-planning-list">
      {filteredPlanning.map((item) => {
        const percentage = Math.min(
          Math.max(Number(item.completion_percentage || 0), 0),
          100,
        );

        return (
          <article className="history-planning-card" key={item.id}>
            <header>
              <div>
                <span>CHALLAN</span>

                <h3>{item.challan_no || "-"}</h3>

                <p>
                  {item.third_party_name
                    ? `${item.party_name} (${item.third_party_name})`
                    : item.party_name || "-"}
                </p>
              </div>

              <span
                className={`history-planning-status ${
                  item.status || "pending"
                }`}
              >
                {item.status || "pending"}
              </span>
            </header>

            <p className="history-planning-material">
              {item.material_description || "-"}
            </p>

            <div className="history-progress-header">
              <span>Production completion</span>

              <strong>{formatNumber(percentage, 2)}%</strong>
            </div>

            <div className="history-progress">
              <span
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            <div className="history-planning-values">
              <div>
                <span>Planned</span>

                <strong>{formatNumber(item.planned_qty, 0)} NOS</strong>
              </div>

              <div>
                <span>Produced</span>

                <strong>{formatNumber(item.completed_qty, 0)} NOS</strong>
              </div>

              <div>
                <span>Remaining</span>

                <strong>{formatNumber(item.remaining_qty, 0)} NOS</strong>
              </div>
            </div>
            {onReport ? <button className="history-secondary-button history-no-print" type="button" onClick={() => onReport(item.challan_no)}><Download size={15} /> PDF report</button> : null}
          </article>
        );
      })}
    </div>
  );
}

export default function HistoryScreen() {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);
  const isSuperAdmin = String(currentUser?.role || "").toLowerCase() === "superadmin";
  const canManageEntries = hasPermission(currentUser, "production.manage_all");
  const [historyDates, setHistoryDates] = useState([]);

  const [selectedDate, setSelectedDate] = useState(today);

  const [monthFilter, setMonthFilter] = useState(today.slice(0, 7));

  const [activeView, setActiveView] = useState("overview");

  const [summary, setSummary] = useState({
    day_shift: emptySummary,
    night_shift: emptySummary,
    total: emptySummary,
  });

  const [dayRows, setDayRows] = useState([]);
  const [nightRows, setNightRows] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [planning, setPlanning] = useState([]);

  const [search, setSearch] = useState("");
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage(null);
    }, 4000);
  }, []);

  const loadDates = useCallback(async () => {
    try {
      const response = await getHistoryDatesApi(monthFilter);

      const dates = Array.isArray(response?.data) ? response.data : [];

      setHistoryDates(dates);

      if (
        dates.length &&
        !dates.some((item) => item.shift_date === selectedDate)
      ) {
        setSelectedDate(dates[0].shift_date);
        setMonthFilter(dates[0].shift_date.slice(0, 7));
      }
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to load production history."),
      );
    } finally {
      setLoadingDates(false);
    }
  }, [monthFilter, selectedDate, showMessage]);

  const loadDetails = useCallback(
    async (date) => {
      if (!date) {
        return;
      }

      setLoadingDetails(true);

      try {
        const [
          summaryResponse,
          dayResponse,
          nightResponse,
          materialResponse,
          planningResponse,
        ] = await Promise.all([
          getHistoryDateSummaryApi(date),

          getHistoryShiftTableApi({
            date,
            shift_name: "day",
          }),

          getHistoryShiftTableApi({
            date,
            shift_name: "night",
          }),

          getHistoryMaterialSummaryApi(date),

          getHistoryPlanningSummaryApi(date),
        ]);

        setSummary(
          summaryResponse?.data || {
            day_shift: emptySummary,
            night_shift: emptySummary,
            total: emptySummary,
          },
        );

        setDayRows(
          Array.isArray(dayResponse?.data?.table_data)
            ? dayResponse.data.table_data
            : [],
        );

        setNightRows(
          Array.isArray(nightResponse?.data?.table_data)
            ? nightResponse.data.table_data
            : [],
        );

        setMaterials(
          Array.isArray(materialResponse?.data) ? materialResponse.data : [],
        );

        setPlanning(
          Array.isArray(planningResponse?.data) ? planningResponse.data : [],
        );
      } catch (error) {
        showMessage(
          "error",
          getErrorMessage(error, "Unable to load history details."),
        );
      } finally {
        setLoadingDetails(false);
      }
    },
    [showMessage],
  );

  const refreshHistory = useCallback(
    async (showSuccess) => {
      setRefreshing(true);

      await Promise.all([loadDates(), loadDetails(selectedDate)]);

      setRefreshing(false);

      if (showSuccess) {
        showMessage("success", "Production history refreshed.");
      }
    },
    [loadDates, loadDetails, selectedDate, showMessage],
  );

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useEffect(() => {
    loadDetails(selectedDate);
    setSearch("");
  }, [loadDetails, selectedDate]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleProductionUpdate = () => {
      refreshHistory(false);
    };

    socket.on("production_updated", handleProductionUpdate);

    return () => {
      socket.off("production_updated", handleProductionUpdate);
    };
  }, [refreshHistory]);

  const filteredDates = useMemo(() => {
    if (!monthFilter) {
      return historyDates;
    }

    return historyDates.filter((item) =>
      String(item.shift_date).startsWith(monthFilter),
    );
  }, [historyDates, monthFilter]);

  const currentRows = activeView === "night" ? nightRows : dayRows;

  const exportShiftCsv = () => {
    const shiftName = activeView === "night" ? "night" : "day";

    if (!currentRows.length) {
      showMessage("error", `No ${shiftName} shift data to export.`);

      return;
    }

    const headers = [
      "SR No",
      "Production Time",
      "Challan No",
      "Party Name",
      "Material",
      "Kettle Temperature",
      "Dip Quantity",
      "MS Weight",
      "GI Weight",
      "Zinc Percentage",

      "C1",
      "C2",
      "C3",
      "C4",
      "C5",
      "Average Coating",
    ];

    const escapeCsv = (value) => {
      const text = String(value ?? "");

      return `"${text.replaceAll('"', '""')}"`;
    };

    const rows = currentRows.map((item) => [
      item.sr_no,
      item.production_time,
      item.challan_no,
      item.party_name,
      item.material,
      item.kettle_temperature,
      item.dipping_qty,
      item.ms_weight,
      item.gi_weight,
      item.zinc_percentage,

      item.c1,
      item.c2,
      item.c3,
      item.c4,
      item.c5,
      item.avg_coating,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const file = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = `production-${selectedDate}-${shiftName}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const downloadReport = async (type, value, date = selectedDate) => {
    try {
      const response = await downloadProductionReportApi({ type, value, date });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `production-${type}-${String(value).replace(/[^a-z0-9_-]+/gi, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to generate PDF report."));
    }
  };

  const openHistoryEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm(Object.fromEntries([
      "planning_id", "challan_no", "party_name", "material", "production_time",
      "dipping_qty", "kettle_temperature", "ms_weight", "gi_weight", "c1", "c2", "c3", "c4", "c5",
    ].map((key) => [key, String(entry[key] ?? "").slice(0, key === "production_time" ? 5 : undefined)])));
  };

  const saveHistoryEdit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    try {
      await updateProductionByIdApi({ id: editingEntry.id, body: editForm });
      setEditingEntry(null);
      setEditForm(null);
      showMessage("success", `SR ${editingEntry.sr_no} updated successfully.`);
      await loadDetails(selectedDate);
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to update production entry."));
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteHistoryEntry = async (entry) => {
    if (!window.confirm(`Delete production entry SR ${entry.sr_no}? This will also restore its deducted zinc stock and recalculate linked planning.`)) return;
    setDeletingId(entry.id);
    try {
      const response = await deleteProductionApi(entry.id);
      showMessage("success", response?.message || `SR ${entry.sr_no} deleted successfully.`);
      await Promise.all([loadDetails(selectedDate), loadDates()]);
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to delete production entry."));
    } finally {
      setDeletingId(null);
    }
  };

  const selectHistoryDate = (date) => {
    setSelectedDate(date);
    setMonthFilter(date.slice(0, 7));
    setActiveView("overview");
  };

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: FileText,
    },
    {
      value: "day",
      label: "Day Shift",
      icon: Sun,
    },
    {
      value: "night",
      label: "Night Shift",
      icon: Moon,
    },
    {
      value: "materials",
      label: "Material Summary",
      icon: Layers3,
    },
    {
      value: "planning",
      label: "Planning Summary",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="history-screen">
      <div className="history-toolbar history-no-print">
        <div>
          <span className="history-overline">PRODUCTION MANAGEMENT</span>

          <h2>Production history</h2>

          <p>
            Review date, shift, material and planning-wise production reports.
          </p>
        </div>

        <div className="history-toolbar-actions">
          <button
            className="history-secondary-button"
            type="button"
            onClick={() => refreshHistory(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={refreshing ? "history-spinning" : ""}
              size={17}
            />
            Refresh
          </button>

          <button
            className="history-print-button"
            type="button"
            onClick={() => window.print()}
            disabled={loadingDetails}
          >
            <Printer size={17} />
            Print / PDF
          </button>
        </div>
      </div>

      {message ? (
        <div className={`history-message history-no-print ${message.type}`}>
          {message.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}

          <span>{message.text}</span>

          <button type="button" onClick={() => setMessage(null)}>
            <X size={16} />
          </button>
        </div>
      ) : null}

      <header className="history-print-header">
        <h1>IV SQUARE STRUCTURE</h1>

        <p>Production History Report – {formatDate(selectedDate)}</p>
      </header>

      <section className="history-summary-grid">
        <SummaryCard
          icon={Factory}
          label="Total MS Production"
          value={summary.total?.total_ms_production_kg}
          suffix="KG"
          color="#2878ff"
        />

        <SummaryCard
          icon={Factory}
          label="Total GI Production"
          value={summary.total?.total_gi_production_kg}
          suffix="KG"
          color="#18a567"
        />

        <SummaryCard
          icon={Droplets}
          label="Total Zinc Used"
          value={summary.total?.zink_used}
          suffix="KG"
          color="#d98c00"
        />

        <SummaryCard
          icon={Droplets}
          label="Zinc Consumption"
          value={summary.total?.zinc_consumption}
          suffix="%"
          color={
            Number(summary.total?.zinc_consumption) > 7.5
              ? "#d8423e"
              : "#7357d8"
          }
        />
      </section>

      <div className="history-layout">
        <aside className="history-date-panel history-no-print">
          <div className="history-date-panel-header">
            <div>
              <span>REPORT DATE</span>
              <strong>Select production date</strong>
            </div>

            <CalendarDays size={19} />
          </div>

          <label className="history-date-field">
            <span>Filter history by month</span>

            <input
              type="month"
              value={monthFilter}
              max={today.slice(0, 7)}
              onChange={(event) => setMonthFilter(event.target.value)}
            />
          </label>

          <div className="history-date-list">
            {loadingDates ? (
              <div className="history-date-loader">
                <RefreshCw className="history-spinning" size={21} />
                Loading dates...
              </div>
            ) : filteredDates.length ? (
              filteredDates.map((item) => (
                <button
                  key={item.shift_date}
                  type="button"
                  className={selectedDate === item.shift_date ? "active" : ""}
                  onClick={() => selectHistoryDate(item.shift_date)}
                >
                  <CalendarDays size={16} />

                  <div>
                    <strong>{formatDate(item.shift_date)}</strong>

                    <span>
                      {formatNumber(item.total_gi_production_kg)} KG GI •{" "}
                      {formatNumber(item.zinc_consumption, 2)}% Zinc
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="history-date-empty">
                No history found for this month.
              </div>
            )}
          </div>
        </aside>

        <section className="history-report-card">
          <header className="history-report-header">
            <div>
              <span>SELECTED REPORT</span>

              <h3>{formatDate(selectedDate)}</h3>
            </div>

            <div className="history-report-count">
              <strong>{dayRows.length + nightRows.length}</strong>

              <span>Production entries</span>
            </div>
          </header>

          <nav className="history-tabs history-no-print">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.value}
                  type="button"
                  className={activeView === tab.value ? "active" : ""}
                  onClick={() => {
                    setActiveView(tab.value);
                    setSearch("");
                  }}
                >
                  <Icon size={15} />

                  {tab.label}
                </button>
              );
            })}
          </nav>

          {activeView !== "overview" ? (
            <div className="history-content-actions history-no-print">
              <div className="history-search">
                <Search size={16} />

                <input
                  type="search"
                  value={search}
                  placeholder={
                    activeView === "materials"
                      ? "Search material..."
                      : activeView === "planning"
                        ? "Search challan, party or material..."
                        : "Search SR, challan, party or material..."
                  }
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {["day", "night"].includes(activeView) ? (
                <button
                  className="history-export-button"
                  type="button"
                  onClick={exportShiftCsv}
                >
                  <Download size={16} />
                  Export CSV
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="history-report-content">
            {loadingDetails ? (
              <div className="history-main-loader">
                <RefreshCw className="history-spinning" size={28} />

                <span>Loading production report...</span>
              </div>
            ) : (
              <>
                {activeView === "overview" ? (
                  <div className="history-overview">
                    <ShiftSummary
                      title="Day Shift"
                      icon={Sun}
                      data={summary.day_shift}
                      type="day"
                      onReport={isSuperAdmin && dayRows.length ? () => downloadReport("shift", "day") : null}
                    />

                    <ShiftSummary
                      title="Night Shift"
                      icon={Moon}
                      data={summary.night_shift}
                      type="night"
                      onReport={isSuperAdmin && nightRows.length ? () => downloadReport("shift", "night") : null}
                    />

                    <article className="history-total-card">
                      <div>
                        <span>TOTAL PRODUCTION</span>

                        <h3>Day + Night Shift</h3>
                      </div>

                      <div className="history-total-values">
                        <div>
                          <span>Production Entries</span>

                          <strong>{dayRows.length + nightRows.length}</strong>
                        </div>

                        <div>
                          <span>MS Production</span>

                          <strong>
                            {formatNumber(
                              summary.total?.total_ms_production_kg,
                            )}{" "}
                            KG
                          </strong>
                        </div>

                        <div>
                          <span>GI Production</span>

                          <strong>
                            {formatNumber(
                              summary.total?.total_gi_production_kg,
                            )}{" "}
                            KG
                          </strong>
                        </div>

                        <div>
                          <span>Zinc Consumption</span>

                          <strong>
                            {formatNumber(summary.total?.zinc_consumption, 2)}%
                          </strong>
                        </div>
                      </div>
                    </article>
                  </div>
                ) : null}

                {activeView === "day" ? (
                  <ShiftTable rows={dayRows} search={search} canEdit={canManageEntries} onEdit={openHistoryEdit} onDelete={deleteHistoryEntry} deletingId={deletingId} />
                ) : null}

                {activeView === "night" ? (
                  <ShiftTable rows={nightRows} search={search} canEdit={canManageEntries} onEdit={openHistoryEdit} onDelete={deleteHistoryEntry} deletingId={deletingId} />
                ) : null}

                {activeView === "materials" ? (
                  <MaterialSummary materials={materials} search={search} onReport={isSuperAdmin ? (value) => downloadReport("material", value) : null} />
                ) : null}

                {activeView === "planning" ? (
                  <PlanningSummary planning={planning} search={search} onReport={isSuperAdmin ? (value) => downloadReport("challan", value) : null} />
                ) : null}
              </>
            )}
          </div>

          {!loadingDetails ? (
            <footer className="history-report-footer">
              Report date: <strong>{formatDate(selectedDate)}</strong>
              <span>
                Last refreshed at{" "}
                {new Date().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </footer>
          ) : null}
        </section>
      </div>
      {editingEntry && editForm ? (
        <div className="history-edit-backdrop history-no-print" onMouseDown={() => !savingEdit && setEditingEntry(null)}>
          <form className="history-edit-modal" onSubmit={saveHistoryEdit} onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>SUPERADMIN EDIT</span><h3>Edit history SR {editingEntry.sr_no}</h3></div><button type="button" onClick={() => setEditingEntry(null)}><X size={18} /></button></header>
            <div className="history-edit-grid">
              {[
                ["challan_no", "Challan"], ["party_name", "Party"], ["material", "Material"],
                ["production_time", "Time", "time"], ["dipping_qty", "Dip Qty", "number"],
                ["kettle_temperature", "Kettle °C", "number"], ["ms_weight", "MS Weight", "number"],
                ["gi_weight", "GI Weight", "number"], ["c1", "C1", "number"], ["c2", "C2", "number"],
                ["c3", "C3", "number"], ["c4", "C4", "number"], ["c5", "C5", "number"],
              ].map(([key, label, type = "text"]) => (
                <label key={key}><span>{label}</span><input type={type} step={type === "number" ? "0.001" : undefined} value={editForm[key]} onChange={(event) => setEditForm((current) => ({ ...current, [key]: event.target.value }))} required={["challan_no", "party_name", "material", "production_time", "dipping_qty"].includes(key)} /></label>
              ))}
            </div>
            <footer><button type="button" className="history-secondary-button" onClick={() => setEditingEntry(null)}>Cancel</button><button type="submit" className="history-print-button" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save changes"}</button></footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
