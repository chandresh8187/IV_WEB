import { useState } from "react";
import { ArrowLeft, RefreshCw, Radio, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";

import { triggerOtaUpdateApi } from "../../api/controlPanelApi";
import "./OtaUpdateScreen.css";

export default function OtaUpdateScreen() {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const trigger = async (event) => {
    event.preventDefault();
    if (!passcode) return setMessage({ type: "error", text: "Enter the OTA passcode." });
    setBusy(true);
    setMessage(null);
    try {
      const response = await triggerOtaUpdateApi(passcode);
      const clients = Number(response?.data?.connected_clients || 0);
      setPasscode("");
      setMessage({ type: "success", text: `${response?.message || "OTA check requested."} ${clients} socket client${clients === 1 ? "" : "s"} connected.` });
    } catch (error) {
      setMessage({ type: "error", text: error?.response?.data?.message || "Could not trigger the OTA update." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="ota-page">
      <section className="ota-card">
        <button className="ota-back" type="button" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Back</button>
        <div className="ota-icon"><Radio size={30} /></div>
        <span className="ota-overline">HIDDEN SYSTEM TOOL</span>
        <h1>Trigger EAS update</h1>
        <p>Publish the update with EAS first. This sends a socket request to connected app devices to check, download, and prepare that update.</p>
        <form onSubmit={trigger}>
          <label><span>Secure passcode</span><input type="password" autoComplete="off" value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="OTA passcode or your superadmin password" /></label>
          {message ? <div className={`ota-message ${message.type}`}>{message.type === "success" ? <ShieldCheck size={17} /> : null}{message.text}</div> : null}
          <button className="ota-submit" type="submit" disabled={busy}>{busy ? <RefreshCw className="ota-spin" size={18} /> : <Radio size={18} />}{busy ? "Sending request…" : "Trigger OTA download"}</button>
        </form>
      </section>
    </main>
  );
}
