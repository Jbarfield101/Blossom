import { Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import Home from "./pages/Home";
import Objects from "./pages/Objects";
import Blender from "./pages/Blender";
import Music from "./pages/Music";
import Calendar from "./pages/Calendar";
import Comfy from "./pages/Comfy";
import Assistant from "./pages/Assistant";
import GeneralChat from "./pages/GeneralChat";
import BigBrotherUpdates from "./pages/BigBrotherUpdates";
import WorldBuilder from "./pages/WorldBuilder";
import NPCMaker from "./pages/NPCMaker";
import NPCList from "./pages/NPCList";
import Laser from "./pages/Laser";
import Lofi from "./pages/Lofi";
import NotFound from "./pages/NotFound";
import DND from "./pages/DND";
import Stocks from "./pages/Stocks";
import Shorts from "./pages/Shorts";

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/objects" element={<Objects />} />
        <Route path="/objects/blender" element={<Blender />} />
        <Route path="/music" element={<Music />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/comfy" element={<Comfy />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/assistant/general-chat" element={<GeneralChat />} />
        <Route path="/dnd/world-builder" element={<WorldBuilder />} />
        <Route path="/dnd/npc-maker" element={<NPCMaker />} />
        <Route path="/dnd/npc-list" element={<NPCList />} />
        <Route
          path="/assistant/big-brother-updates"
          element={<BigBrotherUpdates />}
        />
        <Route path="/laser" element={<Laser />} />
        <Route path="/lofi" element={<Lofi />} />
        <Route path="/stocks" element={<Stocks />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/dnd" element={<DND />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
