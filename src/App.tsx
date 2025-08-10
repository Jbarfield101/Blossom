import { Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Objects from "./pages/Objects";
import Music from "./pages/Music";
import Calendar from "./pages/Calendar";
import Comfy from "./pages/Comfy";
import Assistant from "./pages/Assistant";
import Laser from "./pages/Laser";
import LofiBot from "./pages/LofiBot";

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/objects" element={<Objects />} />
        <Route path="/music" element={<Music />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/comfy" element={<Comfy />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/laser" element={<Laser />} />
        <Route path="/lofi-bot" element={<LofiBot />} /> {/* new route */}
      </Routes>
    </>
  );
}