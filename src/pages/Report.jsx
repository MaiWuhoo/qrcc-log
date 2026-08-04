import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase";
import {
  DEFECT_CATEGORIES,
  STATUS_LABEL,
  splitFindingLines,
} from "../constants";
import "./Report.css";

function thisMonthValue() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

const COLUMN_WIDTHS = [
  "55px", // No
  "150px", // Owner Name
  "100px", // Date AUDIT
  "150px", // Site Name
  "110px", // Docket
  "90px", // Unit No
  "500px", // Defect
  ...DEFECT_CATEGORIES.map(() => "95px"), // 9 lajur kategori
  "260px", // Update Defect/Remark
  "95px", // On Progres
  "95px", // Status
];
const BASE_HEADERS = [
  "No",
  "Owner Name",
  "Date AUDIT",
  "Site Name",
  "Docket",
  "Unit No",
  "Defect",
];
const TAIL_HEADERS = ["Rectification Record", "Rectified Date", "Status"];

export default function Report() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("month"); // "month" | "range" | "all"
  const [month, setMonth] = useState(thisMonthValue());
  const [fromMonth, setFromMonth] = useState(thisMonthValue());
  const [toMonth, setToMonth] = useState(thisMonthValue());
  const [cpFilter, setCpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
      if (statusFilter && (r.status || "pending") !== statusFilter)
        return false;
      return true;
    });
  }, [records, mode, month, fromMonth, toMonth, cpFilter, statusFilter]);

  const totals = useMemo(() => {
    return DEFECT_CATEGORIES.map((cat) =>
      filtered.reduce((sum, r) => {
        const found = r.categories?.find((c) => c.key === cat.key);
        return sum + (found?.checked ? 1 : 0);
      }, 0),
    );
  }, [filtered]);

  const headers = [
    ...BASE_HEADERS,
    ...DEFECT_CATEGORIES.map((c) => c.label),
    ...TAIL_HEADERS,
  ];

  function rowFor(r) {
    const catCells = DEFECT_CATEGORIES.map((cat) => {
      const found = r.categories?.find((c) => c.key === cat.key);
      return found?.checked ? 1 : "";
    });
    return {
      base: [r.siteName, r.docket || "", r.unitNo, r.finding],
      cats: catCells,
      tail: [
        r.updateRemark || "",
        r.dueDate || "",
        STATUS_LABEL[r.status] || "",
      ],
    };
  }

  function periodLabel() {
    if (mode === "month") return month;
    if (mode === "range") return `${fromMonth} - ${toMonth}`;
    return "All Record";
  }

  function handleExport() {
    const aoa = [];
    aoa.push(headers);
    aoa.push(["", "", "", "", "", "", "TOTAL", ...totals, "", "", ""]);
    filtered.forEach((r, idx) => {
      const row = rowFor(r);
      const excelBase = [...row.base];
      excelBase[3] = splitFindingLines(r.finding).join("\n"); // Defect
      aoa.push([
        idx + 1,
        r.cpName,
        r.date,
        ...excelBase,
        ...row.cats,
        ...row.tail,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Cuba aktifkan "Wrap Text" untuk lajur Defect supaya baris (\n)
    // nampak tersusun bila dibuka dalam Excel. Sokongan style pada
    // package xlsx percuma ni terhad — kalau Excel awak tak papar
    // wrap automatik, boleh select lajur Defect & klik "Wrap Text"
    // secara manual sekali sahaja.
    const defectColIndex = 6;
    for (let r = 2; r <= filtered.length + 1; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: defectColIndex });
      if (ws[addr]) {
        ws[addr].s = { alignment: { wrapText: true, vertical: "top" } };
      }
    }

    ws["!cols"] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 40 },
      ...DEFECT_CATEGORIES.map(() => ({ wch: 10 })),
      { wch: 30 },
      { wch: 10 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QRCC Report");

    const cpSuffix = cpFilter
      ? `-${employees.find((e) => e.id === cpFilter)?.name || "cp"}`
      : "";
    const statusSuffix = statusFilter ? `-${STATUS_LABEL[statusFilter]}` : "";
    const filename = `QAQC-Report-${periodLabel().replace(/\s/g, "")}${cpSuffix}${statusSuffix}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  const selectedCpName = employees.find((e) => e.id === cpFilter)?.name;
  const statusLabel = statusFilter ? STATUS_LABEL[statusFilter] : "";

  function subtitleParts() {
    const parts = [];
    parts.push(selectedCpName ? `Report For ${selectedCpName}` : "All Report");
    if (statusLabel) parts.push(`status ${statusLabel}`);
    parts.push(`— ${periodLabel()}`);
    return parts.join(" ");
  }

  return (
    <div className="card report-card">
      <header className="list-header">
        <div className="wo-eyebrow">Report</div>
        <h1 className="wo-title">QRCC Report</h1>
        <p className="list-sub">{subtitleParts()}</p>
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

        <div className="field">
          <label className="field-label">Status</label>
          <select
            className="input select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-primary report-export-btn"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          Export to Excel
        </button>
      </div>

      {loading ? (
        <div className="list-empty">Store data...</div>
      ) : filtered.length === 0 ? (
        <div className="list-empty">Record Not Found.</div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className={
                      DEFECT_CATEGORIES.some((c) => c.label === h)
                        ? "rt-cat-head"
                        : h === "Defect"
                          ? "rt-defect-head"
                          : ""
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
              <tr className="rt-total-row">
                <td colSpan={6}>TOTAL ({filtered.length} rekod)</td>
                <td />
                {totals.map((t, i) => (
                  <td key={i} className="rt-total-cell">
                    {t}
                  </td>
                ))}
                <td colSpan={3} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const row = rowFor(r);
                return (
                  <tr key={r.id}>
                    <td className="mono">{idx + 1}</td>
                    <td>{r.cpName}</td>
                    <td className="mono rt-date-cell">{r.date}</td>
                    <td>{row.base[0]}</td>
                    <td>{row.base[1] || "—"}</td>
                    <td>{row.base[2]}</td>
                    <td className="rt-defect-cell">
                      <ul className="finding-list">
                        {splitFindingLines(row.base[3]).map((line, li) => (
                          <li key={li}>{line}</li>
                        ))}
                      </ul>
                    </td>
                    {row.cats.map((v, i) => (
                      <td key={i} className="rt-cat-cell">
                        {v}
                      </td>
                    ))}
                    <td className="rt-remark-cell">{row.tail[0] || "—"}</td>
                    <td>{row.tail[1]}</td>
                    <td>
                      <span className={`badge badge-${r.status || "pending"}`}>
                        {row.tail[2]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
