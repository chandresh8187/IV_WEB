import { ArrowUpRight, Factory, Settings2 } from "lucide-react";
import { useNavigate } from "react-router";
import "./ModuleMenu.css";

export default function ModuleMenu({ eyebrow, title, description, actions, kind = "production" }) {
  const navigate = useNavigate();
  const HeadingIcon = kind === "production" ? Factory : Settings2;

  return (
    <section className="module-menu">
      <div className="module-hero">
        <div className="module-container">
          <div className="module-hero-top">
            <span>{eyebrow}</span>
            <div className="module-brand-icon"><HeadingIcon size={22} strokeWidth={1.7} /></div>
          </div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="module-sheet">
        <div className="module-handle" />
        <div className="module-container">
          <div className="module-section-heading">
            <div><h3>Your workspace</h3><p>Choose an operation to continue</p></div>
            <span>{actions.length} modules</span>
          </div>
          <div className="module-grid">
            {actions.map(({ title: actionTitle, description: hint, icon: Icon, path, primary }) => (
              <button className={`module-tile${primary ? " primary" : ""}`} key={path} onClick={() => navigate(path)}>
                {primary ? <span className="module-entry"><ArrowUpRight size={13} /></span> : null}
                <span className="module-icon"><Icon size={28} strokeWidth={1.7} /></span>
                <strong>{actionTitle}</strong>
                <small>{hint}</small>
              </button>
            ))}
          </div>
          {!actions.length ? <p className="module-empty">No modules are available for your access permissions.</p> : null}
          <div className="module-note">
            <strong>Configured for your role</strong>
            <p>These options follow your assigned access. Contact your superadmin if you need access to another feature.</p>
          </div>
          <footer>IV Production · Built for your plant</footer>
        </div>
      </div>
    </section>
  );
}
