import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import MusicGenForm from '../components/MusicGenForm';
import MusicSettings from '../components/MusicSettings';
import MusicDashboard from '../components/MusicDashboard';
import MusicQueue from '../components/MusicQueue';

export default function AIMusic() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={(e: React.SyntheticEvent, v: number)=>setTab(v)} aria-label="AI Music tabs">
        <Tab label="Compose" />
        <Tab label="Dashboard" />
        <Tab label="Queue" />
        <Tab label="Settings" />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {tab === 0 && <MusicGenForm />}
        {tab === 1 && <MusicDashboard />}
        {tab === 2 && <MusicQueue />}
        {tab === 3 && <MusicSettings />}
      </Box>
    </Box>
  );
}

