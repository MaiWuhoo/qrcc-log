// These defect categories are FIXED (like the green columns in the
// Excel sheet) - same for every record, cannot be changed from the
// form.
//
// Want to add a new category? Just add a new entry to this array.
// Its checkbox will AUTOMATICALLY appear on every record (old and
// new) because mergeCategories() below always refers to this list as
// the source of truth, not whatever is stored on an old record.
export const DEFECT_CATEGORIES = [
  { key: "motor", label: "Motor" },
  { key: "main_rope", label: "Main Rope" },
  { key: "gear_box", label: "Gear Box" },
  { key: "pulley", label: "Pulley" },
  { key: "gov_rope", label: "Gov Rope" },
  { key: "brake", label: "Brake" },
  { key: "water_leaking", label: "Water Leaking" },
  { key: "lift_elec", label: "Lift Electrical Switch" },
  { key: "esc_mechanical", label: "ESC Mechanical" },
  { key: "esc_electrical", label: "ESC Electrical" },
  { key: "other", label: "OTHER" },
];

// Hover tooltip content for each category header — keyed by "key"
// (not label) so it keeps working even if the label text changes.
// Each entry is a short bullet list of what falls under that
// category, joined with newlines for the native `title` tooltip.
export const CATEGORY_TOOLTIPS = {
  motor: ["Noise", "Shotting", "Burn"],
  main_rope: ["Red Dust", "Broken", "Dry"],
  gear_box: ["Noise", "Oil Leaking"],
  pulley: ["Broken", "Groove Damage"],
  gov_rope: ["Red Dust", "Broken"],
  brake: ["Noise", "Not Function", "Brake release drum damage"],
  // No description given yet for Water Leaking — placeholder default,
  // update anytime.
  water_leaking: ["Any water leaking issue"],
  lift_elec: ["Switch", "Wiring", "Lighting", "Supply"],
  esc_mechanical: [
    "Motor",
    "Handrail",
    "Chain",
    "Step",
    "Comb",
    "Skirting",
    "Other",
  ],
  esc_electrical: ["Switch Safety", "Wiring", "Supply"],
  other: ["Any defect"],
};

export function getCategoryTooltip(key) {
  const items = CATEGORY_TOOLTIPS[key];
  if (!items || items.length === 0) return "";
  return items.map((i) => `• ${i}`).join("\n");
}

// Empty checklist for a new record.
export function buildCategoryChecklist() {
  return DEFECT_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    checked: false,
  }));
}

// Merge the checklist data stored on a record with the CURRENT
// DEFECT_CATEGORIES list. Any category added after a record was
// created will still show up (unticked), not disappear.
export function mergeCategories(stored) {
  const savedByKey = new Map((stored || []).map((c) => [c.key, c]));
  return DEFECT_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    checked: savedByKey.get(c.key)?.checked ?? false,
  }));
}

export function countCheckedDefects(categories) {
  if (!categories) return 0;
  return categories.filter((c) => c.checked).length;
}

// Use THESE instead of `new Date().toISOString().slice(...)` to avoid
// a timezone bug — toISOString() converts to UTC, so for Malaysia
// (UTC+8) the date/month can roll back (e.g. early morning, or
// whenever a month is built via `new Date(y, m, 1)` since that's
// always constructed at local midnight).
export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function thisMonthValue(date = new Date()) {
  return todayISO(date).slice(0, 7);
}

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "done", label: "Done" },
];

export const STATUS_LABEL = {
  pending: "Pending",
  done: "Done",
};

// The "finding" text is usually typed as "1. ... 2. ... 3. ..." in one
// paragraph. This function splits it into separate lines (one bullet
// per line) for display and Excel export.
export function splitFindingLines(text) {
  if (!text) return [];
  const parts = text
    .split(/(?=\d+\.\s?)/g)
    .map((s) => s.trim().replace(/,\s*$/, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

// Incentive auto-generated = 1.5% of Amount PO. amountPo can be
// null/"" (not yet entered) -> returns null so the UI can show "—".
export function computeIncentive(amountPo) {
  const n = Number(amountPo);
  if (!amountPo || Number.isNaN(n) || n <= 0) return null;
  return n * 0.015;
}

export function formatRM(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
