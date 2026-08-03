import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { StaffProvider } from "./StaffContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <StaffProvider>
        <App />
      </StaffProvider>
    </BrowserRouter>
  </StrictMode>,
);
