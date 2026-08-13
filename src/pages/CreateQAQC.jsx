import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import DropdownAdd from "../components/DropdownAdd";
import StatusStamp from "../components/StatusStamp";
import { buildCategoryChecklist, todayISO } from "../constants";
import { useStaff } from "../StaffContext";
import "./CreateQAQC.css";

export default function CreateQAQC() {
  const { isStaff, unlock } = useStaff();

  const [employees, setEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [locations, setLocations] = useState([]);

  const [cpId, setCpId] = useState("");
  const [cpName, setCpName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [docket, setDocket] = useState("");
  const [date, setDate] = useState(todayISO());
  const [unitNo, setUnitNo] = useState("");
  const [finding, setFinding] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    const qEmp = query(collection(db, "employees"), orderBy("name"));
    const unsub = onSnapshot(
      qEmp,
      (snap) => {
        setEmployees(
          snap.docs.map((d) => ({ id: d.id, label: d.data().name })),
        );
        setLoadingList(false);
      },
      () => setLoadingList(false),
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const qLoc = query(collection(db, "locations"), orderBy("name"));
    const unsub = onSnapshot(qLoc, (snap) =>
      setLocations(snap.docs.map((d) => d.data().name)),
    );
    return () => unsub();
  }, []);

  const isComplete =
    cpId && siteName.trim() && date && unitNo.trim() && finding.trim();

  const stampState = submitted ? "submitted" : isComplete ? "ready" : "draft";

  function handleUnlock(e) {
    e.preventDefault();
    const ok = unlock(code.trim());
    if (!ok) {
      setCodeError("Incorrect code.");
      return;
    }
    setCode("");
    setCodeError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    if (!cpId) return setSubmitError("Please select a CP name.");
    if (!siteName.trim())
      return setSubmitError("Please enter the job site name.");
    if (!date) return setSubmitError("Please select the date of checking.");
    if (!unitNo.trim()) return setSubmitError("Please enter the unit no.");
    if (!finding.trim())
      return setSubmitError("Please enter the finding during check.");

    setSubmitting(true);
    try {
      await addDoc(collection(db, "qaqc_records"), {
        cpId,
        cpName,
        siteName: siteName.trim(),
        docket: docket.trim(),
        date,
        unitNo: unitNo.trim(),
        finding: finding.trim(),
        notes: notes.trim(),
        categories: buildCategoryChecklist(),
        rectifications: [],
        quotation: "",
        poNo: "",
        amountPo: null,
        incentive: null,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitError(
        "Failed to submit record. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setCpId("");
    setCpName("");
    setSiteName("");
    setDocket("");
    setDate(todayISO());
    setUnitNo("");
    setFinding("");
    setNotes("");
    setSubmitted(false);
    setSubmitError("");
  }

  if (!isStaff) {
    return (
      <div className="card locked-card">
        <div className="wo-eyebrow">access restricted</div>
        <h1 className="wo-title">QRCC Staff Only Module</h1>
        <p className="confirm-text">
          New records can only be created by QRCC department staff. Enter the
          staff code to continue.
        </p>
        <form className="locked-form" onSubmit={handleUnlock}>
          <input
            type="password"
            className="input"
            placeholder="QRCC staff code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary">
            Unlock
          </button>
        </form>
        {codeError && <p className="field-error">{codeError}</p>}
        <Link to="/list" className="btn-secondary-link locked-link">
          View QRCC List as Public
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card confirm-card">
        <StatusStamp state="submitted" />
        <h2 className="confirm-title">QRCC record submitted</h2>
        <p className="confirm-text">
          The inspection for <strong>{unitNo}</strong> at{" "}
          <strong>{siteName}</strong> on <strong>{date}</strong> by{" "}
          <strong>{cpName}</strong> has been saved.
        </p>
        <div className="confirm-actions">
          <button className="btn-primary" onClick={handleReset}>
            Create new record
          </button>
          <Link to="/list" className="btn-secondary-link">
            View QRCC List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="card work-order" onSubmit={handleSubmit}>
      <StatusStamp state={stampState} />

      <header className="wo-header">
        <div className="wo-eyebrow">14 Schedule Update Form</div>
        <h1 className="wo-title">Create New Form</h1>
        <div className="wo-id">
          REF&nbsp;
          {date.replaceAll("-", "")}
          -DRAFT
        </div>
      </header>

      <section className="wo-section">
        <div className="wo-section-title">01 &mdash; Inspection Details</div>
        <div className="grid-3">
          <DropdownAdd
            label="CP Name"
            collectionName="employees"
            options={employees}
            value={cpId}
            loading={loadingList}
            onChange={(id, label) => {
              setCpId(id);
              setCpName(label);
            }}
            placeholder="-- Choose CP Name --"
          />

          <div className="field">
            <label className="field-label">Job Site Name</label>
            <input
              type="text"
              className="input"
              placeholder="Eg: Twin Galexy"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              list="site-name-suggestions"
              autoComplete="off"
            />
            <datalist id="site-name-suggestions">
              {locations.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label className="field-label">Docket / Block</label>
            <input
              type="text"
              className="input"
              placeholder="Eg: BLOCK A"
              value={docket}
              onChange={(e) => setDocket(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">Date of Checking</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Unit No (Lift/Esc/DW/I-walk)</label>
            <input
              type="text"
              className="input"
              placeholder="Eg: L1, ESC A, DW2"
              value={unitNo}
              onChange={(e) => setUnitNo(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="wo-section">
        <div className="wo-section-title">02 &mdash; Finding During Check</div>
        <textarea
          className="input textarea"
          rows={5}
          placeholder="Write your findings..."
          value={finding}
          onChange={(e) => setFinding(e.target.value)}
        />
      </section>

      <section className="wo-section">
        <div className="wo-section-title">03 &mdash; Additional Notes</div>
        <textarea
          className="input textarea"
          rows={3}
          placeholder="Other notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      {submitError && <p className="field-error submit-error">{submitError}</p>}

      <div className="wo-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "SUBMIT"}
        </button>
      </div>
    </form>
  );
}
