import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { loginApi } from "../../api/authApi";
import "./LoginScreen.css";

export default function LoginScreen() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await loginApi({
        email,
        password,
      });

      navigate("/", {
        replace: true,
      });
    } catch (loginError) {
      setError(
        loginError?.response?.data?.message ||
          loginError?.message ||
          "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-section">
          <div className="brand-logo">
            <span>IV</span>
          </div>

          <div className="brand-text">
            <strong>IV APP</strong>
            <span>Production Management</span>
          </div>
        </div>

        <div className="login-heading">
          <h1>Welcome back</h1>

          <p>Sign in using your existing IV account.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>

          <div className="input-container">
            <Mail size={18} />

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={updateForm}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <label htmlFor="password">Password</label>

          <div className="input-container">
            <LockKeyhole size={18} />

            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={updateForm}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
              required
            />

            <button
              className="password-button"
              type="button"
              onClick={() => {
                setShowPassword((previous) => !previous);
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error ? <div className="error-message">{error}</div> : null}

          <button className="login-button" type="submit" disabled={loading}>
            <ShieldCheck size={18} />

            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="login-footer">
          <span className="connection-dot" />
          Connected to the existing IV APP backend
        </div>
      </section>
    </main>
  );
}
