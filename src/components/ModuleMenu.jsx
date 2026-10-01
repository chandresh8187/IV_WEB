import { ArrowUpRight, Factory, Search, Settings2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import "./ModuleMenu.css";

export default function ModuleMenu({ eyebrow, title, description, actions, sections, searchable = false, kind = "production" }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const searchText = search.trim().toLowerCase();
  const HeadingIcon = kind === "production" ? Factory : Settings2;
  const availableSections = sections
    ? sections.map(section => ({ ...section, actions: actions.filter(item => section.paths.includes(item.path)) }))
    : [{ title: null, actions }];
  const visibleSections = availableSections.map(section => ({
    ...section,
    actions: section.actions.filter(item => !searchText || [item.title, item.description, section.title].some(value => String(value || '').toLowerCase().includes(searchText))),
  })).filter(section => section.actions.length);
  const visibleCount = visibleSections.reduce((count, section) => count + section.actions.length, 0);

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
            <span>{searchText ? `${visibleCount} found` : `${actions.length} modules`}</span>
          </div>
          {searchable && <div className="module-menu-search"><Search size={18} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search production menus" aria-label="Search production menus" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear menu search"><X size={18} /></button>}</div>}
          {visibleSections.map(section => <div className="module-action-section" key={section.title || 'all'}>
            {section.title && <h3 className="module-group-title">{section.title}</h3>}
            <div className="module-grid">
            {section.actions.map(({ title: actionTitle, description: hint, icon: Icon, path, primary }) => (
              <button className={`module-tile${primary ? " primary" : ""}`} key={path} onClick={() => navigate(path)}>
                {primary ? <span className="module-entry"><ArrowUpRight size={13} /></span> : null}
                <span className="module-icon"><Icon size={28} strokeWidth={1.7} /></span>
                <strong>{actionTitle}</strong>
                <small>{hint}</small>
              </button>
            ))}
            </div>
          </div>)}
          {!actions.length ? <p className="module-empty">No modules are available for your access permissions.</p> : null}
          {!!actions.length && !!searchText && !visibleCount && <p className="module-empty">No menus match “{search.trim()}”.</p>}
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
