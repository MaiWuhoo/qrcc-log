import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase";
import {
  DEFECT_CATEGORIES,
  STATUS_LABEL,
  splitFindingLines,
  thisMonthValue,
  getCategoryTooltip,
  // formatRM, // not used while Incentive column is hidden
} from "../constants";
import "./Report.css";

const BASE_HEADERS = [
  "No",
  "Owner Name",
  "Date AUDIT",
  "Site Name",
  "Docket",
  "Unit No",
  "Defect Found",
];
const TAIL_HEADERS = [
  "Update Defect/Remark",
  // "Incentive",
  // "On Progress",
  // "Status",
];

// Width of each column (matches the headers order above). Want to
// widen a column? Just change the number here — everything else stays.
const COLUMN_WIDTHS = [
  "55px", // No
  "150px", // Owner Name
  "100px", // Date AUDIT
  "150px", // Site Name
  "110px", // Docket
  "90px", // Unit No
  "340px", // Defect
  ...DEFECT_CATEGORIES.map(() => "105px"), // 9 category columns
  "260px", // Update Defect/Remark
  // "110px", // Incentive
  // "95px", // On Progress
  // "95px", // Status
];

export default function Report() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("range"); // "range" | "all"
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
      if (mode === "range") {
        const from = `${fromMonth}-01`;
        const to = `${toMonth}-31`;
        if (r.date < from || r.date > to) return false;
      }
      // mode === "all" -> no date filter at all
      if (cpFilter && r.cpId !== cpFilter) return false;
      if (statusFilter && (r.status || "pending") !== statusFilter)
        return false;
      return true;
    });
  }, [records, mode, fromMonth, toMonth, cpFilter, statusFilter]);

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
      rects: r.rectifications || [],
      // incentive: r.incentive ?? null,
      // tail: [r.status === "pending" ? "Yes" : "", STATUS_LABEL[r.status] || ""],
    };
  }

  function periodLabel() {
    if (mode === "all") return "All Records";
    return fromMonth === toMonth ? fromMonth : `${fromMonth} - ${toMonth}`;
  }

  function handleExport() {
    const aoa = [];
    aoa.push(headers);
    aoa.push(["", "", "", "", "", "", "TOTAL", ...totals, ""]);
    filtered.forEach((r, idx) => {
      const row = rowFor(r);
      const excelBase = [...row.base];
      excelBase[3] = splitFindingLines(r.finding).join("\n"); // Defect
      const remarkExcel = row.rects.length
        ? row.rects.map((rec, ri) => `${ri + 1}. ${rec.text}`).join("\n")
        : "";
      aoa.push([
        idx + 1,
        r.cpName,
        r.date,
        ...excelBase,
        ...row.cats,
        remarkExcel,
        // row.incentive !== null ? row.incentive : "",
        // ...row.tail,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Try to enable "Wrap Text" for the Defect and Remark columns so
    // line breaks (\n) render nicely when opened in Excel. Style
    // support in the free xlsx package is limited — if it doesn't
    // apply automatically, select those columns in Excel and click
    // "Wrap Text" once.
    const defectColIndex = 6;
    const remarkColIndex = 7 + DEFECT_CATEGORIES.length;
    for (let r = 2; r <= filtered.length + 1; r++) {
      [defectColIndex, remarkColIndex].forEach((c) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) {
          ws[addr].s = { alignment: { wrapText: true, vertical: "top" } };
        }
      });
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
      // { wch: 12 }, // Incentive
      // { wch: 10 }, // On Progress
      // { wch: 10 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QRCC Report");

    const cpSuffix = cpFilter
      ? `-${employees.find((e) => e.id === cpFilter)?.name || "cp"}`
      : "";
    const statusSuffix = statusFilter ? `-${STATUS_LABEL[statusFilter]}` : "";
    const filename = `QRCC-Report-${periodLabel().replace(/\s/g, "")}${cpSuffix}${statusSuffix}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  const selectedCpName = employees.find((e) => e.id === cpFilter)?.name;
  const statusLabel = statusFilter ? STATUS_LABEL[statusFilter] : "";

  function subtitleParts() {
    const parts = [];
    parts.push(selectedCpName ? `Report for ${selectedCpName}` : "All records");
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
        <div className="field">
          <label className="field-label">From</label>
          <input
            type="month"
            className="input"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            disabled={mode === "all"}
          />
        </div>
        <div className="field">
          <label className="field-label">To</label>
          <input
            type="month"
            className="input"
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            disabled={mode === "all"}
          />
        </div>

        <div className="field checkbox-field">
          <label className="field-label">&nbsp;</label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={mode === "all"}
              onChange={(e) => setMode(e.target.checked ? "all" : "range")}
            />
            All Months
          </label>
        </div>

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
        <div className="list-empty">Loading data...</div>
      ) : filtered.length === 0 ? (
        <div className="list-empty">No records match this filter.</div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <colgroup>
              {COLUMN_WIDTHS.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {headers.map((h) => {
                  const cat = DEFECT_CATEGORIES.find((c) => c.label === h);
                  return (
                    <th
                      key={h}
                      title={cat ? getCategoryTooltip(cat.key) : undefined}
                      className={
                        cat
                          ? "rt-cat-head"
                          : h === "Defect Found"
                            ? "rt-defect-head"
                            : ""
                      }
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
              <tr className="rt-total-row">
                <td colSpan={6}>TOTAL ({filtered.length} records)</td>
                <td />
                {totals.map((t, i) => (
                  <td key={i} className="rt-total-cell">
                    {t}
                  </td>
                ))}
                <td colSpan={1} />
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
                    <td className="rt-remark-cell">
                      {row.rects.length === 0 ? (
                        "—"
                      ) : (
                        <ol className="rect-numbered-list">
                          {row.rects.map((rec, ri) => (
                            <li key={ri}>{rec.text}</li>
                          ))}
                        </ol>
                      )}
                    </td>
                    {/* <td className="mono">{formatRM(row.incentive)}</td>
                    <td>{row.tail[0]}</td>
                    <td>
                      <span className={`badge badge-${r.status || "pending"}`}>
                        {row.tail[1]}
                      </span>
                    </td> */}
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
