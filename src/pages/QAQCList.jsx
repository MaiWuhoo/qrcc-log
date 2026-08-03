import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { countCheckedDefects, STATUS_LABEL } from "../constants";
import "./QAQCList.css";

export default function QAQCList() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cpFilter, setCpFilter] = useState("");

  useEffect(() => {
    const qRecords = query(
      collection(db, "qaqc_records"),
      orderBy("createdAt", "desc"),
    );
    const unsub1 = onSnapshot(qRecords, (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const qEmp = query(collection(db, "employees"), orderBy("name"));
    const unsub2 = onSnapshot(qEmp, (snap) =>
      setEmployees(snap.docs.map((d) => ({ id: d.id, name: d.data().name }))),
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (cpFilter && r.cpId !== cpFilter) return false;
      return true;
    });
  }, [records, cpFilter]);

  const selectedCpName = employees.find((e) => e.id === cpFilter)?.name;

  return (
    <div className="card list-card">
      <header className="list-header">
        <div className="wo-eyebrow">Record List</div>
        <h1 className="wo-title">Form List</h1>
        <p className="list-sub">
          {selectedCpName
            ? `QRCC History Record ${selectedCpName}.`
            : "All Defect Record"}
        </p>
      </header>

      <div className="list-filters">
        <div className="field">
          <label className="field-label">CP Name</label>
          <select
            className="input select"
            value={cpFilter}
            onChange={(e) => setCpFilter(e.target.value)}
          >
            <option value="">All CP</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <Link to="/" className="btn-secondary-link list-cta">
          + Create New Form
        </Link>
      </div>

      <div className="list-table">
        <div className="list-row list-row-head">
          <div>Date</div>
          <div>Site Name</div>
          <div>Unit No</div>
          <div>Name CP</div>
          <div>Defect</div>
          <div>Due Date</div>
          <div>Status</div>
          <div />
        </div>

        {loading && <div className="list-empty">Store record...</div>}

        {!loading && filtered.length === 0 && (
          <div className="list-empty">Not record found.</div>
        )}

        {filtered.map((r) => {
          const total = countCheckedDefects(r.categories);
          const status = r.status || "pending";
          return (
            <Link to={`/senarai/${r.id}`} key={r.id} className="list-row">
              <div className="mono">{r.date}</div>
              <div>{r.siteName}</div>
              <div>{r.unitNo}</div>
              <div>{r.cpName}</div>
              <div className="mono">{total}</div>
              <div className="mono">{r.dueDate || "—"}</div>
              <div>
                <span className={`badge badge-${status}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <div className="list-row-arrow">&rarr;</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
