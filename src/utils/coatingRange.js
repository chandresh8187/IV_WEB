export const getCoatingRange = (minimumInput, maximumInput) => {
  const minimumText = String(minimumInput || "").trim();
  const maximumText = String(maximumInput || "").trim();
  const hasMinimum = minimumText !== "";
  const hasMaximum = maximumText !== "";

  if (!hasMinimum && !hasMaximum) {
    return { minimum: null, maximum: null, description: "average coating of 80 micron or above", error: null };
  }
  if (!hasMinimum || !hasMaximum) {
    return { minimum: null, maximum: null, description: "", error: "Enter both minimum and maximum coating values." };
  }
  const minimum = Number(minimumText);
  const maximum = Number(maximumText);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum < 0) {
    return { minimum: null, maximum: null, description: "", error: "Coating range must contain valid positive numbers." };
  }
  if (minimum > maximum) {
    return { minimum, maximum, description: "", error: "Minimum coating cannot be greater than maximum coating." };
  }
  return { minimum, maximum, description: `average coating from ${minimum} to ${maximum} micron`, error: null };
};
