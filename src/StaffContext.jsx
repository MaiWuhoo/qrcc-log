import { createContext, useContext, useEffect, useState } from "react";

const StaffContext = createContext(null);
const STORAGE_KEY = "qaqc_staff_unlocked";

export function StaffProvider({ children }) {
  const [isStaff, setIsStaff] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );

  useEffect(() => {
    if (isStaff) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isStaff]);

  function unlock(code) {
    const correct = import.meta.env.VITE_QAQC_STAFF_CODE;
    if (!correct) {
      console.warn(
        "VITE_QAQC_STAFF_CODE belum diset dalam .env — sila tambah dulu.",
      );
      return false;
    }
    if (code === correct) {
      setIsStaff(true);
      return true;
    }
    return false;
  }

  function lock() {
    setIsStaff(false);
  }

  return (
    <StaffContext.Provider value={{ isStaff, unlock, lock }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff() kena guna dalam <StaffProvider>");
  return ctx;
}
