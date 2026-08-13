import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Dropdown that reads a list from Firestore and lets you add a new
 * entry directly from the form (no need to open a separate admin
 * module).
 *
 * props:
 *  - label: field label
 *  - collectionName: Firestore collection name (e.g. "employees", "lifts")
 *  - options: array [{id, label}]
 *  - value: selected id
 *  - onChange: (id, label) => void
 *  - loading: boolean
 *  - placeholder
 */
export default function DropdownAdd({
  label,
  collectionName,
  options,
  value,
  onChange,
  loading,
  placeholder = "-- Select --",
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAddNew() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      const ref = await addDoc(collection(db, collectionName), {
        name: trimmed,
        createdAt: serverTimestamp(),
      });
      onChange(ref.id, trimmed);
      setNewLabel("");
      setAdding(false);
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="field">
      <label className="field-label">{label}</label>

      {!adding ? (
        <div className="dropdown-row">
          <select
            className="input select"
            value={value || ""}
            onChange={(e) => {
              const opt = options.find((o) => o.id === e.target.value);
              onChange(e.target.value, opt ? opt.label : "");
            }}
            disabled={loading}
          >
            <option value="" disabled>
              {loading ? "Loading..." : placeholder}
            </option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* <button
            type="button"
            className="btn-ghost-add"
            onClick={() => setAdding(true)}
            title={`Add new ${label.toLowerCase()}`}
          >
            + New
          </button> */}
        </div>
      ) : (
        <div className="dropdown-row">
          <input
            className="input"
            autoFocus
            placeholder={`New ${label.toLowerCase()} name`}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddNew();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setNewLabel("");
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost-add"
            onClick={handleAddNew}
            disabled={saving || !newLabel.trim()}
          >
            {saving ? "..." : "Save"}
          </button>
          <button
            type="button"
            className="btn-ghost-cancel"
            onClick={() => {
              setAdding(false);
              setNewLabel("");
              setError("");
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
