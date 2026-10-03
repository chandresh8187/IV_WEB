import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import moment from 'moment';
import { downloadGasReportApi, getGasDashboardApi } from "../../api/gasManagementApi";
import { downloadResponse } from "../../utils/download";
import { hasPermission, getStoredUser } from "../../utils/permissions";
import { formatPlantDateTimeSeconds } from "../../utils/dateTime";
import socket from "../../socket/socket";
import "./Operations.css";

const fmt = value => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const plantDateTime = value => {
  if (!value) return 'Running';
  return formatPlantDateTimeSeconds(value, '-');
};
const duration = (start, finish) => {
  if (!finish) return 'Running';
  const seconds = Math.max(0, Math.floor(moment(finish).diff(moment(start), 'seconds', true)));
  if (!Number.isFinite(seconds)) return '-';
  const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60);
  return `${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${seconds % 60}s`;
};
const secondsDuration = seconds => {
  if (seconds == null) return '-';
  const value = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m ${value % 60}s`;
};
const nextBottle = run => {
  if (!run.finished_at || !run.note) return '-';
  const number = String(run.note).match(/bottle (\d+) started/i)?.[1];
  return number ? `GAS-${number}` : '-';
};

export default function GasChangeMovementsScreen() {
  const navigate = useNavigate(); const canReport = hasPermission(getStoredUser(), "gas.report"); const [data, setData] = useState({ runs: [] }); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setData((await getGasDashboardApi()).data); setError(""); } catch (e) { setError(e.response?.data?.message || "Could not load gas movements."); } }, []);
  useEffect(() => { load(); socket.on("gas_management_updated", load); return () => socket.off("gas_management_updated", load); }, [load]);
  const generateReport = async () => {
    try { setError(''); downloadResponse(await downloadGasReportApi(), 'gas-stock-report.pdf'); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not generate gas stock report.'); }
  };
  return <section className="ops-page"><header className="ops-header"><div><h2>Gas Change Movements</h2><p className="ops-muted">Bottle connected time, stopped time, production-active time and output.</p></div><div className="ops-actions"><button className="ops-button secondary" onClick={() => navigate("/production/gas")}>Back to Gas Stock</button>{canReport && <button className="ops-button" onClick={generateReport}>Generate PDF</button>}</div></header>{error && <div className="ops-error">{error}</div>}<div className="ops-card ops-table-wrap"><table className="ops-table"><thead><tr><th>Started</th><th>Finished</th><th>Bottle</th><th>Filled kg</th><th>Empty kg</th><th>Connected time</th><th>Stopped time</th><th>Production-active time</th><th>Production</th><th>Gas used</th><th>Gas kg/ton</th><th>Next bottle</th></tr></thead><tbody>{(data.runs || []).map(run => <tr key={run.id}><td>{plantDateTime(run.started_at)}</td><td>{plantDateTime(run.finished_at)}</td><td>GAS-{run.position_no}</td><td>{run.filled_weight_kg == null ? "-" : fmt(run.filled_weight_kg)}</td><td>{run.empty_weight_kg == null ? run.finished_at && run.consumed_gas_kg == null ? "Pending" : "-" : fmt(run.empty_weight_kg)}</td><td>{run.elapsed_seconds == null ? duration(run.started_at, run.finished_at) : secondsDuration(run.elapsed_seconds)}</td><td>{secondsDuration(run.stopped_seconds)}</td><td>{secondsDuration(run.production_active_seconds)}</td><td>{run.production_ton == null ? "-" : `${fmt(run.production_ton)} ton`}</td><td>{run.consumed_gas_kg == null ? run.finished_at ? "Pending" : "-" : `${fmt(run.consumed_gas_kg)} kg`}</td><td>{run.gas_kg_per_ton == null ? "-" : fmt(run.gas_kg_per_ton)}</td><td>{nextBottle(run)}</td></tr>)}</tbody></table>{!(data.runs || []).length && <div className="ops-empty">No gas change movements recorded yet.</div>}</div></section>;
}
