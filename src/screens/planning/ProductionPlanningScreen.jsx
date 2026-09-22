import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  cancelProductionPlanningApi,
  createProductionPlanningApi,
  getProductionPlanningApi,
  updateProductionPlanningApi,
} from "../../api/productionPlanningApi";
import socket from "../../socket/socket";
import "./ProductionPlanningScreen.css";

const emptyForm = {
  challan_no: "",
  party_name: "",
  material_description: "",
  planned_qty: "",
  third_party_name: "",
  target_zinc_percentage: "",
  status: "pending",
};

const formatQuantity = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })
    : "0";
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return error?.response?.data?.message || error?.message || fallback;
};

function StatusBadge({ status }) {
  const currentStatus = String(status || "pending").toLowerCase();

  const labels = {
    pending: "Pending",
    completed: "Completed",
    canceled: "Canceled",
  };

  const icons = {
    pending: Clock3,
    completed: CheckCircle2,
    canceled: Ban,
  };

  const Icon = icons[currentStatus] || Clock3;

  return (
    <span className={`planning-status ${currentStatus}`}>
      <Icon size={12} strokeWidth={2.2} />

      {labels[currentStatus] || currentStatus}
    </span>
  );
}

function PlanningModal({
  visible,
  editingItem,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}) {
  if (!visible) {
    return null;
  }

  const completedQuantity = Number(editingItem?.completed_qty || 0);

  const plannedQuantity = Number(form.planned_qty || 0);

  const remainingQuantity = Math.max(plannedQuantity - completedQuantity, 0);

  return (
    <div
      className="planning-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        className="planning-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-modal-title"
      >
        <header className="planning-modal-header">
          <div>
            <span className="planning-overline">PRODUCTION PLANNING</span>

            <h2 id="planning-modal-title">
              {editingItem ? "Update planning" : "Add new planning"}
            </h2>

            <p>Enter challan, party, material and quantity details.</p>
          </div>

          <button
            className="planning-modal-close"
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="planning-modal-body">
          <div className="planning-form-grid">
            <label className="planning-field">
              <span>
                Challan number
                <small>*</small>
              </span>

              <input
                type="text"
                value={form.challan_no}
                placeholder="Enter challan number"
                onChange={(event) => onChange("challan_no", event.target.value)}
              />
            </label>

            <label className="planning-field">
              <span>Target zinc percentage</span>
              <div className="planning-quantity-input">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={form.target_zinc_percentage}
                  placeholder="Example: 7.50"
                  onChange={(event) => onChange("target_zinc_percentage", event.target.value)}
                />
                <strong>%</strong>
              </div>
            </label>

            <label className="planning-field">
              <span>
                Party name
                <small>*</small>
              </span>

              <input
                type="text"
                value={form.party_name}
                placeholder="Enter party name"
                onChange={(event) => onChange("party_name", event.target.value)}
              />
            </label>

            <label className="planning-field">
              <span>Third-party name</span>

              <input
                type="text"
                value={form.third_party_name}
                placeholder="Optional third-party name"
                onChange={(event) =>
                  onChange("third_party_name", event.target.value)
                }
              />
            </label>

            <label className="planning-field">
              <span>
                Planned quantity
                <small>*</small>
              </span>

              <div className="planning-quantity-input">
                <input
                  type="number"
                  min={Math.max(completedQuantity, 1)}
                  step="1"
                  value={form.planned_qty}
                  placeholder="0"
                  onChange={(event) =>
                    onChange("planned_qty", event.target.value)
                  }
                />

                <strong>NOS</strong>
              </div>
            </label>

            <label className="planning-field planning-full-field">
              <span>
                Material description
                <small>*</small>
              </span>

              <textarea
                rows="4"
                value={form.material_description}
                placeholder="Enter complete material description"
                onChange={(event) =>
                  onChange("material_description", event.target.value)
                }
              />
            </label>

            {editingItem ? (
              <label className="planning-field">
                <span>Planning status</span>

                <select
                  value={form.status}
                  onChange={(event) => onChange("status", event.target.value)}
                >
                  <option value="pending">Pending</option>

                  {editingItem.status === "completed" ? (
                    <option value="completed">Completed</option>
                  ) : null}

                </select>
              </label>
            ) : null}
          </div>

          {editingItem ? (
            <section className="planning-edit-summary">
              <div>
                <span>Completed</span>

                <strong>{formatQuantity(completedQuantity)} NOS</strong>
              </div>

              <div>
                <span>Remaining after update</span>

                <strong>{formatQuantity(remainingQuantity)} NOS</strong>
              </div>
            </section>
          ) : null}

          <div className="planning-modal-actions">
            <button
              className="planning-cancel-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="planning-save-button"
              type="button"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="planning-spinning" size={17} />
              ) : editingItem ? (
                <Edit3 size={17} />
              ) : (
                <Plus size={17} />
              )}

              {saving
                ? "Saving..."
                : editingItem
                  ? "Update planning"
                  : "Save planning"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ProductionPlanningScreen() {
  const [planningList, setPlanningList] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [message, setMessage] = useState(null);

  const user = useMemo(() => getStoredUser(), []);

  const canManage = ["admin", "superadmin", "plant_manager"].includes(
    user?.role,
  );

  const showMessage = useCallback((type, text) => {
    setMessage({
      type,
      text,
    });

    window.setTimeout(() => {
      setMessage(null);
    }, 4000);
  }, []);

  const loadPlanning = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const params =
          statusFilter === "all"
            ? {}
            : {
                status: statusFilter,
              };

        const response = await getProductionPlanningApi(params);

        setPlanningList(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        showMessage(
          "error",
          getErrorMessage(error, "Unable to load production planning."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showMessage, statusFilter],
  );

  useEffect(() => {
    loadPlanning(true);
  }, [loadPlanning]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handlePlanningUpdate = () => {
      loadPlanning(false);
    };

    socket.on("production_planning_updated", handlePlanningUpdate);

    return () => {
      socket.off("production_planning_updated", handlePlanningUpdate);
    };
  }, [loadPlanning]);

  const filteredPlanning = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return planningList;
    }

    return planningList.filter((item) => {
      return [
        item.challan_no,
        item.party_name,
        item.third_party_name,
        item.material_description,
        item.created_by_name,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(searchText),
      );
    });
  }, [planningList, search]);

  const updateForm = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);

    setForm({
      challan_no: item.challan_no || "",
      party_name: item.party_name || "",
      material_description: item.material_description || "",
      planned_qty: String(item.planned_qty || ""),
      third_party_name: item.third_party_name || "",
      target_zinc_percentage: String(item.target_zinc_percentage ?? ""),
      status: item.status || "pending",
    });

    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const plannedQuantity = Number(form.planned_qty);

    if (
      !form.challan_no.trim() ||
      !form.party_name.trim() ||
      !form.material_description.trim() ||
      !form.planned_qty
    ) {
      showMessage("error", "Please fill all required fields.");

      return;
    }

    if (!Number.isInteger(plannedQuantity) || plannedQuantity <= 0) {
      showMessage("error", "Planned quantity must be a positive whole number.");

      return;
    }

    if (
      editingItem &&
      plannedQuantity < Number(editingItem.completed_qty || 0)
    ) {
      showMessage(
        "error",
        `Planned quantity cannot be below completed quantity (${formatQuantity(
          editingItem.completed_qty,
        )} NOS).`,
      );

      return;
    }

    const body = {
      challan_no: form.challan_no.trim(),
      party_name: form.party_name.trim(),
      material_description: form.material_description.trim(),
      planned_qty: plannedQuantity,
      third_party_name: form.third_party_name.trim(),
      target_zinc_percentage: form.target_zinc_percentage === "" ? null : Number(form.target_zinc_percentage),
      status: form.status,
    };

    setSaving(true);

    try {
      const response = editingItem
        ? await updateProductionPlanningApi({
            id: editingItem.id,
            body,
          })
        : await createProductionPlanningApi(body);

      showMessage("success", response?.message || "Production planning saved.");

      closeModal();
      await loadPlanning(false);
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to save production planning."),
      );
    } finally {
      setSaving(false);
      setModalVisible(false);
      setEditingItem(null);
      setForm(emptyForm);
    }
  };

  const handleCancelPlanning = async (item) => {
    const confirmed = window.confirm(
      `Permanently remove challan ${item.challan_no} from production planning? Existing production history will be preserved.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await cancelProductionPlanningApi(item.id);

      showMessage(
        "success",
        response?.message || "Production planning deleted.",
      );

      await loadPlanning(false);
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(error, "Unable to delete planning."),
      );
    }
  };

  return (
    <div className="planning-screen">
      <div className="planning-toolbar">
        <div>
          <span className="planning-overline">PRODUCTION MANAGEMENT</span>

          <h2>Production planning</h2>

          <p>Create and manage challan-wise production targets.</p>
        </div>

        <div className="planning-toolbar-actions">
          <button
            className="planning-refresh-button"
            type="button"
            onClick={() => loadPlanning(false)}
            disabled={refreshing}
          >
            <RefreshCw
              className={refreshing ? "planning-spinning" : ""}
              size={17}
            />
            Refresh
          </button>

          {canManage ? (
            <button
              className="planning-add-button"
              type="button"
              onClick={openAddModal}
            >
              <Plus size={17} />
              Add planning
            </button>
          ) : null}
        </div>
      </div>

      {message ? (
        <div className={`planning-message ${message.type}`}>
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

      <section className="planning-content-card">
        <div className="planning-filter-row">
          <div className="planning-search">
            <Search size={17} />

            <input
              type="search"
              value={search}
              placeholder="Search challan, party or material..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="planning-status-filters">
            {[
              ["all", "All"],
              ["pending", "Pending"],
              ["completed", "Completed"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? "active" : ""}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="planning-loader">
            <RefreshCw className="planning-spinning" size={29} />

            <span>Loading production planning...</span>
          </div>
        ) : filteredPlanning.length ? (
          <div className="planning-table-wrapper">
            <table className="planning-table">
              <thead>
                <tr>
                  <th>Challan</th>
                  <th>Party</th>
                  <th>Material</th>
                  <th>Planned</th>
                  <th>Completed</th>
                  <th>Remaining</th>
                  <th>Target Zn %</th>
                  <th>Status</th>
                  <th>Created by</th>

                  {canManage ? <th>Actions</th> : null}
                </tr>
              </thead>

              <tbody>
                {filteredPlanning.map((item) => {
                  const partyName = item.third_party_name
                    ? `${item.party_name} (${item.third_party_name})`
                    : item.party_name;

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong className="planning-challan">
                          {item.challan_no}
                        </strong>
                      </td>

                      <td>
                        <strong>{partyName || "-"}</strong>
                      </td>

                      <td>
                        <span className="planning-material">
                          {item.material_description || "-"}
                        </span>
                      </td>

                      <td>{formatQuantity(item.planned_qty)} NOS</td>

                      <td className="planning-completed-value">
                        {formatQuantity(item.completed_qty)} NOS
                      </td>

                      <td className="planning-remaining-value">
                        {formatQuantity(item.remaining_qty)} NOS
                      </td>

                      <td>{item.target_zinc_percentage == null ? "-" : `${item.target_zinc_percentage}%`}</td>

                      <td>
                        <StatusBadge status={item.status} />
                      </td>

                      <td>{item.created_by_name || "-"}</td>

                      {canManage ? (
                        <td>
                          <div className="planning-row-actions">
                            <button
                              className="planning-edit-button"
                              type="button"
                              title="Edit planning"
                              onClick={() => openEditModal(item)}
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              className="planning-delete-button"
                              type="button"
                              title="Delete planning"
                              onClick={() => handleCancelPlanning(item)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="planning-empty-state">
            <ClipboardList size={38} />

            <strong>No production planning found</strong>

            <span>
              {search
                ? "Try another search value."
                : "Add a planning entry to get started."}
            </span>
          </div>
        )}

        {!loading ? (
          <footer className="planning-table-footer">
            Showing <strong>{filteredPlanning.length}</strong> planning entries
          </footer>
        ) : null}
      </section>

      <PlanningModal
        visible={modalVisible}
        editingItem={editingItem}
        form={form}
        saving={saving}
        onChange={updateForm}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  );
}
