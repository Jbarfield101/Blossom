import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import ErrorBoundary from "./components/ErrorBoundary";
import CreateUserDialog from "./components/CreateUserDialog";
import RetroTV from "./components/RetroTV";
import { useUsers } from "./features/users/useUsers";
import Home from "./pages/Home";
import Objects from "./pages/Objects";
import Blender from "./pages/Blender";
import Music from "./pages/Music";
import Calendar from "./pages/Calendar";
import Comfy from "./pages/Comfy";
import Assistant from "./pages/Assistant";
import GeneralChat from "./pages/GeneralChat";
import WorldBuilder from "./pages/WorldBuilder";
import NPCMaker from "./pages/NPCMaker";
import NPCList from "./pages/NPCList";
import NPCDetail from "./pages/NPCDetail";
import Laser from "./pages/Laser";
import Lofi from "./pages/Lofi";
import NotFound from "./pages/NotFound";
import DND from "./pages/DND";
import Stocks from "./pages/Stocks";
import Shorts from "./pages/Shorts";
import Chores from "./pages/Chores";
import User from "./pages/User";
import SystemInfo from "./pages/SystemInfo";
import Fusion from "./pages/Fusion";
import Transcription from "./pages/Transcription";
import Construction from "./pages/Construction";
import Simulation from "./pages/Simulation";
import BigBrother from "./pages/BigBrother";

export default function App() {
  const users = useUsers((s) => s.users);
  const currentUserId = useUsers((s) => s.currentUserId);
  const switchUser = useUsers((s) => s.switchUser);
  const [showUserDialog, setShowUserDialog] = useState(false);

  useEffect(() => {
    const ids = Object.keys(users);
    if (!ids.length) {
      setShowUserDialog(true);
    } else if (!currentUserId) {
      switchUser(ids[ids.length - 1]);
    }
  }, [users, currentUserId, switchUser]);

  return (
    <ErrorBoundary>
      <TopBar />
      <RetroTV />
      <CreateUserDialog open={showUserDialog} onClose={() => setShowUserDialog(false)} />
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
        <Route path="/dnd/npcs-maker" element={<NPCMaker />} />
        <Route path="/dnd/npcs-library" element={<NPCList />} />
        <Route path="/dnd/npcs/:id" element={<NPCDetail />} />
        <Route path="/laser" element={<Laser />} />
        <Route path="/fusion" element={<Fusion />} />
        <Route path="/construction" element={<Construction />} />
        <Route path="/lofi" element={<Lofi />} />
        <Route path="/stocks" element={<Stocks />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/chores" element={<Chores />} />
        <Route path="/system" element={<SystemInfo />} />
        <Route path="/transcription" element={<Transcription />} />
        <Route path="/simulation" element={<Simulation />} />
        <Route path="/big-brother" element={<BigBrother />} />
        <Route path="/dnd" element={<DND />} />
        <Route path="/user" element={<User />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
