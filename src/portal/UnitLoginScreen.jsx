import LoadingIndicator from "../components/LoadingIndicator";
import { useState } from "react";
import { useLocation } from "react-router";
import axios from "axios";
import {
  Eye,
  EyeOff,
  Factory,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { loginDestination, signInToUnit, workspaceUnit } from "./unitSession";
import "./portal.css";

export default function UnitLoginScreen() {
  const location = useLocation();
  const requestedUnit = workspaceUnit(window.location.pathname);
  const [unit, setUnit] = useState(requestedUnit || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    if (!unit) {
      setError("Please select a unit.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const configured =
        unit === "unit1"
          ? import.meta.env.VITE_UNIT1_API_BASE_URL ||
            import.meta.env.VITE_API_BASE_URL ||
            import.meta.env.VITE_AUTH_API_URL
          : import.meta.env.VITE_API_BASE_URL;
      const baseURL =
        String(configured || "")
          .trim()
          .replace(/\/+$/, "") ||
        (import.meta.env.DEV
          ? "/api"
          : "https://app.ivsquarestructure.com/api");
      await signInToUnit({
        unit,
        email,
        password,
        storage: localStorage,
        request: (endpoint, credentials) =>
          axios.post(baseURL + endpoint, credentials, { timeout: 15000 }),
      });
      setPassword("");
      // Replace the login history entry while unloading the previous unit's styles and realtime clients.
      window.location.replace(
        loginDestination(unit, requestedUnit, location.state?.from),
      );
    } catch (failure) {
      setError(
        failure?.response?.data?.message ||
          failure?.response?.data?.error ||
          failure.message ||
          "Unable to sign in.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="portal-page">
      <section className="portal-card">
        <div className="portal-brand">
          <img src="/iv-logo.png" alt="IV Square Structure" />
          <div>
            <strong>IV APP</strong>
            <span>Production Management</span>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p className="portal-intro">
          Select your unit, then sign in with that unit’s account. test file
          zila
        </p>
        <form onSubmit={submit}>
          <fieldset className="portal-units" disabled={loading}>
            <legend>Select unit</legend>
            {["unit1", "unit2"].map((value, index) => (
              <label
                key={value}
                className={
                  "portal-unit" + (unit === value ? " portal-selected" : "")
                }
              >
                <input
                  type="radio"
                  name="unit"
                  value={value}
                  checked={unit === value}
                  onChange={() => {
                    setUnit(value);
                    setError("");
                  }}
                  required
                />
                <Factory size={24} />
                <strong>UNIT {index + 1}</strong>
              </label>
            ))}
          </fieldset>
          <label className="portal-label" htmlFor="portal-email">
            Email address
          </label>
          <div className="portal-input">
            <Mail size={18} />
            <input
              id="portal-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>
          <label className="portal-label" htmlFor="portal-password">
            Password
          </label>
          <div className="portal-input">
            <LockKeyhole size={18} />
            <input
              id="portal-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <p className="portal-error" role="alert">
              {error}
            </p>
          )}
          <button className="portal-submit" disabled={loading || !unit}>
            <ShieldCheck size={18} />
            {loading ? (
              <LoadingIndicator label="Signing in…" inline />
            ) : unit ? (
              "Sign in to UNIT " + (unit === "unit1" ? "1" : "2")
            ) : (
              "Select a unit to continue"
            )}
          </button>
        </form>
        <p className="portal-footer">
          IV Square Structure · Secure production workspace
        </p>
      </section>
    </main>
  );
}
