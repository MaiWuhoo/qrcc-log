import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
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
import { Target, CheckCircle2, TrendingUp } from "lucide-react";
import { db } from "../firebase";
import { thisMonthValue } from "../constants";
import "./PekerjaDetail.css";

function lastNMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
}

export default function PekerjaDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [targets, setTargets] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub1 = onSnapshot(
      doc(db, "employees", id),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        setEmployee({ id: snap.id, ...snap.data() });
      },
      () => setNotFound(true),
    );

    const qTargets = query(
      collection(db, "employee_targets"),
      where("employeeId", "==", id),
    );
    const unsub2 = onSnapshot(qTargets, (snap) => {
      setTargets(snap.docs.map((d) => d.data()));
      setLoading(false);
    });

    const qRecords = query(
      collection(db, "qaqc_records"),
      where("cpId", "==", id),
    );
    const unsub3 = onSnapshot(qRecords, (snap) =>
      setRecords(snap.docs.map((d) => d.data())),
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [id]);

  const months = useMemo(() => lastNMonths(6), []);

  const chartData = useMemo(() => {
    return months.map((m) => {
      const targetDoc = targets.find((t) => t.month === m);
      const achieved = records.filter((r) => r.date?.startsWith(m)).length;
      return {
        month: m,
        Target: targetDoc?.targetUnit ?? 0,
        Achieved: achieved,
      };
    });
  }, [months, targets, records]);

  const currentMonth = thisMonthValue();
  const currentRow = chartData.find((c) => c.month === currentMonth);
  const currentTarget = currentRow?.Target ?? 0;
  const currentAchieved = currentRow?.Achieved ?? 0;
  const currentPct =
    currentTarget > 0
      ? Math.round((currentAchieved / currentTarget) * 100)
      : null;

  if (notFound) {
    return (
      <div className="card">
        <p>Employee not found.</p>
        <Link to="/employees" className="btn-secondary-link">
          Back to Employee List
        </Link>
      </div>
    );
  }

  if (loading || !employee) {
    return <div className="card">Loading...</div>;
  }

  return (
    <div className="card pekerja-detail-card">
      <Link to="/employees" className="back-link">
        &larr; Employee List
      </Link>

      <header className="wo-header">
        <div className="wo-eyebrow">individual analytics</div>
        <h1 className="wo-title">{employee.name}</h1>
        <div className="wo-id">{employee.branch || "Branch not set"}</div>
      </header>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon summary-icon-total">
            <Target size={20} />
          </div>
          <div>
            <div className="summary-value">{currentTarget}</div>
            <div className="summary-label">Target ({currentMonth})</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon summary-icon-done">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="summary-value">{currentAchieved}</div>
            <div className="summary-label">Achieved ({currentMonth})</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon summary-icon-pending">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="summary-value">
              {currentPct === null ? "—" : `${currentPct}%`}
            </div>
            <div className="summary-label">% Achievement</div>
          </div>
        </div>
      </div>

      <div className="chart-panel">
        <div className="wo-section-title">
          Target vs Achieved (Last 6 Months)
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Target" fill="#5b4b8a" />
            <Bar dataKey="Achieved" fill="#4c7a5e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
