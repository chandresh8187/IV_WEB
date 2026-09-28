import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { downloadGasReportApi, getGasDashboardApi } from "../../api/gasManagementApi";
import { downloadResponse } from "../../utils/download";
import { hasPermission, getStoredUser } from "../../utils/permissions";
import socket from "../../socket/socket";
import "./Operations.css";

const fmt = value => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const duration = (start, finish) => { if (!finish) return "Running"; const minutes = Math.max(0, (new Date(finish) - new Date(start)) / 60000); return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`; };

export default function GasChangeMovementsScreen() {
  const navigate = useNavigate(); const canReport = hasPermission(getStoredUser(), "gas.report"); const [data, setData] = useState({ runs: [] }); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setData((await getGasDashboardApi()).data); setError(""); } catch (e) { setError(e.response?.data?.message || "Could not load gas movements."); } }, []);
  useEffect(() => { load(); socket.on("gas_management_updated", load); return () => socket.off("gas_management_updated", load); }, [load]);
  return <section className="ops-page"><header className="ops-header"><div><h2>Gas Change Movements</h2><p className="ops-muted">Bottle weights, gas used, running duration and production.</p></div><div className="ops-actions"><button className="ops-button secondary" onClick={() => navigate("/production/gas")}>Back to Gas Stock</button>{canReport && <button className="ops-button" onClick={async () => downloadResponse(await downloadGasReportApi(), "gas-bottle-report.pdf")}>Generate PDF</button>}</div></header>{error && <div className="ops-error">{error}</div>}<div className="ops-card ops-table-wrap"><table className="ops-table"><thead><tr><th>Started</th><th>Finished</th><th>Bottle</th><th>Filled kg</th><th>Empty kg</th><th>Running time</th><th>Production</th><th>Gas used</th><th>Gas kg/ton</th><th>Next bottle</th></tr></thead><tbody>{(data.runs || []).map(run => <tr key={run.id}><td>{run.started_at}</td><td>{run.finished_at || "Running"}</td><td>GAS-{run.position_no}</td><td>{run.filled_weight_kg == null ? "-" : fmt(run.filled_weight_kg)}</td><td>{run.empty_weight_kg == null ? "-" : fmt(run.empty_weight_kg)}</td><td>{duration(run.started_at, run.finished_at)}</td><td>{run.production_ton == null ? "-" : `${fmt(run.production_ton)} ton`}</td><td>{run.consumed_gas_kg == null ? "-" : `${fmt(run.consumed_gas_kg)} kg`}</td><td>{run.gas_kg_per_ton == null ? "-" : fmt(run.gas_kg_per_ton)}</td><td>{run.finished_at && run.note ? String(run.note).match(/bottle (\d+) started/i)?.[1] || "-" : "-"}</td></tr>)}</tbody></table>{!(data.runs || []).length && <div className="ops-empty">No gas change movements recorded yet.</div>}</div></section>;
}
