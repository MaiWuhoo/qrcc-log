import { useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import {
  ClipboardCheck,
  Building2,
  Users,
  FileBarChart,
  ChevronDown,
} from "lucide-react";
import CreateQAQC from "./pages/CreateQAQC";
import QAQCList from "./pages/QAQCList";
import QAQCDetails from "./pages/QAQCDetails";
import Report from "./pages/Report";
import StaffPanel from "./components/StaffPanel";
import "./App.css";

const modules = [
  {
    key: "qaqc",
    label: "QRCC",
    icon: ClipboardCheck,
    ready: true,
    children: [
      { to: "/", label: "New Defect", end: true },
      { to: "/senarai", label: "Defect List" },
    ],
  },
  // { key: "lokasi", label: "Lif & Lokasi", icon: Building2, ready: false },
  // { key: "pekerja", label: "Pekerja", icon: Users, ready: false },
  {
    key: "laporan",
    label: "Report",
    icon: FileBarChart,
    ready: true,
    children: [{ to: "/laporan", label: "Report", end: true }],
  },
];

export default function App() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({ qaqc: true });

  function toggleGroup(key) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">QC</span>
          <div>
            <div className="brand-title">QRCC LOG</div>
            {/* <div className="brand-sub">Maintenance Dept.</div> */}
          </div>
        </div>

        <div className="nav-section-label">Menu</div>

        <nav className="nav">
          {modules.map((m) => {
            const Icon = m.icon;
            const isGroupActive =
              m.ready &&
              m.children.some((c) =>
                c.end
                  ? location.pathname === c.to
                  : location.pathname.startsWith(c.to),
              );
            const isOpen = !!openGroups[m.key];

            return (
              <div className="nav-group" key={m.key}>
                <button
                  type="button"
                  className={
                    "nav-group-head" +
                    (isGroupActive ? " nav-group-head-active" : "") +
                    (!m.ready ? " nav-group-head-disabled" : "")
                  }
                  onClick={() => m.ready && toggleGroup(m.key)}
                  disabled={!m.ready}
                >
                  <Icon size={17} strokeWidth={2} className="nav-group-icon" />
                  <span className="nav-group-text">{m.label}</span>
                  {m.ready ? (
                    <ChevronDown
                      size={15}
                      className={
                        "nav-chevron" + (isOpen ? " nav-chevron-open" : "")
                      }
                    />
                  ) : (
                    <span className="nav-badge">akan datang</span>
                  )}
                </button>

                {m.ready && isOpen && (
                  <div className="nav-children">
                    {m.children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        className={({ isActive }) =>
                          "nav-item-sub" +
                          (isActive ? " nav-item-sub-active" : "")
                        }
                        end={c.end}
                      >
                        <span className="nav-dot" />
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <StaffPanel />
        <div className="sidebar-footer">v0.3</div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<CreateQAQC />} />
          <Route path="/senarai" element={<QAQCList />} />
          <Route path="/senarai/:id" element={<QAQCDetails />} />
          <Route path="/laporan" element={<Report />} />
        </Routes>
      </main>
    </div>
  );
}
