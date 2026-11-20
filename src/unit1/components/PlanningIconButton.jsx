export default function PlanningIconButton({
  label,
  Icon,
  onClick,
  disabled,
  danger = false,
}) {
  return (
    <button
      type="button"
      className={`planning-icon-button${danger ? " planning-icon-danger" : ""}`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
