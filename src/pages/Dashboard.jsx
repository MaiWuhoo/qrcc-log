import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { db } from "../firebase";
import { DEFECT_CATEGORIES } from "../constants";
import "./Dashboard.css";

function thisMonthValue() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

const CATEGORY_COLORS = {
  motor: "#2f6690",
  main_rope: "#c1442d",
  gear_box: "#7a8a3d",
  pulley: "#8f6b9e",
  gov_rope: "#2f9e8f",
  brake: "#f2a93b",
  lift_elec: "#7c8fd9",
  esc_mechanical: "#d98aa3",
  esc_electrical: "#8fc78a",
};
const TOTAL_COLOR = "#5b4b8a";

function countCategory(records, key) {
  return records.reduce((sum, r) => {
    const found = r.categories?.find((c) => c.key === key);
    return sum + (found?.checked ? 1 : 0);
  }, 0);
}

function totalDefectsIn(records) {
  // Setiap FORM/rekod dikira sebagai SATU defect (bukan jumlah kategori
  // yang ditandakan dalam form tu).
  return records.length;
}

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("month");
  const [month, setMonth] = useState(thisMonthValue());
  const [fromMonth, setFromMonth] = useState(thisMonthValue());
  const [toMonth, setToMonth] = useState(thisMonthValue());
  const [cpFilter, setCpFilter] = useState("");

  useEffect(() => {
    const qRecords = query(
      collection(db, "qaqc_records"),
      orderBy("date", "asc"),
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
      if (!r.date) return false;
      if (mode === "month") {
        if (!r.date.startsWith(month)) return false;
      } else if (mode === "range") {
        const from = `${fromMonth}-01`;
        const to = `${toMonth}-31`;
        if (r.date < from || r.date > to) return false;
      }
      // mode === "all" -> tiada tapisan tarikh langsung
      if (cpFilter && r.cpId !== cpFilter) return false;
      return true;
    });
  }, [records, mode, month, fromMonth, toMonth, cpFilter]);

  const pendingRecords = useMemo(
    () => filtered.filter((r) => (r.status || "pending") === "pending"),
    [filtered],
  );
  const doneRecords = useMemo(
    () => filtered.filter((r) => r.status === "done"),
    [filtered],
  );

  const totalDefect = useMemo(() => totalDefectsIn(filtered), [filtered]);
  const totalDone = useMemo(() => totalDefectsIn(doneRecords), [doneRecords]);
  const totalPending = useMemo(
    () => totalDefectsIn(pendingRecords),
    [pendingRecords],
  );

  const chartData = useMemo(() => {
    function bucketRow(name, recs) {
      const row = { name };
      DEFECT_CATEGORIES.forEach((cat) => {
        row[cat.key] = countCategory(recs, cat.key);
      });
      row.totalDefect = totalDefectsIn(recs);
      return row;
    }
    return [
      bucketRow("Total", filtered),
      bucketRow("On Progres", pendingRecords),
      bucketRow("Done", doneRecords),
    ];
  }, [filtered, pendingRecords, doneRecords]);

  function periodLabel() {
    if (mode === "month") return month;
    if (mode === "range") return `${fromMonth} - ${toMonth}`;
    return "Semua Rekod";
  }

  const selectedCpName = employees.find((e) => e.id === cpFilter)?.name;

  return (
    <div className="card dashboard-card">
      <header className="list-header">
        <h1 className="wo-title">Dashboard</h1>
        <p className="list-sub">
          {selectedCpName
            ? `${selectedCpName} — ${periodLabel()}`
            : `All Report — ${periodLabel()}`}
        </p>
      </header>

      <div className="report-filters">
        <div className="field mode-field">
          <label className="field-label">Report Type</label>
          <div className="toggle-row">
            <button
              type="button"
              className={`toggle-btn${mode === "month" ? " toggle-btn-active" : ""}`}
              onClick={() => setMode("month")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`toggle-btn${mode === "range" ? " toggle-btn-active" : ""}`}
              onClick={() => setMode("range")}
            >
              Monthly Range
            </button>
            <button
              type="button"
              className={`toggle-btn${mode === "all" ? " toggle-btn-active" : ""}`}
              onClick={() => setMode("all")}
            >
              All Month
            </button>
          </div>
        </div>

        {mode === "month" && (
          <div className="field">
            <label className="field-label">Month</label>
            <input
              type="month"
              className="input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        )}

        {mode === "range" && (
          <>
            <div className="field">
              <label className="field-label">From</label>
              <input
                type="month"
                className="input"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Untill</label>
              <input
                type="month"
                className="input"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
              />
            </div>
          </>
        )}

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
      </div>

      {loading ? (
        <div className="list-empty">Store Data...</div>
      ) : filtered.length === 0 ? (
        <div className="list-empty">Record not found.</div>
      ) : (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-icon summary-icon-total">
                <ClipboardList size={20} />
              </div>
              <div>
                <div className="summary-value">{totalDefect}</div>
                <div className="summary-label">Total Defect</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon summary-icon-done">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="summary-value">{totalDone}</div>
                <div className="summary-label">Total Defect Done</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon summary-icon-pending">
                <Clock size={20} />
              </div>
              <div>
                <div className="summary-value">{totalPending}</div>
                <div className="summary-label">Total Defect Pending</div>
              </div>
            </div>
          </div>

          <div className="chart-panel">
            <div className="wo-section-title">Defect Schedule</div>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "No of Callout",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fill: "var(--steel)" },
                  }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {DEFECT_CATEGORIES.map((cat) => (
                  <Bar
                    key={cat.key}
                    dataKey={cat.key}
                    name={cat.label}
                    fill={CATEGORY_COLORS[cat.key]}
                  />
                ))}
                <Bar
                  dataKey="totalDefect"
                  name="Total Defect"
                  fill={TOTAL_COLOR}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
