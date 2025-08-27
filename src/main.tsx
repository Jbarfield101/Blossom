import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { getCurrent } from "@tauri-apps/api/window";
import App from "./App";
import "./styles.css";
import { ThemeProvider } from "./features/theme/ThemeContext";
import SplashScreen from "./components/SplashScreen";

function RootContent() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return ready ? <App /> : <SplashScreen />;
}

function Root() {
  useEffect(() => {
    getCurrent().maximize();
  }, []);

  return (
    <HashRouter>
      <ThemeProvider>
        <RootContent />
      </ThemeProvider>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

