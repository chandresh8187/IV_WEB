import LoadingIndicator from "../../components/LoadingIndicator";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  returnGasBottleApi,
  changeGasBottleApi,
  fillGasPositionApi,
  getGasDashboardApi,
  receiveGasBottlesApi,
  startGasBottleApi,
  updateGasPositionStartTimeApi,
  updateGasPositionWeightApi,
} from "../../api/gasManagementApi";
import { getStoredUser, hasPermission } from "../../utils/permissions";
import socket from "../../socket/socket";
import GasDateTimePicker from "../../components/GasDateTimePicker";
import moment from "moment";
import "./Operations.css";
import "./GasManagementScreen.css";

const nowSql = () => {
  return moment().format("YYYY-MM-DD HH:mm:ss");
};
const localInput = (value) => {
  if (value && /(?:Z|[+-]\d\d:\d\d)$/.test(String(value))) {
    const parsed = moment(value);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DDTHH:mm");
  }
  return String(value || nowSql())
    .replace(" ", "T")
    .slice(0, 16);
};
const sqlInput = (value) => `${value.replace("T", " ")}:00`;

const refreshPositionDialog = (dialog, positions) => {
  if (dialog?.type !== "position" || !dialog.bottle) return dialog;
  const current = positions.find(b => Number(b.position_no) === dialog.position);
  if (current?.id !== dialog.bottle.id) return null;
  if (current === dialog.bottle) return dialog;
  return { ...dialog, bottle: current };
};

export default function GasManagementScreen() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const canManage = hasPermission(user, "gas.manage");
  const [data, setData] = useState({ summary: {}, positions: [] });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ bottle_count: "", rate_per_kg: "" });
  const [returnTime, setReturnTime] = useState(localInput());
  const [returnReason, setReturnReason] = useState("");
  const [returnKey, setReturnKey] = useState("");
  const [stockBottle, setStockBottle] = useState("");
  const [filledWeight, setFilledWeight] = useState("");
  const [emptyWeight, setEmptyWeight] = useState("");
  const [startTime, setStartTime] = useState(localInput());
  const [nextPosition, setNextPosition] = useState("");
  const [startWithPlacement, setStartWithPlacement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const latest = (await getGasDashboardApi()).data;
      setData(latest);
      setDialog(current => refreshPositionDialog(current, latest.positions || []));
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load gas stock.");
    }
  }, []);
  useEffect(() => {
    load();
    socket.on("gas_management_updated", load);
    return () => socket.off("gas_management_updated", load);
  }, [load]);
  const receive = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await receiveGasBottlesApi({
        bottle_count: Number(form.bottle_count),
        rate_per_kg: Number(form.rate_per_kg),
      });
      setNotice(result.message);
      setForm({ bottle_count: "", rate_per_kg: "" });
      setDialog(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not save bottle stock.");
    } finally {
      setBusy(false);
    }
  };
  const fill = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await fillGasPositionApi(
        dialog.position,
        Number(filledWeight),
        dialog.pending ? Number(emptyWeight) : undefined,
        startWithPlacement ? sqlInput(startTime) : undefined,
        stockBottle || undefined
      );
      setNotice(result.message);
      setDialog(null);
      setFilledWeight("");
      setEmptyWeight("");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not place the bottle.");
    } finally {
      setBusy(false);
    }
  };
  const correctWeight = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await updateGasPositionWeightApi(
        dialog.position,
        Number(filledWeight)
      );
      setNotice(result.message);
      setDialog(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not save filled weight.");
    } finally {
      setBusy(false);
    }
  };
  const start = async (position) => {
    setBusy(true);
    setError("");
    try {
      const result = await startGasBottleApi({
        position_no: position,
        started_at: sqlInput(startTime),
      });
      setNotice(result.message);
      setDialog(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not start gas supply.");
    } finally {
      setBusy(false);
    }
  };
  const saveStartTime = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await updateGasPositionStartTimeApi(
        dialog.position,
        sqlInput(startTime)
      );
      setNotice(result.message);
      setDialog(null);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not save gas supply start time."
      );
    } finally {
      setBusy(false);
    }
  };
  const pause = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await changeGasBottleApi({
        bottle_number: Number(nextPosition),
        changed_at: nowSql(),
        finish_reason: "paused",
      });
      setNotice(result.message);
      setDialog(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not pause this bottle.");
    } finally {
      setBusy(false);
    }
  };
  const returnToStock = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await returnGasBottleApi(dialog.position, {
        bottle_id: dialog.bottle.id,
        returned_at: sqlInput(returnTime),
        reason: returnReason,
        request_key: returnKey,
      });
      setNotice(result.message);
      setDialog(null);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not return bottle to stock."
      );
    } finally {
      setBusy(false);
    }
  };
  const available = data.available_bottles || [];
  const selectedStock = available.find(
    (b) => String(b.id) === String(stockBottle)
  );
  const summary = data.summary || {};
  const positions = data.positions || [];
  const pendingWeights = data.pending_empty_weights || [];

  return (
    <section className="ops-page">
      <header className="ops-header">
        <div>
          <h2>Gas Stock</h2>
          <p className="ops-muted">
            Receive filled bottles, prepare GAS-1 to GAS-4, and start the gas
            supply.
          </p>
        </div>
        <div className="ops-actions">
          {canManage && (
            <button
              className="ops-button"
              onClick={() => {
                setError("");
                setDialog({ type: "receive" });
              }}
            >
              Add new bottle stock
            </button>
          )}
          <button
            className="ops-button secondary"
            onClick={() => navigate("/production/gas/movements")}
          >
            Gas change movements
          </button>
        </div>
      </header>
      {error && (
        <div className="ops-error" role="alert">
          {error}
        </div>
      )}
      {notice && <div className="ops-success">{notice}</div>}
      {summary.low_stock && (
        <div className="ops-error" role="alert">
          Low gas stock: only {summary.filled_bottles} filled bottle
          {Number(summary.filled_bottles) === 1 ? "" : "s"} remain. Receive new
          bottles soon.
        </div>
      )}
      <div className="ops-grid">
        <div className="ops-metric">
          <small>Filled bottles in plant</small>
          <strong>{summary.filled_bottles || 0}</strong>
        </div>
        <div className="ops-metric">
          <small>Unused bottles in stock</small>
          <strong>
            {summary.stored_unused_bottles ??
              summary.stored_filled_bottles ??
              0}
          </strong>
        </div>
        <div className="ops-metric">
          <small>Current gas rate per kg</small>
          <strong>₹{Number(summary.current_gas_rate || 0).toFixed(2)}</strong>
        </div>
      </div>
      <p className="ops-muted">
        Partly used bottles in stock: {summary.stored_partly_used_bottles || 0}.
        Their remaining gas is not remeasured by a return.
      </p>
      <div className="gas-position-grid">
        {[1, 2, 3, 4].map((number) => {
          const bottle = positions.find(
            (item) => Number(item.position_no) === number
          );
          const pending = pendingWeights.find(
            (item) => Number(item.position_no) === number
          );
          return (
            <button
              type="button"
              key={number}
              disabled={!canManage}
              className={`gas-position-card ${
                bottle?.status === "running" ? "running" : ""
              }`}
              onClick={() => {
                setError("");
                setFilledWeight(
                  bottle?.filled_weight_kg == null
                    ? ""
                    : String(bottle.filled_weight_kg)
                );
                setReturnTime(localInput());
                setReturnReason("");
                setReturnKey("return_" + crypto.randomUUID());
                setStockBottle("");
                setEmptyWeight("");
                setStartTime(localInput(bottle?.started_at));
                setStartWithPlacement(!summary.running_bottle_number);
                setDialog({
                  type: "position",
                  position: number,
                  bottle,
                  pending,
                });
              }}
            >
              <span>GAS-{number}</span>
              <strong>
                {bottle?.status === "running"
                  ? "Running"
                  : bottle?.status === "ready"
                  ? bottle.was_paused
                    ? "Partly used · ready to resume"
                    : "Ready to start"
                  : "Empty slot"}
              </strong>
              <small>
                {bottle
                  ? `${bottle.bottle_code} · Filled weight: ${
                      bottle.filled_weight_kg ?? "Not set"
                    } kg`
                  : pending
                  ? `Previous ${pending.bottle_code}: empty weight required before refill`
                  : canManage
                  ? "Click to place a filled bottle"
                  : "Waiting for filled bottle"}
              </small>
            </button>
          );
        })}
      </div>
      {dialog && (
        <div
          className="gas-modal-overlay"
          role="presentation"
          onMouseDown={() => !busy && setDialog(null)}
        >
          <div
            className="gas-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {dialog.type === "receive" ? (
              <form onSubmit={receive}>
                <h3>Add new bottle stock</h3>
                <label>
                  Number of bottles received
                  <input
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    required
                    value={form.bottle_count}
                    onChange={(e) =>
                      setForm({ ...form, bottle_count: e.target.value })
                    }
                  />
                </label>
                <label>
                  Rate per kg ₹
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.rate_per_kg}
                    onChange={(e) =>
                      setForm({ ...form, rate_per_kg: e.target.value })
                    }
                  />
                </label>
                <p>
                  Nominal bottle capacity: 425 kg. Price per bottle: ₹
                  {(425 * Number(form.rate_per_kg || 0)).toLocaleString(
                    "en-IN",
                    { maximumFractionDigits: 2 }
                  )}
                  .
                </p>
                <div className="ops-actions">
                  <button
                    type="button"
                    className="ops-button secondary"
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button className="ops-button" disabled={busy}>
                    {busy ? (
                      <LoadingIndicator label="Saving…" inline />
                    ) : (
                      "Add new bottle stock"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h3>GAS-{dialog.position}</h3>
                {dialog.bottle ? (
                  <>
                    <p>
                      {dialog.bottle.bottle_code} · Status:{" "}
                      {dialog.bottle.status}
                    </p>
                    {dialog.bottle.status === "ready" && (
                        <form
                          onSubmit={returnToStock}
                          className="gas-return-form"
                        >
                          <h4>Return bottle to stock</h4>
                          <p>
                            {dialog.bottle.was_paused
                              ? "This returns the partly used bottle with its history."
                              : "This returns the unused bottle to stock."}{" "}
                            GAS-{dialog.position} will become an empty slot.
                          </p>
                          <GasDateTimePicker
                            label="Return time"
                            value={returnTime}
                            onChange={setReturnTime}
                          />
                          <label>
                            Return reason
                            <input
                              required
                              maxLength={255}
                              value={returnReason}
                              onChange={(e) => setReturnReason(e.target.value)}
                            />
                          </label>
                          <button
                            className="ops-button secondary"
                            disabled={busy}
                          >
                            {busy
                              ? "Returning…"
                              : "Return to stock and empty slot"}
                          </button>
                        </form>
                      )}
                    <form onSubmit={correctWeight}>
                      <label>
                        Filled bottle weight (kg)
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          required
                          value={filledWeight}
                          onChange={(e) => setFilledWeight(e.target.value)}
                        />
                      </label>
                      <button className="ops-button secondary" disabled={busy}>
                        {busy ? (
                          <LoadingIndicator label="Saving…" inline />
                        ) : (
                          "Save filled weight"
                        )}
                      </button>
                    </form>
                    {dialog.bottle.status === "ready" &&
                      !summary.running_bottle_number && (
                        <>
                          <GasDateTimePicker
                            label="Gas supply start date and time"
                            value={startTime}
                            onChange={setStartTime}
                          />
                          <button
                            className="ops-button"
                            disabled={busy}
                            onClick={() => start(dialog.position)}
                          >
                            {busy ? "Starting…" : "Start gas supply"}
                          </button>
                        </>
                      )}
                    {dialog.bottle.status === "running" && (
                      <>
                        <GasDateTimePicker
                          label="Gas supply start date and time"
                          value={startTime}
                          onChange={setStartTime}
                        />
                        <button
                          className="ops-button secondary"
                          disabled={busy}
                          onClick={saveStartTime}
                        >
                          {busy ? (
                            <LoadingIndicator label="Saving…" inline />
                          ) : (
                            "Save start time"
                          )}
                        </button>
                        <form onSubmit={pause}>
                          <p>
                            If this bottle is only partly used, pause it and
                            start another ready bottle. You can return to this
                            bottle later.
                          </p>
                          <label>
                            Start another bottle
                            <select
                              required
                              value={nextPosition}
                              onChange={(e) => setNextPosition(e.target.value)}
                            >
                              <option value="">Select ready position</option>
                              {positions
                                .filter(
                                  (item) =>
                                    item.status === "ready" &&
                                    Number(item.position_no) !== dialog.position
                                )
                                .map((item) => (
                                  <option
                                    key={item.position_no}
                                    value={item.position_no}
                                  >
                                    GAS-{item.position_no}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <button
                            className="ops-button"
                            disabled={busy || !nextPosition}
                          >
                            {busy ? (
                              <LoadingIndicator label="Saving…" inline />
                            ) : (
                              "Pause bottle and switch"
                            )}
                          </button>
                        </form>
                      </>
                    )}
                  </>
                ) : (
                  <form onSubmit={fill}>
                    <p>
                      Choose an unused or partly used stock bottle for this
                      slot.
                    </p>
                    <label>
                      Stock bottle
                      <select
                        required
                        value={stockBottle}
                        onChange={(e) => {
                          const b = available.find(
                            (b) => String(b.id) === e.target.value
                          );
                          setStockBottle(e.target.value);
                          setFilledWeight(
                            b?.filled_weight_kg == null
                              ? ""
                              : String(b.filled_weight_kg)
                          );
                        }}
                      >
                        <option value="">Select bottle</option>
                        {available.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bottle_code} ·{" "}
                            {b.was_used ? "Partly used" : "Unused"}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedStock?.was_used ? (
                      <p>
                        Original filled weight is retained. No new remaining gas
                        weight is assumed.
                      </p>
                    ) : null}
                    {dialog.pending && (
                      <>
                        <p>
                          First record the empty weight of previous{" "}
                          {dialog.pending.bottle_code} (filled:{" "}
                          {dialog.pending.filled_weight_kg} kg).
                        </p>
                        <label>
                          Previous empty bottle weight (kg)
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            required
                            value={emptyWeight}
                            onChange={(e) => setEmptyWeight(e.target.value)}
                          />
                        </label>
                      </>
                    )}
                    <label>
                      {selectedStock?.was_used
                        ? "Original filled bottle weight (kg)"
                        : "Filled bottle weight (kg)"}
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        readOnly={Boolean(selectedStock?.was_used)}
                        value={filledWeight}
                        onChange={(e) => setFilledWeight(e.target.value)}
                      />
                    </label>
                    {!summary.running_bottle_number && (
                      <>
                        <label>
                          <input
                            type="checkbox"
                            checked={startWithPlacement}
                            onChange={(e) =>
                              setStartWithPlacement(e.target.checked)
                            }
                          />{" "}
                          Start gas supply with this bottle
                        </label>
                        {startWithPlacement && (
                          <GasDateTimePicker
                            label="Gas supply start date and time"
                            value={startTime}
                            onChange={setStartTime}
                          />
                        )}
                      </>
                    )}
                    <button className="ops-button" disabled={busy}>
                      {busy ? (
                        <LoadingIndicator label="Saving…" inline />
                      ) : startWithPlacement ? (
                        "Place and start gas supply"
                      ) : (
                        "Place filled bottle"
                      )}
                    </button>
                  </form>
                )}
                <div className="ops-actions">
                  <button
                    className="ops-button secondary"
                    onClick={() => setDialog(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="ops-error" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
