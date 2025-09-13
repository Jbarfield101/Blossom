import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import CreateUserDialog from "./components/CreateUserDialog";
import RetroTV from "./components/RetroTV";
import { useUsers } from "./features/users/useUsers";
import Home from "./pages/Home";
import Objects from "./pages/Objects";
import Blender from "./pages/Blender";
import Calendar from "./pages/Calendar";
import Comfy from "./pages/Comfy";
import Assistant from "./pages/Assistant";
import GeneralChat from "./pages/GeneralChat";
import Seo from "./pages/Seo";
import Laser from "./pages/Laser";
import NotFound from "./pages/NotFound";
import Shorts from "./pages/Shorts";
import Chores from "./pages/Chores";
import User from "./pages/User";
import SystemInfo from "./pages/SystemInfo";
import Fusion from "./pages/Fusion";
import Transcription from "./pages/Transcription";
import Construction from "./pages/Construction";
import Simulation from "./pages/Simulation";
import BigBrother from "./pages/BigBrother";
import Voices from "./pages/Voices";
import VideoEditor from "./pages/VideoEditor";

export default function App() {
  const { pathname } = useLocation();
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
        <Sidebar />
        {pathname !== "/calendar" && pathname !== "/comfy" && (
            <RetroTV>NO SIGNAL</RetroTV>
          )}
        <CreateUserDialog open={showUserDialog} onClose={() => setShowUserDialog(false)} />
      <Box sx={{ pt: 'var(--top-bar-height)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/objects" element={<Objects />} />
          <Route path="/objects/blender" element={<Blender />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/comfy" element={<Comfy />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/assistant/general-chat" element={<GeneralChat />} />
          <Route path="/assistant/seo" element={<Seo />} />
          <Route path="/laser" element={<Laser />} />
          <Route path="/fusion" element={<Fusion />} />
          <Route path="/construction" element={<Construction />} />
          <Route path="/voices" element={<Voices />} />
          <Route path="/shorts" element={<Shorts />} />
          <Route path="/video-editor" element={<VideoEditor />} />
          <Route path="/chores" element={<Chores />} />
          <Route path="/system" element={<SystemInfo />} />
          <Route path="/transcription" element={<Transcription />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/big-brother" element={<BigBrother />} />
          <Route path="/user" element={<User />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>
    </ErrorBoundary>
  );
}
