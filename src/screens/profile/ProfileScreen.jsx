import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import {
  changeMyPasswordApi,
  getMyProfileApi,
  updateMyProfileApi,
} from "../../api/profileApi";
import "./ProfileScreen.css";

const roleLabels = {
  superadmin: "Superadmin",
  plant_manager: "Plant Manager",
  admin: "Admin",
  supervisor: "Supervisor",
};

const roleDescriptions = {
  superadmin: "Full access to users, plant operations, settings and reports.",
  plant_manager:
    "Can monitor plant operations, production, reports and certificates.",
  admin: "Can monitor production, reports, supervisors and certificates.",
  supervisor:
    "Can manage assigned-shift production entries and view permitted records.",
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function getPayloadData(payload) {
  return payload?.data?.user || payload?.data || payload?.user || payload;
}

function updateStoredUser(user) {
  const keys = ["iv_user", "user", "auth"];

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const stored = JSON.parse(raw);
      const next = stored?.user
        ? { ...stored, user: { ...stored.user, ...user } }
        : { ...stored, ...user };

      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Ignore malformed legacy values.
    }
  }

  window.dispatchEvent(
    new CustomEvent("iv:user-updated", {
      detail: user,
    }),
  );
  window.dispatchEvent(new Event("iv:session-changed"));
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name) {
  return String(name || "IV User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function PasswordField({
  label,
  name,
  value,
  visible,
  onChange,
  onToggle,
  autoComplete,
}) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <div className="profile-password-input">
        <LockKeyhole size={15} />
        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    current_password: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordVisibility, setPasswordVisibility] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState(null);

  const loadProfile = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setMessage(null);

    try {
      const response = await getMyProfileApi();
      const user = getPayloadData(response);

      setProfile(user);
      setProfileForm({
        name: user?.name || "",
        email: user?.email || "",
        current_password: "",
      });
      updateStoredUser(user);
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to load your profile."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const emailChanged =
    profileForm.email.trim().toLowerCase() !==
    String(profile?.email || "")
      .trim()
      .toLowerCase();

  const profileChanged =
    profileForm.name.trim() !== String(profile?.name || "").trim() ||
    emailChanged;

  const passwordRules = useMemo(() => {
    const password = passwordForm.new_password;

    return [
      { label: "At least 8 characters", valid: password.length >= 8 },
      { label: "Contains an uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "Contains a lowercase letter", valid: /[a-z]/.test(password) },
      { label: "Contains a number", valid: /\d/.test(password) },
    ];
  }, [passwordForm.new_password]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setMessage({ type: "error", text: "Name and email are required." });
      return;
    }

    if (emailChanged && !profileForm.current_password) {
      setMessage({
        type: "error",
        text: "Enter your current password to change the email address.",
      });
      return;
    }

    setSavingProfile(true);

    try {
      const response = await updateMyProfileApi({
        name: profileForm.name.trim(),
        email: profileForm.email.trim().toLowerCase(),
        current_password: profileForm.current_password,
      });
      const user = getPayloadData(response);

      setProfile(user);
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        current_password: "",
      });
      updateStoredUser(user);
      setMessage({
        type: "success",
        text: response?.message || "Profile updated successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to update your profile."),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!passwordRules.every((rule) => rule.valid)) {
      setMessage({
        type: "error",
        text: "Your new password does not meet all password requirements.",
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      setMessage({
        type: "error",
        text: "The new password must be different from your current password.",
      });
      return;
    }

    setSavingPassword(true);

    try {
      const response = await changeMyPasswordApi(passwordForm);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setPasswordVisibility({});
      setMessage({
        type: "success",
        text: response?.message || "Password changed successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to change your password."),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <LoaderCircle className="profile-spinning" size={24} />
        <strong>Loading your profile</strong>
        <span>Please wait a moment.</span>
      </div>
    );
  }

  return (
    <section className="profile-screen">
      <header className="profile-toolbar">
        <div>
          <span className="profile-overline">My account</span>
          <h2>Profile</h2>
          <p>Manage your personal information and account security.</p>
        </div>

        <button
          type="button"
          className="profile-refresh-button"
          onClick={() => loadProfile()}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "profile-spinning" : ""} />
          Refresh
        </button>
      </header>

      {message ? (
        <div className={`profile-message ${message.type}`} role="alert">
          {message.type === "success" ? (
            <CheckCircle2 size={17} />
          ) : (
            <AlertCircle size={17} />
          )}
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)}>
            <X size={14} />
          </button>
        </div>
      ) : null}

      <article className="profile-identity-card">
        <div className="profile-avatar">{getInitials(profile?.name)}</div>

        <div className="profile-identity-copy">
          <div>
            <h3>{profile?.name || "IV User"}</h3>
            <span className={`profile-role-badge ${profile?.role || ""}`}>
              <BadgeCheck size={13} />
              {roleLabels[profile?.role] || profile?.role || "User"}
            </span>
          </div>
          <p>
            <Mail size={14} /> {profile?.email || "-"}
          </p>
        </div>

        <div className="profile-status">
          <span>
            <i /> {profile?.status === "inactive" ? "Inactive" : "Active"}{" "}
            account
          </span>
          <small>Account ID #{profile?.id || "-"}</small>
        </div>
      </article>

      <div className="profile-layout">
        <div className="profile-main-column">
          <article className="profile-card">
            <header className="profile-card-header">
              <div className="profile-card-icon">
                <UserRound size={18} />
              </div>
              <div>
                <span>Personal details</span>
                <h3>Edit profile information</h3>
              </div>
            </header>

            <form className="profile-form" onSubmit={saveProfile}>
              <div className="profile-form-grid">
                <label className="profile-field">
                  <span>Full name</span>
                  <div className="profile-input-with-icon">
                    <UserRound size={15} />
                    <input
                      type="text"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      maxLength={100}
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>

                <label className="profile-field">
                  <span>Email address</span>
                  <div className="profile-input-with-icon">
                    <Mail size={15} />
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      maxLength={190}
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>
              </div>

              {emailChanged ? (
                <div className="profile-email-verification">
                  <ShieldCheck size={17} />
                  <div>
                    <strong>Confirm email change</strong>
                    <span>
                      Enter your current password before saving a new email
                      address.
                    </span>
                  </div>
                  <input
                    type="password"
                    name="current_password"
                    value={profileForm.current_password}
                    onChange={handleProfileChange}
                    placeholder="Current password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              ) : null}

              <footer className="profile-form-footer">
                <span>
                  Role and shift assignment can only be changed by a superadmin.
                </span>
                <button
                  type="submit"
                  disabled={!profileChanged || savingProfile}
                >
                  {savingProfile ? (
                    <LoaderCircle className="profile-spinning" size={15} />
                  ) : (
                    <Save size={15} />
                  )}
                  Save changes
                </button>
              </footer>
            </form>
          </article>

          <article className="profile-card">
            <header className="profile-card-header">
              <div className="profile-card-icon secure">
                <KeyRound size={18} />
              </div>
              <div>
                <span>Account security</span>
                <h3>Change password</h3>
              </div>
            </header>

            <form className="profile-form" onSubmit={savePassword}>
              <div className="profile-form-grid password-grid">
                <PasswordField
                  label="Current password"
                  name="current_password"
                  value={passwordForm.current_password}
                  visible={passwordVisibility.current}
                  onChange={handlePasswordChange}
                  onToggle={() =>
                    setPasswordVisibility((current) => ({
                      ...current,
                      current: !current.current,
                    }))
                  }
                  autoComplete="current-password"
                />

                <PasswordField
                  label="New password"
                  name="new_password"
                  value={passwordForm.new_password}
                  visible={passwordVisibility.new}
                  onChange={handlePasswordChange}
                  onToggle={() =>
                    setPasswordVisibility((current) => ({
                      ...current,
                      new: !current.new,
                    }))
                  }
                  autoComplete="new-password"
                />

                <PasswordField
                  label="Confirm new password"
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  visible={passwordVisibility.confirm}
                  onChange={handlePasswordChange}
                  onToggle={() =>
                    setPasswordVisibility((current) => ({
                      ...current,
                      confirm: !current.confirm,
                    }))
                  }
                  autoComplete="new-password"
                />
              </div>

              <div className="profile-password-rules">
                {passwordRules.map((rule) => (
                  <span className={rule.valid ? "valid" : ""} key={rule.label}>
                    {rule.valid ? <Check size={12} /> : <i />}
                    {rule.label}
                  </span>
                ))}
              </div>

              <footer className="profile-form-footer">
                <span>
                  Use a password that you do not use for other accounts.
                </span>
                <button type="submit" disabled={savingPassword}>
                  {savingPassword ? (
                    <LoaderCircle className="profile-spinning" size={15} />
                  ) : (
                    <KeyRound size={15} />
                  )}
                  Change password
                </button>
              </footer>
            </form>
          </article>
        </div>

        <aside className="profile-side-column">
          <article className="profile-side-card">
            <header>
              <BriefcaseBusiness size={17} />
              <h3>Work access</h3>
            </header>

            <div className="profile-detail-row">
              <span>Role</span>
              <strong>
                {roleLabels[profile?.role] || profile?.role || "-"}
              </strong>
            </div>

            <div className="profile-detail-row">
              <span>Assigned shift</span>
              <strong className="capitalize">
                {profile?.assigned_shift || "Not assigned"}
              </strong>
            </div>

            <p className="profile-role-description">
              <ShieldCheck size={15} />
              {roleDescriptions[profile?.role] ||
                "Access is based on your assigned account role."}
            </p>
          </article>

          <article className="profile-side-card">
            <header>
              <CalendarDays size={17} />
              <h3>Account information</h3>
            </header>

            <div className="profile-detail-row">
              <span>Member since</span>
              <strong>{formatDate(profile?.created_at)}</strong>
            </div>

            <div className="profile-detail-row">
              <span>Last profile update</span>
              <strong>{formatDate(profile?.updated_at)}</strong>
            </div>

            <div className="profile-security-note">
              <ShieldCheck size={18} />
              <div>
                <strong>Your password is protected</strong>
                <span>IV WEB never displays or returns your password.</span>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
