import { useState } from "react";
import { useStaff } from "../StaffContext";

export default function StaffPanel() {
  const { isStaff, unlock, lock } = useStaff();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const ok = unlock(code.trim());
    if (ok) {
      setCode("");
      setError("");
      setOpen(false);
    } else {
      setError("Kod salah.");
    }
  }

  if (isStaff) {
    return (
      <div className="staff-panel">
        <span className="staff-status staff-status-on">QRCC Staff</span>
        <button type="button" className="staff-link" onClick={lock}>
          Log Out
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="staff-panel">
        <span className="staff-status">Public</span>
        <button
          type="button"
          className="staff-link"
          onClick={() => setOpen(true)}
        >
          Log In Staff
        </button>
      </div>
    );
  }

  return (
    <form className="staff-panel staff-panel-form" onSubmit={handleSubmit}>
      <input
        type="password"
        autoFocus
        className="staff-input"
        placeholder="QRCC Staff Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="staff-panel-actions">
        <button type="submit" className="staff-link staff-link-primary">
          Open
        </button>
        <button
          type="button"
          className="staff-link"
          onClick={() => {
            setOpen(false);
            setError("");
            setCode("");
          }}
        >
          Cancel
        </button>
      </div>
      {error && <p className="staff-error">{error}</p>}
    </form>
  );
}
