import { Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Objects from "./pages/Objects";
import Blender from "./pages/Blender";
import Music from "./pages/Music";
import Calendar from "./pages/Calendar";
import Comfy from "./pages/Comfy";
import Assistant from "./pages/Assistant";
import GeneralChat from "./pages/GeneralChat";
import News from "./pages/News";
import Laser from "./pages/Laser";
import Lofi from "./pages/Lofi";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/objects" element={<Objects />} />
        <Route path="/objects/blender" element={<Blender />} />
        <Route path="/music" element={<Music />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/comfy" element={<Comfy />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/assistant/general-chat" element={<GeneralChat />} />
        <Route path="/assistant/news" element={<News />} />
        <Route path="/laser" element={<Laser />} />
        <Route path="/lofi" element={<Lofi />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
