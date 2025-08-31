import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { convertFileSrc } from '@tauri-apps/api/core';

interface Props {
  src: string;
  title?: string;
}

export default function AudioPlayer({ src, title }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);

  const resolvedSrc = useMemo(() => {
    if (!src) return src;
    const s = String(src);
    const isHttp = /^https?:\/\//i.test(s);
    const isData = /^data:/i.test(s);
    if (isHttp || isData) return s;
    // Treat as local file path
    try { return convertFileSrc(s); } catch { return s; }
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCur(el.currentTime);
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    const onLoaded = () => setDur(el.duration || 0);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
    };
  }, []);

  const play = () => audioRef.current?.play();
  const stop = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <Box>
      <audio ref={audioRef} src={resolvedSrc} preload="metadata" />
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton aria-label="play" onClick={play}><PlayArrowIcon /></IconButton>
        <IconButton aria-label="stop" onClick={stop}><StopIcon /></IconButton>
        {title && <Typography variant="body2">{title}</Typography>}
        <Typography variant="caption" sx={{ ml: 'auto' }}>{fmt(cur)} / {fmt(dur)}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
    </Box>
  );
}
