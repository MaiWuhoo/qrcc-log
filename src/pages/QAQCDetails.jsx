import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  DEFECT_CATEGORIES,
  buildCategoryChecklist,
  mergeCategories,
  countCheckedDefects,
  STATUS_OPTIONS,
  splitFindingLines,
} from "../constants";
import { useStaff } from "../StaffContext";
import "./QAQCDetails.css";

export default function QAQCDetails() {
  const { id } = useParams();
  const { isStaff } = useStaff();

  const [record, setRecord] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [categories, setCategories] = useState(buildCategoryChecklist());
  const [updateRemark, setUpdateRemark] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [picName, setPicName] = useState("");
  const [status, setStatus] = useState("pending");

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "qaqc_records", id),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setRecord(data);
        // mergeCategories sentiasa rujuk DEFECT_CATEGORIES terkini,
        // jadi kategori baru yang ditambah lepas rekod ni dicipta tetap
        // akan muncul (checkbox kosong), bukan hilang.
        setCategories(mergeCategories(data.categories));
        setUpdateRemark(data.updateRemark || "");
        setDueDate(data.dueDate || "");
        setPicName(data.picName || "");
        setStatus(data.status || "pending");
      },
      () => setNotFound(true),
    );
    return () => unsub();
  }, [id]);

  function toggleCategory(key) {
    if (!isStaff) return;
    setCategories((prev) =>
      prev.map((c) => (c.key === key ? { ...c, checked: !c.checked } : c)),
    );
  }

  async function handleSaveStaff() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "qaqc_records", id), {
        categories,
        updateRemark: updateRemark.trim(),
        dueDate,
        picName: picName.trim(),
        status,
        updatedAt: Timestamp.now(),
      });
      flashSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Public (bukan staff QAQC) cuma boleh update bahagian "Update Progress"
  // (Description, Date, PIC Name, Status) — kategori defect & field lain
  // sengaja tak disertakan dalam updateDoc supaya tak ter-overwrite.
  async function handleSavePublic() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "qaqc_records", id), {
        updateRemark: updateRemark.trim(),
        dueDate,
        picName: picName.trim(),
        status,
        updatedAt: Timestamp.now(),
      });
      flashSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  if (notFound) {
    return (
      <div className="card">
        <p>Record Not Found.</p>
        <Link to="/senarai" className="btn-secondary-link">
          Back to List
        </Link>
      </div>
    );
  }

  if (!record) {
    return <div className="card">Store Data...</div>;
  }

  const total = countCheckedDefects(categories);

  return (
    <div className="card details-card">
      <Link to="/senarai" className="back-link">
        &larr; QRCC List
      </Link>

      <header className="wo-header details-header">
        <div className="wo-eyebrow">
          Record Details {!isStaff && <span className="mode-tag">Public</span>}
        </div>
        <h1 className="wo-title">{record.unitNo}</h1>
        <div className="wo-id">
          {record.siteName} &middot; {record.date}
        </div>
      </header>

      <section className="wo-section">
        <div className="wo-section-title">Inspection Details</div>
        <dl className="detail-grid">
          <div>
            <dt>Name CP</dt>
            <dd>{record.cpName}</dd>
          </div>
          <div>
            <dt>Job Site Name</dt>
            <dd>{record.siteName}</dd>
          </div>
          <div>
            <dt>Docket / Block</dt>
            <dd>{record.docket || "—"}</dd>
          </div>
          <div>
            <dt>Unit No</dt>
            <dd>{record.unitNo}</dd>
          </div>
          <div>
            <dt>Date of Checking</dt>
            <dd className="mono">{record.date}</dd>
          </div>
        </dl>
      </section>

      <section className="wo-section">
        <div className="wo-section-title">Finding During Check</div>
        <ul className="finding-list">
          {splitFindingLines(record.finding).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      {record.notes && (
        <section className="wo-section">
          <div className="wo-section-title">Notes</div>
          <p className="detail-text">{record.notes}</p>
        </section>
      )}

      <section className="wo-section">
        <div className="wo-section-title">
          Defect Category ({total}/{DEFECT_CATEGORIES.length})
        </div>
        <p className="grid-hint">
          {isStaff
            ? " Please tick the category for this defect."
            : " View Only — QRCC Staff can update this section"}
        </p>
        <div className="defect-grid-wrap">
          <table className="defect-grid">
            <thead>
              <tr>
                {DEFECT_CATEGORIES.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {categories.map((c) => (
                  <td key={c.key}>
                    <input
                      type="checkbox"
                      className="defect-check-input"
                      checked={c.checked}
                      disabled={!isStaff}
                      onChange={() => toggleCategory(c.key)}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="wo-section update-section">
        <div className="wo-section-title">
          Update Progress
          {!isStaff && <span className="mode-tag"></span>}
        </div>

        <div className="field update-field">
          <label className="field-label">Rectification Record</label>
          <textarea
            className="input textarea"
            rows={3}
            placeholder="Catatan progress terkini..."
            value={updateRemark}
            onChange={(e) => setUpdateRemark(e.target.value)}
          />
        </div>

        <div className="grid-3">
          <div className="field">
            <label className="field-label">Rectified Date</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">PIC Name</label>
            <input
              type="text"
              className="input"
              placeholder="PIC Name"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">Status</label>
            <select
              className="input select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="wo-actions details-actions">
        {savedFlash && <span className="saved-flash">Saved.</span>}
        <button
          type="button"
          className="btn-primary"
          onClick={isStaff ? handleSaveStaff : handleSavePublic}
          disabled={saving}
        >
          {saving ? "Menyimpan..." : "Simpan Kemaskini"}
        </button>
      </div>
    </div>
  );
}
