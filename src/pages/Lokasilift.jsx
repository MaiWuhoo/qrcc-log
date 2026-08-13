import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import { useStaff } from "../StaffContext";
import "./LokasiLift.css";

export default function LokasiLift() {
  const { isStaff } = useStaff();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const qLoc = query(collection(db, "locations"), orderBy("name"));
    const unsub = onSnapshot(qLoc, (snap) => {
      setLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    const trimmed = newName.trim();
    if (!trimmed) return setError("Please enter a location/site name.");
    if (locations.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError("This name already exists in the list.");
    }
    setAdding(true);
    try {
      await addDoc(collection(db, "locations"), {
        name: trimmed,
        createdAt: serverTimestamp(),
      });
      setNewName("");
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  if (!isStaff) {
    return (
      <div className="card locked-card">
        <div className="wo-eyebrow">access restricted</div>
        <h1 className="wo-title">QRCC Staff Only Module</h1>
        <p className="confirm-text">
          Managing the location/site list is restricted to QRCC department
          staff. Log in as staff from the sidebar to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="card lokasi-card">
      <header className="list-header">
        <div className="wo-eyebrow">locations</div>
        <h1 className="wo-title">Location / Site List</h1>
        <p className="list-sub">
          Saved site/location names — will appear as suggestions when typing in
          the "Job Site Name" field on the Create QRCC form.
        </p>
      </header>

      <section className="wo-section">
        <div className="wo-section-title">Add Location</div>
        <form className="lokasi-add-form" onSubmit={handleAdd}>
          <div className="field">
            <label className="field-label">Location / Site Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Hotel Grand Bayview"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="field lokasi-add-btn-field">
            <label className="field-label">&nbsp;</label>
            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? "..." : "+ Add Location"}
            </button>
          </div>
        </form>
        {error && <p className="field-error">{error}</p>}
      </section>

      <section className="wo-section">
        <div className="wo-section-title">Saved List ({locations.length})</div>
        {loading ? (
          <div className="list-empty">Loading...</div>
        ) : locations.length === 0 ? (
          <div className="list-empty">No locations yet. Add one above.</div>
        ) : (
          <div className="lokasi-chips">
            {locations.map((l) => (
              <span key={l.id} className="lokasi-chip">
                {l.name}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
