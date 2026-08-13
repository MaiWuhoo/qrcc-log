import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import { thisMonthValue } from "../constants";
import { useStaff } from "../StaffContext";
import "./Pekerja.css";

export default function Pekerja() {
  const { isStaff } = useStaff();

  const [employees, setEmployees] = useState([]);
  const [targets, setTargets] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addError, setAddError] = useState("");

  const [viewMonth, setViewMonth] = useState(thisMonthValue());

  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetEmpId, setTargetEmpId] = useState("");
  const [targetMonthInput, setTargetMonthInput] = useState(thisMonthValue());
  const [targetValue, setTargetValue] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const qEmp = query(collection(db, "employees"), orderBy("name"));
    const unsub1 = onSnapshot(qEmp, (snap) => {
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsub2 = onSnapshot(collection(db, "employee_targets"), (snap) =>
      setTargets(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    const unsub3 = onSnapshot(collection(db, "qaqc_records"), (snap) =>
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const tableRows = useMemo(() => {
    return employees.map((emp) => {
      const targetDoc = targets.find(
        (t) => t.employeeId === emp.id && t.month === viewMonth,
      );
      const targetUnit = targetDoc?.targetUnit ?? null;
      const achieved = records.filter(
        (r) => r.cpId === emp.id && r.date?.startsWith(viewMonth),
      ).length;
      const pct =
        targetUnit && targetUnit > 0
          ? Math.round((achieved / targetUnit) * 100)
          : null;
      return { ...emp, targetUnit, achieved, pct };
    });
  }, [employees, targets, records, viewMonth]);

  async function handleAddEmployee(e) {
    e.preventDefault();
    setAddError("");
    if (!newName.trim()) return setAddError("Please enter employee name.");
    setAddingEmployee(true);
    try {
      await addDoc(collection(db, "employees"), {
        name: newName.trim(),
        branch: newBranch.trim(),
        createdAt: serverTimestamp(),
      });
      setNewName("");
      setNewBranch("");
    } catch (err) {
      console.error(err);
      setAddError("Failed to save. Please try again.");
    } finally {
      setAddingEmployee(false);
    }
  }

  async function handleSaveTarget(e) {
    e.preventDefault();
    setTargetError("");
    if (!targetEmpId) return setTargetError("Please select an employee.");
    if (targetValue === "" || Number(targetValue) < 0)
      return setTargetError("Please enter a target unit.");

    setSavingTarget(true);
    try {
      const emp = employees.find((e) => e.id === targetEmpId);
      const docId = `${targetEmpId}_${targetMonthInput}`;
      await setDoc(
        doc(db, "employee_targets", docId),
        {
          employeeId: targetEmpId,
          employeeName: emp?.name || "",
          branch: emp?.branch || "",
          month: targetMonthInput,
          targetUnit: Number(targetValue),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setTargetValue("");
      setShowTargetForm(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      console.error(err);
      setTargetError("Failed to save. Please try again.");
    } finally {
      setSavingTarget(false);
    }
  }

  if (!isStaff) {
    return (
      <div className="card locked-card">
        <div className="wo-eyebrow">access restricted</div>
        <h1 className="wo-title">QRCC Staff Only Module</h1>
        <p className="confirm-text">
          Managing employees and monthly targets is restricted to QRCC
          department staff. Log in as staff from the sidebar to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="card pekerja-card">
      <header className="list-header">
        <div className="wo-eyebrow">employees</div>
        <h1 className="wo-title">Employees & Monthly Targets</h1>
        <p className="list-sub">
          Click an employee's name to view their individual analytics (Target vs
          Achieved).
        </p>
      </header>

      <section className="wo-section">
        <div className="wo-section-title">Add Employee</div>
        <form className="pekerja-add-form" onSubmit={handleAddEmployee}>
          <div className="field">
            <label className="field-label">Employee Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Ahmad"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Branch</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Johor Bahru"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
            />
          </div>
          <div className="field pekerja-add-btn-field">
            <label className="field-label">&nbsp;</label>
            <button
              type="submit"
              className="btn-primary"
              disabled={addingEmployee}
            >
              {addingEmployee ? "..." : "+ Add Employee"}
            </button>
          </div>
        </form>
        {addError && <p className="field-error">{addError}</p>}
      </section>

      <section className="wo-section">
        <div className="wo-section-title">Monthly Target List</div>

        <div className="pekerja-toolbar">
          <div className="field pekerja-month-field">
            <label className="field-label">Month</label>
            <input
              type="month"
              className="input"
              value={viewMonth}
              onChange={(e) => setViewMonth(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary pekerja-set-target-btn"
            onClick={() => {
              setShowTargetForm((v) => !v);
              setTargetMonthInput(viewMonth);
            }}
          >
            {showTargetForm ? "Cancel" : "+ Set Target"}
          </button>
        </div>

        {showTargetForm && (
          <form className="pekerja-target-form" onSubmit={handleSaveTarget}>
            <div className="field">
              <label className="field-label">Employee</label>
              <select
                className="input select"
                value={targetEmpId}
                onChange={(e) => setTargetEmpId(e.target.value)}
              >
                <option value="">-- Select employee --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Month</label>
              <input
                type="month"
                className="input"
                value={targetMonthInput}
                onChange={(e) => setTargetMonthInput(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Target Unit</label>
              <input
                type="number"
                min="0"
                className="input"
                placeholder="0"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="field pekerja-add-btn-field">
              <label className="field-label">&nbsp;</label>
              <button
                type="submit"
                className="btn-primary"
                disabled={savingTarget}
              >
                {savingTarget ? "..." : "Save Target"}
              </button>
            </div>
          </form>
        )}
        {targetError && <p className="field-error">{targetError}</p>}
        {savedFlash && <p className="saved-flash">Target saved.</p>}

        {loading ? (
          <div className="list-empty">Loading employees...</div>
        ) : tableRows.length === 0 ? (
          <div className="list-empty">No employees yet. Add one above.</div>
        ) : (
          <div className="pekerja-table">
            <div className="pekerja-row pekerja-row-head">
              <div>Name</div>
              <div>Branch</div>
              <div>Target</div>
              <div>Achieved</div>
              <div>% Achievement</div>
              <div />
            </div>
            {tableRows.map((row) => (
              <Link
                to={`/employees/${row.id}`}
                key={row.id}
                className="pekerja-row"
              >
                <div>{row.name}</div>
                <div>{row.branch || "—"}</div>
                <div className="mono">{row.targetUnit ?? "—"}</div>
                <div className="mono">{row.achieved}</div>
                <div>
                  {row.pct === null ? (
                    "—"
                  ) : (
                    <span
                      className={`badge ${row.pct >= 100 ? "badge-done" : "badge-pending"}`}
                    >
                      {row.pct}%
                    </span>
                  )}
                </div>
                <div className="pekerja-row-arrow">&rarr;</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
