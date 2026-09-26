import {
  AlertTriangle,
  Clock3,
  Edit3,
  Factory,
  Gauge,
  LockKeyhole,
  MessageCircle,
  Plus,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
  Weight,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router';

import {
  deleteProductionApi,
  getAvailablePlanningApi,
  getProductionsApi,
  getProductionShiftStatusApi,
  getProductionContractorsApi,
  saveProductionApi,
  grantProductionEditApi,
  getDefaultChallanApi,
  setDefaultChallanApi,
  getPreviousShiftsApi,
  openShiftCorrectionApi,
  resumeShiftCorrectionApi,
} from "../../api/productionApi";
import { getZincTransferContextApi, saveZincMovementApi } from "../../api/zincStockApi";
import { getUsersApi } from "../../api/usersApi";
import { consumeLabourWeightApi, getPendingLabourWeightsApi } from "../../api/labourWeightsApi";
import { hasPermission } from "../../utils/permissions";
import { formatDisplayDate } from "../../utils/dateTime";
import socket from "../../socket/socket";
import { getChatApi } from '../../api/chatApi';
import "./ProductionScreen.css";

const EMPTY_FORM = {
  entry_id: null,
  labour_weight_id: null,
  sr_no: "",
  planning_item_id: "",
  planning_id: "",
  challan_no: "",
  party_name: "",
  material: "",
  production_time: "",
  dipping_qty: "",
  kettle_temperature: "",
  ms_weight: "",
  gi_weight: "",
  c1: "",
  c2: "",
  c3: "",
  c4: "",
  c5: "",
  contractor_id: "",
};

const number = (value, digits = 2) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("en-IN", {
        maximumFractionDigits: digits,
      })
    : "-";
};

const time12 = (value) => {
  if (!value) return "-";
  const [hours = 0, minutes = 0] = String(value).split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const unwrapRows = (response) => {
  const value = response?.data?.table_data ?? response?.data ?? [];
  return Array.isArray(value) ? value : [];
};

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

function Field({ label, className = "", ...props }) {
  return (
    <label className={`production-field ${className}`}>
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

export default function ProductionScreen() {
  const navigate = useNavigate();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const user = useMemo(() => readUser(), []);
  useEffect(() => {
    if (hasPermission(user, 'chat.view')) getChatApi().then(result => setUnreadChatCount(Number(result?.data?.unread_count || 0))).catch(() => {});
    const onMessage = message => {
      if (Number(message?.user_id) !== Number(user?.id)) setUnreadChatCount(value => value + 1);
    };
    socket.on('chat_message_created', onMessage);
    return () => socket.off('chat_message_created', onMessage);
  }, [user]);
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();
  const canViewProductionCost = ["superadmin", "admin"].includes(role);
  const canSaveProduction = hasPermission(user, "production.save");
  const canGrantProductionEdit = hasPermission(user, "production.grant_edit");
  const canManageAllProduction = hasPermission(user, "production.manage_all");
  const canAddZinc = hasPermission(user, "zinc_stock.transfer");
  const canCorrectShift = hasPermission(user, "shifts.correct");

  const [shiftResponse, setShiftResponse] = useState(null);
  const [planning, setPlanning] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [grantRow, setGrantRow] = useState(null);
  const [selectedGrantUser, setSelectedGrantUser] = useState("");
  const [grantSaving, setGrantSaving] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [defaultPlanningId, setDefaultPlanningId] = useState("");
  const [contractors, setContractors] = useState([]);
  const [zincOpen, setZincOpen] = useState(false);
  const [zincKg, setZincKg] = useState("");
  const [zincSaving, setZincSaving] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState(new Date().toISOString().slice(0,10));
  const [correctionShift, setCorrectionShift] = useState('');
  const [correctionUser, setCorrectionUser] = useState('');
  const [correctionShifts, setCorrectionShifts] = useState([]);

  const shiftData = shiftResponse?.data || {};
  const activeShift = shiftData.active_shift || null;
  const productionAllowed = shiftData.production_allowed !== false;
  const plantStatus = shiftData.plant_status || "running";
  const canAddProduction =
    canSaveProduction &&
    Boolean(activeShift?.id) &&
    productionAllowed;
  const canUseRowActions =
    Boolean(activeShift?.id) &&
    productionAllowed &&
    (canManageAllProduction || rows.some((row) => Boolean(row.can_edit)));

  const nextSrNo = useMemo(
    () =>
      rows.reduce(
        (maximum, row) => Math.max(maximum, Number(row.sr_no) || 0),
        0,
      ) + 1,
    [rows],
  );

  const loadScreen = useCallback(async (firstLoad = false) => {
    firstLoad ? setLoading(true) : setRefreshing(true);
    setError("");

    try {
      const shiftResult = await getProductionShiftStatusApi();
      const currentShift = shiftResult?.data?.active_shift;

      const [productionResult, planningResult, preferenceResult, usersResult, contractorResult] = await Promise.all([
        currentShift?.id
          ? getProductionsApi({ shift_id: currentShift.id, limit: 500 })
          : Promise.resolve({ data: [] }),
        getAvailablePlanningApi(),
        role === "supervisor" ? getDefaultChallanApi() : Promise.resolve({ data: {} }),
        (canGrantProductionEdit || canCorrectShift) ? getUsersApi() : Promise.resolve({ data: [] }),
        getProductionContractorsApi(),
      ]);

      setShiftResponse(shiftResult);
      setRows(unwrapRows(productionResult));
      setPlanning(
        Array.isArray(planningResult?.data) ? planningResult.data : [],
      );
      setDefaultPlanningId(String(preferenceResult?.data?.default_planning_item_id || ""));
      const allUsers = usersResult?.data?.users;
      setActiveUsers(
        (Array.isArray(allUsers) ? allUsers : []).filter(
          (item) => item.status === "active",
        ),
      );
      setContractors(Array.isArray(contractorResult?.data) ? contractorResult.data : []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load production data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canCorrectShift, canGrantProductionEdit, role]);

  useEffect(() => {
    loadScreen(true);
  }, [loadScreen]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refresh = () => loadScreen(false);

    socket.on("production_updated", refresh);
    socket.on("shift_updated", refresh);
    socket.on("plant_status_updated", refresh);
    socket.on("production_planning_updated", refresh);
    socket.on("production_edit_grant_updated", refresh);
    socket.on("labour_weights_updated", refresh);
    socket.on("contractors_updated", refresh);

    return () => {
      socket.off("production_updated", refresh);
      socket.off("shift_updated", refresh);
      socket.off("plant_status_updated", refresh);
      socket.off("production_planning_updated", refresh);
      socket.off("production_edit_grant_updated", refresh);
      socket.off("labour_weights_updated", refresh);
      socket.off("contractors_updated", refresh);
    };
  }, [loadScreen]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return rows;

    return rows.filter((row) =>
      [row.sr_no, row.challan_no, row.party_name, row.material].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      ),
    );
  }, [query, rows]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (result, row) => {
          const qty = Number(row.dipping_qty) || 0;
          const ms = Number(row.ms_weight) || 0;
          const gi = Number(row.gi_weight) || 0;
          result.qty += qty;
          result.ms += qty * ms;
          result.gi += qty * gi;
          return result;
        },
        { qty: 0, ms: 0, gi: 0 },
      ),
    [rows],
  );

  const zincPercent = totals.ms
    ? ((totals.gi - totals.ms) / totals.ms) * 100
    : 0;

  const formZinc = useMemo(() => {
    const ms = Number(form.ms_weight);
    const gi = Number(form.gi_weight);
    return ms > 0 && gi > 0 ? ((gi - ms) / ms) * 100 : null;
  }, [form.gi_weight, form.ms_weight]);

  const averageCoating = useMemo(() => {
    const values = [form.c1, form.c2, form.c3, form.c4, form.c5]
      .filter((value) => value !== "")
      .map(Number)
      .filter((value) => Number.isFinite(value) && value >= 0);
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }, [form.c1, form.c2, form.c3, form.c4, form.c5]);

  const openNewEntry = async () => {
    setError("");
    setNotice("");
    const selected = planning.find((item) => String(item.planning_item_id) === defaultPlanningId);
    let pending;
    try {
      const response = await getPendingLabourWeightsApi();
      pending = Array.isArray(response?.data) ? response.data : [];
    } catch {
      pending = [];
    }
    const queued = pending[0];
    setForm({
      ...EMPTY_FORM,
      sr_no: String(nextSrNo),
      planning_item_id: selected ? String(selected.planning_item_id) : "",
      planning_id: selected ? String(selected.planning_id) : "",
      challan_no: selected?.challan_no || "",
      party_name: selected?.party_name || "",
      material: selected?.material_description || "",
      labour_weight_id: queued?.id || null,
      ms_weight: queued ? String(queued.ms_weight) : "",
      dipping_qty: queued ? String(queued.dipping_qty) : "",
    });
    setModalOpen(true);
  };

  const fillFromRow = (row) => {
    setForm({
      entry_id: row.id,
      labour_weight_id: null,
      sr_no: String(row.sr_no ?? ""),
      planning_item_id: String(row.planning_item_id ?? ""),
      planning_id: String(row.planning_id ?? ""),
      challan_no: row.challan_no || "",
      party_name: row.party_name || "",
      material: row.material || "",
      production_time: String(row.production_time || "").slice(0, 5),
      dipping_qty: String(row.dipping_qty ?? ""),
      kettle_temperature: String(row.kettle_temperature ?? ""),
      ms_weight: String(row.ms_weight ?? ""),
      gi_weight: String(row.gi_weight ?? ""),
      c1: String(row.c1 ?? ""),
      c2: String(row.c2 ?? ""),
      c3: String(row.c3 ?? ""),
      c4: String(row.c4 ?? ""),
      c5: String(row.c5 ?? ""),
      contractor_id: String(row.contractor_id ?? ""),
    });
  };

  const editRow = (row) => {
    fillFromRow(row);
    setModalOpen(true);
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const discardUsedLabourWeight = async () => {
    if (!form.labour_weight_id) return;
    try {
      await consumeLabourWeightApi(form.labour_weight_id);
      const response = await getPendingLabourWeightsApi();
      const next = Array.isArray(response?.data) ? response.data[0] : null;
      setForm((current) => ({
        ...current,
        labour_weight_id: next?.id || null,
        ms_weight: next ? String(next.ms_weight) : "",
        dipping_qty: next ? String(next.dipping_qty) : "",
      }));
      setNotice("The used labour weight was removed from the pending queue.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not remove the used labour weight.");
    }
  };

  const selectPlanning = (planningItemId) => {
    const selected = planning.find(
      (item) => String(item.planning_item_id) === String(planningItemId),
    );

    setForm((current) => ({
      ...current,
      planning_item_id: planningItemId,
      planning_id: selected ? String(selected.planning_id) : "",
      challan_no: selected?.challan_no || "",
      party_name: selected?.party_name || "",
      material: selected?.material_description || "",
    }));
  };

  const selectedPlan = planning.find((item) => String(item.planning_item_id) === String(form.planning_item_id));

  const toggleDefaultChallan = async () => {
    const next = String(defaultPlanningId) === String(form.planning_item_id) ? null : Number(form.planning_item_id);
    const result = await setDefaultChallanApi(next);
    setDefaultPlanningId(next ? String(next) : "");
    setNotice(result?.message || "Default challan updated.");
  };

  const openGrantPopup = (row) => {
    setGrantRow(row);
    setSelectedGrantUser(String(row.editable_user_id || ""));
    setGrantError("");
  };

  const grantEdit = async () => {
    if (!selectedGrantUser || !grantRow) {
      setGrantError("Select an active user before unlocking this SR row.");
      return;
    }
    setGrantSaving(true);
    setGrantError("");
    try {
      const result = await grantProductionEditApi({
        id: grantRow.id,
        user_id: Number(selectedGrantUser),
      });
      setNotice(result?.message || `SR ${grantRow.sr_no} is editable once.`);
      setGrantRow(null);
      setSelectedGrantUser("");
      await loadScreen(false);
    } catch (requestError) {
      setGrantError(
        requestError?.response?.data?.message || "Could not grant edit access.",
      );
    } finally {
      setGrantSaving(false);
    }
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      (!form.entry_id && !form.planning_item_id) ||
      !form.challan_no ||
      !form.production_time ||
      !form.dipping_qty
    ) {
      setError(
        "Select a challan and enter time and dipping quantity.",
      );
      return;
    }

    const qty = Number(form.dipping_qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Dipping quantity must be a whole number greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        entry_id: form.entry_id || 0,
        sr_no: form.entry_id ? form.sr_no : String(nextSrNo),
        entry_type: "full",
        dipping_qty: qty,
        production_time: `${form.production_time}:00`,
      };
      const result = await saveProductionApi(payload);
      if (form.labour_weight_id && !form.entry_id) {
        await consumeLabourWeightApi(form.labour_weight_id).catch((requestError) => {
          if (requestError?.response?.status !== 409) throw requestError;
        });
      }
      setNotice(result?.message || "Production entry saved successfully.");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await loadScreen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to save production entry.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (row) => {
    if (!window.confirm(`Delete production entry SR ${row.sr_no}?`)) return;

    try {
      await deleteProductionApi(row.id);
      setNotice(`SR ${row.sr_no} deleted successfully.`);
      await loadScreen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to delete this entry.",
      );
    }
  };

  const addZinc = async (event) => {
    event.preventDefault();
    const amount = Number(zincKg);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter zinc kilograms greater than zero.");
    setZincSaving(true);
    try {
      const stock = (await getZincTransferContextApi()).data;
      const result = await saveZincMovementApi({ action: "transfer", amount_kg: amount, note: "Added from live production", expected_revision: stock.revision, request_id: `web_zinc_${Date.now()}_${Math.random().toString(36).slice(2)}` });
      setNotice(result.message || `${amount} kg zinc added to kettle.`);
      setZincOpen(false);
      setZincKg("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not add zinc to kettle.");
    } finally { setZincSaving(false); }
  };

  if (loading) {
    return (
      <div className="production-loader">
        <RefreshCw className="spinning" size={28} />
        Loading live production...
      </div>
    );
  }

  return (
    <div className="production-screen">
      <section className="production-toolbar">
        <div>
          <span className="screen-overline">LIVE PRODUCTION</span>
          <h2>Shift production entries</h2>
          <p>SR number-wise dipping, weight and coating data</p>
        </div>

        <div className="production-toolbar-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => loadScreen(false)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "spinning" : ""} size={16} />
            Refresh
          </button>

          {canAddProduction && (
            <button
              className="primary-button"
              type="button"
              onClick={openNewEntry}
            >
              <Plus size={17} />
              Add production
            </button>
          )}
          {canCorrectShift && !shiftData.correction_active && <button className="secondary-button" type="button" onClick={async()=>{setCorrectionOpen(true);setCorrectionShifts((await getPreviousShiftsApi(correctionDate)).data||[])}}>Correct previous shift</button>}
          {canCorrectShift && shiftData.correction_active && <button className="secondary-button" type="button" onClick={async()=>{await resumeShiftCorrectionApi(shiftData.shift_revision);await loadScreen(false)}}>Close shift correction</button>}
          {hasPermission(user, 'chat.view') && <button className="secondary-button production-chat-button" type="button" onClick={() => navigate('/production/chat')}><MessageCircle size={17} /> Chat{unreadChatCount > 0 && <span className="production-chat-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}</button>}
          {canAddZinc && (
            <button className="secondary-button" type="button" onClick={() => { setError(""); setZincOpen(true); }}>
              <PackagePlus size={17} /> Add zinc
            </button>
          )}
        </div>
      </section>
      {correctionOpen && <div className="production-modal-backdrop"><div className="production-modal"><button className="modal-close" onClick={()=>setCorrectionOpen(false)}><X size={18}/></button><h3>Correct previous shift</h3><p>Select the user who will work on the previous shift. Other users remain on live production.</p><label className="production-field"><span>Production date</span><input type="date" value={correctionDate} onChange={async e=>{setCorrectionDate(e.target.value);setCorrectionShift('');setCorrectionShifts((await getPreviousShiftsApi(e.target.value)).data||[])}}/></label><label className="production-field"><span>User</span><select value={correctionUser} onChange={e=>setCorrectionUser(e.target.value)}><option value="">Select user</option>{activeUsers.filter(x=>x.role!=='labour').map(x=><option key={x.id} value={x.id}>{x.name} ({x.role})</option>)}</select></label><label className="production-field"><span>Previous shift</span><select value={correctionShift} onChange={e=>setCorrectionShift(e.target.value)}><option value="">Select shift</option>{correctionShifts.map(x=><option key={x.id} value={x.id}>{String(x.shift_name).toUpperCase()} · {x.entry_count} entries</option>)}</select></label><button className="primary-button" disabled={!correctionUser||!correctionShift} onClick={async()=>{await openShiftCorrectionApi({shift_id:Number(correctionShift),user_id:Number(correctionUser),revision:shiftData.shift_revision});setCorrectionOpen(false);await loadScreen(false)}}>Open correction</button></div></div>}

      {error && !modalOpen && (
        <div className="production-message error">
          <AlertTriangle size={18} /> {error}
        </div>
      )}
      {notice && !modalOpen && (
        <div className="production-message success">{notice}</div>
      )}
      <section
        className={`production-shift-banner ${productionAllowed ? "active" : "blocked"}`}
      >
        <div className="shift-banner-icon">
          <Factory size={22} />
        </div>
        <div>
          <span>{activeShift ? "CURRENT SHIFT" : "SHIFT STATUS"}</span>
          <strong>
            {activeShift
              ? `${String(activeShift.shift_name || shiftData.current_shift).toUpperCase()} SHIFT ACTIVE`
              : "NO ACTIVE SHIFT"}
          </strong>
          <small>
            {!productionAllowed
              ? `Plant ${plantStatus}: production entry is blocked.`
              : activeShift
                ? `Shift date ${formatDisplayDate(activeShift.shift_date)}`
                : "Refresh to check the automatic shift."}
          </small>
        </div>
        <span className="role-badge">{role.replace("_", " ") || "user"}</span>
      </section>

      <section className="production-metrics">
        <article>
          <Weight />
          <span>
            MS production<strong>{number(totals.ms)} kg</strong>
          </span>
        </article>
        <article>
          <Factory />
          <span>
            GI production<strong>{number(totals.gi)} kg</strong>
          </span>
        </article>
        <article>
          <Gauge />
          <span>
            Zinc consumption
            <strong className={zincPercent > 7.5 ? "danger" : ""}>
              {number(zincPercent)}%
            </strong>
          </span>
        </article>
        <article>
          <Clock3 />
          <span>
            Dipping quantity<strong>{number(totals.qty, 0)} NOS</strong>
          </span>
        </article>
      </section>

      <section className="production-table-card">
        <div className="production-table-heading">
          <div>
            <h3>Production table</h3>
            <span>{rows.length} entries in current shift</span>
          </div>
          <label className="production-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search SR, challan, party or material"
            />
          </label>
        </div>

        <div className="production-table-wrapper">
          <table className="production-table">
            <thead>
              <tr>
                <th>SR</th>
                <th>Challan</th>
                <th>Party name</th>
                <th>Material</th>
                <th>Contractor</th>
                <th>Time</th>
                <th>Qty</th>
                <th>Temp</th>
                <th>MS</th>
                <th>GI</th>
                <th>Zn %</th>
                {canViewProductionCost && <th>Production Cost</th>}
                <th>C1</th>
                <th>C2</th>
                <th>C3</th>
                <th>C4</th>
                <th>C5</th>
                <th>Avg</th>
                {canUseRowActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? (
                visibleRows.map((row) => (
                  <tr key={row.id || row.sr_no}>
                    <td>
                      <strong>{row.sr_no}</strong>
                    </td>
                    <td>{row.challan_no || "-"}</td>
                    <td>{row.party_name || "-"}</td>
                    <td>{row.material || "-"}</td>
                    <td>{row.contractor_name || "-"}</td>
                    <td>{time12(row.production_time)}</td>
                    <td>{number(row.dipping_qty, 0)}</td>
                    <td>
                      {row.kettle_temperature
                        ? `${number(row.kettle_temperature)}°C`
                        : "-"}
                    </td>
                    <td>
                      {row.ms_weight != null
                        ? `${number(row.ms_weight, 3)} kg`
                        : "-"}
                    </td>
                    <td>
                      {row.gi_weight != null
                        ? `${number(row.gi_weight, 3)} kg`
                        : "-"}
                    </td>
                    <td>
                      <span
                        className={
                          Number(row.zinc_percentage) > 7.5
                            ? "table-zinc danger"
                            : "table-zinc"
                        }
                      >
                        {row.zinc_percentage != null
                          ? `${number(row.zinc_percentage)}%`
                          : "-"}
                      </span>
                    </td>
                    {canViewProductionCost && <td>{row.production_cost != null ? `₹${number(row.production_cost)}/kg` : "-"}</td>}
                    {["c1", "c2", "c3", "c4", "c5"].map((key) => (
                      <td key={key}>{number(row[key])}</td>
                    ))}
                    <td>
                      <strong>{number(row.avg_coating)} µm</strong>
                    </td>
                    {canUseRowActions && (
                      <td>
                        <div className="row-actions">
                          {(canManageAllProduction || Boolean(row.can_edit)) && <button
                            type="button"
                            onClick={() => editRow(row)}
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>}
                          {canManageAllProduction && (
                            <button
                              type="button"
                              onClick={() => openGrantPopup(row)}
                              title="Unlock once for an active user"
                            >
                              <LockKeyhole size={15} />
                            </button>
                          )}
                          {canGrantProductionEdit && (
                            <button
                              className="delete"
                              type="button"
                              onClick={() => deleteEntry(row)}
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="empty-row" colSpan={canUseRowActions ? 18 : 17}>
                    No production entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div
          className="production-modal-backdrop"
          role="presentation"
          onMouseDown={() => setModalOpen(false)}
        >
          <section
            className="production-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="production-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="screen-overline">UNIFIED FORM</span>
                <h2 id="production-modal-title">Production entry</h2>
                <p>Add or update all data by SR number</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={saveEntry}>
              {error && (
                <div className="production-message error">
                  <AlertTriangle size={18} /> {error}
                </div>
              )}

              <fieldset>
                <legend>Production details</legend>
                <div className="production-form-grid">
                  <Field
                    label="SR No (automatic)"
                    type="number"
                    min="1"
                    value={form.sr_no}
                    readOnly
                  />
                  <label className="production-field production-span-2">
                    <span>Challan No</span>
                    <select
                      value={form.planning_item_id}
                      onChange={(event) => selectPlanning(event.target.value)}
                      required
                    >
                      <option value="">Select available challan</option>
                      {form.planning_item_id &&
                        !planning.some(
                          (item) =>
                            String(item.planning_item_id) === String(form.planning_item_id),
                        ) && (
                          <option value={form.planning_item_id}>
                            {form.challan_no} | {form.party_name} | Existing
                            entry
                          </option>
                        )}
                      {planning.map((item) => (
                        <option key={item.planning_item_id} value={item.planning_item_id}>
                          {item.challan_no} | {item.party_name} | Balance{" "}
                          {item.remaining_qty} NOS
                        </option>
                      ))}
                    </select>
                    {selectedPlan && (
                      <small className="planning-balance">
                        Planned: {number(selectedPlan.planned_qty, 0)} NOS · Completed: {number(selectedPlan.completed_qty, 0)} NOS · Remaining: {number(selectedPlan.remaining_qty, 0)} NOS
                      </small>
                    )}
                    {role === "supervisor" && form.planning_item_id && (
                      <button className="secondary-button" type="button" onClick={toggleDefaultChallan}>
                        {String(defaultPlanningId) === String(form.planning_item_id) ? "Remove default challan" : "Make this challan default"}
                      </button>
                    )}
                  </label>
                  <Field label="Party Name" value={form.party_name} readOnly />
                  <Field
                    label="Material Description"
                    className="production-span-2"
                    value={form.material}
                    readOnly
                  />
                  <Field
                    label="Production Time"
                    type="time"
                    value={form.production_time}
                    onChange={(event) =>
                      updateField("production_time", event.target.value)
                    }
                    required
                  />
                  <label className="production-field">
                    <span>Contractor</span>
                    <select value={form.contractor_id} onChange={(event) => updateField("contractor_id", event.target.value)}>
                      <option value="">Select contractor</option>
                      {contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <Field
                    label="Dipping Qty"
                    type="number"
                    min="1"
                    step="1"
                    value={form.dipping_qty}
                    readOnly={Boolean(form.labour_weight_id)}
                    onChange={(event) =>
                      updateField("dipping_qty", event.target.value)
                    }
                    required
                  />
                  {form.labour_weight_id ? (
                    <button className="secondary-button" type="button" onClick={discardUsedLabourWeight}>
                      Remove stale used weight
                    </button>
                  ) : null}
                  <Field
                    label="Kettle Temperature °C"
                    type="number"
                    step="0.01"
                    value={form.kettle_temperature}
                    onChange={(event) =>
                      updateField("kettle_temperature", event.target.value)
                    }
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend>Weight details</legend>
                <div className="production-form-grid">
                  <Field
                    label="MS Weight 1 Nos (kg)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.ms_weight}
                    readOnly={Boolean(form.labour_weight_id)}
                    onChange={(event) =>
                      updateField("ms_weight", event.target.value)
                    }
                  />
                  <Field
                    label="GI Weight 1 Nos (kg)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.gi_weight}
                    onChange={(event) =>
                      updateField("gi_weight", event.target.value)
                    }
                  />
                  <div className="calculated-field">
                    <span>Zinc consumption</span>
                    <strong className={formZinc > 7.5 ? "danger" : ""}>
                      {formZinc == null ? "-" : `${number(formZinc)}%`}
                    </strong>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Coating details</legend>
                <div className="coating-grid">
                  {["c1", "c2", "c3", "c4", "c5"].map((key, index) => (
                    <Field
                      key={key}
                      label={`C${index + 1} (µm)`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[key]}
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  ))}
                  <div className="calculated-field">
                    <span>Average coating</span>
                    <strong>
                      {averageCoating == null
                        ? "-"
                        : `${number(averageCoating)} µm`}
                    </strong>
                  </div>
                </div>
              </fieldset>

              <footer>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save production entry"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {grantRow && (
        <div
          className="production-modal-backdrop"
          role="presentation"
          onMouseDown={() => !grantSaving && setGrantRow(null)}
        >
          <section
            className="production-modal production-grant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="production-grant-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="screen-overline">ONE-TIME EDIT ACCESS</span>
                <h2 id="production-grant-title">Unlock SR {grantRow.sr_no}</h2>
                <p>The Edit button will disappear after one successful update.</p>
              </div>
              <button
                type="button"
                onClick={() => setGrantRow(null)}
                disabled={grantSaving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </header>
            <div className="production-grant-body">
              {grantError && (
                <div className="production-message error">
                  <AlertTriangle size={18} /> {grantError}
                </div>
              )}
              <label className="production-field">
                <span>Active user</span>
                <select
                  value={selectedGrantUser}
                  onChange={(event) => setSelectedGrantUser(event.target.value)}
                  autoFocus
                >
                  <option value="">Select user</option>
                  {activeUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({String(item.role).replace("_", " ")})
                    </option>
                  ))}
                </select>
              </label>
              {grantRow.editable_user_name && (
                <small className="production-grant-current">
                  Currently unlocked for {grantRow.editable_user_name}. Saving a new
                  user will replace that permission.
                </small>
              )}
              <footer>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setGrantRow(null)}
                  disabled={grantSaving}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={grantEdit}
                  disabled={grantSaving || !selectedGrantUser}
                >
                  <LockKeyhole size={16} />
                  {grantSaving ? "Saving..." : "Unlock for one edit"}
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
      {zincOpen && (
        <div className="production-modal-backdrop" role="presentation" onMouseDown={() => !zincSaving && setZincOpen(false)}>
          <section className="production-modal production-grant-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="screen-overline">ZINC STOCK</span><h2>Add zinc to kettle</h2><p>The same quantity will be deducted from plant stock.</p></div><button type="button" onClick={() => setZincOpen(false)}><X size={20}/></button></header>
            <form onSubmit={addZinc}><div className="production-grant-body"><Field label="Zinc kg" type="number" min="0.001" step="0.001" value={zincKg} onChange={(event) => setZincKg(event.target.value)} autoFocus required/><footer><button className="secondary-button" type="button" onClick={() => setZincOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={zincSaving}>{zincSaving?"Saving…":"Save zinc"}</button></footer></div></form>
          </section>
        </div>
      )}
    </div>
  );
}
