// Kategori defect ni TETAP (macam column hijau dalam sheet Excel) -
// sama untuk semua rekod, tak boleh ubah dari borang.
//
// Nak tambah kategori baru? Just tambah entri baru dalam array ni.
// Checkbox dia akan AUTO muncul untuk semua rekod (lama & baru) sebab
// mergeCategories() di bawah sentiasa rujuk senarai ni sebagai sumber
// utama, bukan apa yang disimpan dalam rekod lama.
export const DEFECT_CATEGORIES = [
  { key: "motor", label: "Motor" },
  { key: "main_rope", label: "Main Rope" },
  { key: "gear_box", label: "Gear Box" },
  { key: "pulley", label: "Pulley" },
  { key: "gov_rope", label: "Gov Rope" },
  { key: "brake", label: "Brake" },
  { key: "water leaking", label: "Water Leaking" },
  { key: "lift_elec", label: "Lift Elec" },
  { key: "esc_mechanical", label: "ESC Mechanical" },
  { key: "esc_electrical", label: "ESC Electrical" },
];

// Checklist kosong untuk rekod baru.
export function buildCategoryChecklist() {
  return DEFECT_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    checked: false,
  }));
}

// Gabungkan data checklist yang disimpan dalam rekod dengan senarai
// DEFECT_CATEGORIES yang TERKINI. Kategori baru yang belum ada dalam
// rekod lama akan muncul dengan checkbox kosong (bukan hilang).
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

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "done", label: "Done" },
];

export const STATUS_LABEL = {
  pending: "Pending",
  done: "Done",
};

// Teks "finding" biasanya ditaip macam "1. ... 2. ... 3. ..." dalam satu
// perenggan. Fungsi ni pecahkan jadi senarai berasingan (satu bullet
// satu baris) untuk paparan & export Excel.
export function splitFindingLines(text) {
  if (!text) return [];
  const parts = text
    .split(/(?=\d+\.\s?)/g)
    .map((s) => s.trim().replace(/,\s*$/, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}
