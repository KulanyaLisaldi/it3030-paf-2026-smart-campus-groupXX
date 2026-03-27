/**
 * Same wording as ticket “Category” options. `value` is the select’s internal value;
 * use {@link toApiTechnicianCategory} when calling the API (server enum `TechnicianCategory`).
 */
export const TECHNICIAN_CATEGORIES = [
  { value: "ELECTRICAL", label: "Electrical Issue" },
  { value: "NETWORK", label: "Network Issue" },
  { value: "IT_SUPPORT", label: "Equipment Issue" },
  { value: "IT_SUPPORT_SW", label: "Software Issue" },
  { value: "FACILITIES", label: "Facility Issue" },
  { value: "MAINTENANCE", label: "Maintenance Issue" },
  { value: "GENERAL", label: "Other" },
];

export const DEFAULT_TECHNICIAN_CATEGORY = "GENERAL";

export function toApiTechnicianCategory(formValue) {
  if (formValue === "IT_SUPPORT_SW") return "IT_SUPPORT";
  return formValue;
}

/** Display label for a stored/API category enum string. */
export function technicianCategoryLabel(value) {
  if (value == null || value === "") return "—";
  const v = String(value).toUpperCase();
  if (v === "IT_SUPPORT") return "Equipment / Software Issue";
  const found = TECHNICIAN_CATEGORIES.find((c) => c.value === v);
  return found ? found.label : String(value);
}
