import { X } from "lucide-react";
import PlanningIconButton from "./PlanningIconButton";
import { useEffect, useRef } from "react";
export default function PlanningDialog({
  title,
  busy,
  onClose,
  onSave,
  beforeSave,
  showSave = true,
  children,
}) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="planning-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <PlanningIconButton
          label="Close"
          Icon={X}
          disabled={busy}
          onClick={onClose}
        />
      </header>
      <form onSubmit={onSave}>
        {children}
        <footer>
          <button
            className="outline-button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          {beforeSave}
          {showSave && <button className="primary-button" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save"}
          </button>}
        </footer>
      </form>
    </dialog>
  );
}
