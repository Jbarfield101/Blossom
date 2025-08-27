import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { appWindow } from "@tauri-apps/api/window";
import App from "./App";
import "./styles.css";
import { ThemeProvider } from "./features/theme/ThemeContext";

function Root() {
  useEffect(() => {
    appWindow.maximize();
  }, []);

  return (
    <HashRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

