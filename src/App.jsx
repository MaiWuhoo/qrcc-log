import { useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  Users,
  FileBarChart,
  ChevronDown,
} from "lucide-react";
import Dashboard from "./pages/Dashboard";
import CreateQAQC from "./pages/CreateQAQC";
import QAQCList from "./pages/QAQCList";
import QAQCDetails from "./pages/QAQCDetails";
import Report from "./pages/Report";
import StaffPanel from "./components/StaffPanel";
import "./App.css";

const modules = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    kind: "single",
    to: "/",
  },
  {
    key: "qaqc",
    label: "QRCC",
    icon: ClipboardCheck,
    kind: "group",
    children: [
      { to: "/new", label: "New Defect", end: true },
      { to: "/list", label: "Defect List" },
    ],
  },
  // { key: "lokasi", label: "Lif & Lokasi", icon: Building2, kind: "disabled" },
  // { key: "pekerja", label: "Pekerja", icon: Users, kind: "disabled" },
  {
    key: "laporan",
    label: "Report",
    icon: FileBarChart,
    kind: "single",
    to: "/report",
  },
];

export default function App() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({ qaqc: true });
  const [logoError, setLogoError] = useState(false);

  function toggleGroup(key) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {logoError ? (
            <span className="brand-mark">QC</span>
          ) : (
            <img
              src="/logo.jpg"
              alt="Logo"
              className="brand-mark brand-mark-img"
              onError={() => setLogoError(true)}
            />
          )}
          <div>
            <div className="brand-title">QRCC LOG</div>
          </div>
        </div>

        <div className="nav-section-label">Menu</div>

        <nav className="nav">
          {modules.map((m) => {
            const Icon = m.icon;

            if (m.kind === "single") {
              return (
                <NavLink
                  key={m.key}
                  to={m.to}
                  end
                  className={({ isActive }) =>
                    "nav-group-head" +
                    (isActive ? " nav-group-head-active" : "")
                  }
                >
                  <Icon size={17} strokeWidth={2} className="nav-group-icon" />
                  <span className="nav-group-text">{m.label}</span>
                </NavLink>
              );
            }

            if (m.kind === "disabled") {
              return (
                <div
                  key={m.key}
                  className="nav-group-head nav-group-head-disabled"
                >
                  <Icon size={17} strokeWidth={2} className="nav-group-icon" />
                  <span className="nav-group-text">{m.label}</span>
                  <span className="nav-badge">akan datang</span>
                </div>
              );
            }

            // kind === "group"
            const isGroupActive = m.children.some((c) =>
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
                    (isGroupActive ? " nav-group-head-active" : "")
                  }
                  onClick={() => toggleGroup(m.key)}
                >
                  <Icon size={17} strokeWidth={2} className="nav-group-icon" />
                  <span className="nav-group-text">{m.label}</span>
                  <ChevronDown
                    size={15}
                    className={
                      "nav-chevron" + (isOpen ? " nav-chevron-open" : "")
                    }
                  />
                </button>

                {isOpen && (
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
        <div className="sidebar-footer">v0.4 &middot;</div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<CreateQAQC />} />
          <Route path="/list" element={<QAQCList />} />
          <Route path="/list/:id" element={<QAQCDetails />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </main>
    </div>
  );
}
