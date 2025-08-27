import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { ThemeProvider } from "./features/theme/ThemeContext";
import SplashScreen from "./components/SplashScreen";

function Root() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return ready ? <App /> : <SplashScreen />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);
