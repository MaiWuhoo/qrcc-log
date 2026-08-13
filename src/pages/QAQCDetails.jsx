import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { Lock } from "lucide-react";
import { db } from "../firebase";
import {
  DEFECT_CATEGORIES,
  buildCategoryChecklist,
  mergeCategories,
  countCheckedDefects,
  STATUS_OPTIONS,
  splitFindingLines,
  computeIncentive,
} from "../constants";
import { useStaff } from "../StaffContext";
import "./QAQCDetails.css";

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRM(n) {
  if (n === null || n === undefined) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function QAQCDetails() {
  const { id } = useParams();
  const { isStaff } = useStaff();

  const [record, setRecord] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [categories, setCategories] = useState(buildCategoryChecklist());
  const [status, setStatus] = useState("pending");

  // Rectification log (append-only)
  const [newRectText, setNewRectText] = useState("");
  const [newRectDate, setNewRectDate] = useState("");
  const [newRectPic, setNewRectPic] = useState("");
  const [addingRect, setAddingRect] = useState(false);

  // Financial fields (staff only, locked once saved)
  const [quotation, setQuotation] = useState("");
  const [poNo, setPoNo] = useState("");
  const [amountPo, setAmountPo] = useState("");

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
        setCategories(mergeCategories(data.categories));
        setStatus(data.status || "pending");
        setQuotation(data.quotation || "");
        setPoNo(data.poNo || "");
        setAmountPo(
          data.amountPo !== null && data.amountPo !== undefined
            ? String(data.amountPo)
            : "",
        );
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

  // Quotation/PO No/Amount PO auto-lock as soon as a value is saved on
  // the record — they can no longer be changed after that.
  const quotationLocked = !!record?.quotation;
  const poNoLocked = !!record?.poNo;
  const amountPoLocked =
    record?.amountPo !== null && record?.amountPo !== undefined;

  // Status auto-locks to DONE only when Quotation = Yes AND PO No +
  // Amount PO are both locked/saved. Cannot be set manually while true.
  const autoStatusLocked =
    quotationLocked &&
    record?.quotation === "yes" &&
    poNoLocked &&
    amountPoLocked;

  const incentivePreview = computeIncentive(
    amountPoLocked ? record.amountPo : amountPo,
  );

  async function handleAddRectification() {
    if (!newRectText.trim()) return;
    setAddingRect(true);
    try {
      const entry = {
        id: crypto.randomUUID(),
        text: newRectText.trim(),
        rectifiedDate: newRectDate,
        picName: newRectPic.trim(),
        createdAt: Timestamp.now(),
      };
      await updateDoc(doc(db, "qaqc_records", id), {
        rectifications: arrayUnion(entry),
        updatedAt: Timestamp.now(),
      });
      setNewRectText("");
      setNewRectDate("");
      setNewRectPic("");
      flashSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingRect(false);
    }
  }

  async function handleSaveStaff() {
    setSaving(true);
    try {
      const amountNum = amountPo !== "" ? Number(amountPo) : null;
      const autoLockNow =
        (quotationLocked ? record.quotation : quotation) === "yes" &&
        (poNoLocked ? record.poNo : poNo.trim()) &&
        (amountPoLocked ? record.amountPo : amountNum);
      const finalStatus = autoLockNow ? "done" : status;

      const payload = {
        categories,
        status: finalStatus,
        updatedAt: Timestamp.now(),
      };
      // Financial fields are only sent if NOT locked yet — once saved
      // once, they will never be sent/changed again.
      if (!quotationLocked && quotation) payload.quotation = quotation;
      if (!poNoLocked && poNo.trim()) payload.poNo = poNo.trim();
      if (!amountPoLocked && amountNum) {
        payload.amountPo = amountNum;
        payload.incentive = computeIncentive(amountNum);
      }

      await updateDoc(doc(db, "qaqc_records", id), payload);
      flashSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePublic() {
    if (autoStatusLocked) return; // nothing to save, status is automatic
    setSaving(true);
    try {
      await updateDoc(doc(db, "qaqc_records", id), {
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
        <p>Record not found.</p>
        <Link to="/list" className="btn-secondary-link">
          Back to List
        </Link>
      </div>
    );
  }

  if (!record) {
    return <div className="card">Loading record...</div>;
  }

  const total = countCheckedDefects(categories);
  const rectifications = record.rectifications || [];

  return (
    <div className="card details-card">
      <Link to="/list" className="back-link">
        &larr; QRCC List
      </Link>

      <header className="wo-header details-header">
        <div className="wo-eyebrow">
          record details {!isStaff && <span className="mode-tag">Public</span>}
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
            <dt>CP Name</dt>
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
            ? "Tick the categories that are defective for this record."
            : "View only — only QRCC staff can update these categories."}
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

      {/* ---------- Financial information (staff only) ---------- */}
      {isStaff && (
        <section className="wo-section update-section">
          <div className="wo-section-title">
            Financial Information
            <span className="mode-tag">Locked once saved</span>
          </div>

          <div className="grid-3">
            <div className="field">
              <label className="field-label">
                Quotation{" "}
                {quotationLocked && <Lock size={11} className="inline-lock" />}
              </label>
              {quotationLocked ? (
                <div className="locked-value">
                  {record.quotation.toUpperCase()}
                </div>
              ) : (
                <select
                  className="input select"
                  value={quotation}
                  onChange={(e) => setQuotation(e.target.value)}
                >
                  <option value="">-- Choose --</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              )}
            </div>

            <div className="field">
              <label className="field-label">
                PO No {poNoLocked && <Lock size={11} className="inline-lock" />}
              </label>
              {poNoLocked ? (
                <div className="locked-value">{record.poNo}</div>
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder="PO Number"
                  value={poNo}
                  onChange={(e) => setPoNo(e.target.value)}
                />
              )}
            </div>

            <div className="field">
              <label className="field-label">
                Amount PO{" "}
                {amountPoLocked && <Lock size={11} className="inline-lock" />}
              </label>
              {amountPoLocked ? (
                <div className="locked-value">{formatRM(record.amountPo)}</div>
              ) : (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                  value={amountPo}
                  onChange={(e) => setAmountPo(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="field incentive-field">
            <label className="field-label">Incentive (1.5% Auto)</label>
            <div className="locked-value incentive-value">
              {formatRM(incentivePreview)}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Rectification log (append-only) ---------- */}
      <section className="wo-section update-section">
        <div className="wo-section-title">
          Rectification Record
          <span className="mode-tag">Add only, cannot edit</span>
        </div>

        <div className="rect-log">
          {rectifications.map((r, idx) => (
            <div className="rect-box" key={r.id || idx}>
              <div className="field update-field">
                <label className="field-label">
                  Rectification Record #{idx + 1}
                  <Lock size={12} className="inline-lock" />
                </label>
                <textarea
                  className="input textarea"
                  rows={3}
                  value={r.text}
                  disabled
                />
              </div>
              <div className="grid-3">
                <div className="field">
                  <label className="field-label">Rectified Date</label>
                  <input
                    type="date"
                    className="input"
                    value={r.rectifiedDate || ""}
                    disabled
                  />
                </div>
                <div className="field">
                  <label className="field-label">PIC Name</label>
                  <input
                    type="text"
                    className="input"
                    value={r.picName || ""}
                    disabled
                  />
                </div>
                <div className="field rect-saved-field">
                  <label className="field-label">&nbsp;</label>
                  <div className="rect-saved-badge">
                    <Lock size={13} /> Saved
                  </div>
                </div>
              </div>
              {r.createdAt && (
                <p className="rect-saved-time">
                  Saved: {formatTimestamp(r.createdAt)}
                </p>
              )}
            </div>
          ))}

          <div className="rect-box rect-box-draft">
            <div className="field update-field">
              <label className="field-label">
                {rectifications.length > 0
                  ? `Rectification Record #${rectifications.length + 1}`
                  : "Rectification Record"}
              </label>
              <textarea
                className="input textarea"
                rows={3}
                placeholder="Latest progress notes..."
                value={newRectText}
                onChange={(e) => setNewRectText(e.target.value)}
              />
            </div>
            <div className="grid-3">
              <div className="field">
                <label className="field-label">Rectified Date</label>
                <input
                  type="date"
                  className="input"
                  value={newRectDate}
                  onChange={(e) => setNewRectDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">PIC Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="PIC Name"
                  value={newRectPic}
                  onChange={(e) => setNewRectPic(e.target.value)}
                />
              </div>
              <div className="field rect-add-btn-field">
                <label className="field-label">&nbsp;</label>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddRectification}
                  disabled={addingRect || !newRectText.trim()}
                >
                  {addingRect ? "..." : "+ Add Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Status ---------- */}
      <section className="wo-section">
        <div className="field">
          <label className="field-label">Status</label>
          {autoStatusLocked ? (
            <div className="locked-value status-auto">
              <Lock size={12} className="inline-lock" /> Done — auto (Quotation
              approved)
            </div>
          ) : (
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
          )}
        </div>
      </section>

      <div className="wo-actions details-actions">
        {savedFlash && <span className="saved-flash">Saved.</span>}
        {(isStaff || !autoStatusLocked) && (
          <button
            type="button"
            className="btn-primary"
            onClick={isStaff ? handleSaveStaff : handleSavePublic}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
}
