import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import AuthGate from "./auth/AuthGate";
import { SettingsProvider } from "./settings/SettingsContext";
import "./index.css";

// Sign-in is outside the settings so that the login page has the user's colors; the app is behind the gate.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>,
);
