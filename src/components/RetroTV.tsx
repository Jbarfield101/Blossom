import React, { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useTheme } from "../features/theme/ThemeContext";
import { useUsers } from "../features/users/useUsers";
import BouncingIcons from "./BouncingIcons";

interface RetroTVProps {
  children?: React.ReactNode;
}

export default function RetroTV({ children }: RetroTVProps) {
  const { theme } = useTheme();
  const retroTvMedia = useUsers((state) =>
    state.currentUserId ? state.users[state.currentUserId]?.retroTvMedia : null
  );
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaWidth, setMediaWidth] = useState(640);
  const [mediaHeight, setMediaHeight] = useState(480);

  useEffect(() => {
    if (retroTvMedia) {
      setMediaUrl(convertFileSrc(retroTvMedia.path));
      setMediaWidth(retroTvMedia.width);
      setMediaHeight(retroTvMedia.height);
    } else {
      setMediaUrl(null);
      setMediaWidth(640);
      setMediaHeight(480);
    }
  }, [retroTvMedia]);

  if (theme !== "retro") return null;

  let content: React.ReactNode;
  if (mediaUrl) {
    content = (
      <video
        src={mediaUrl}
        className="retro-tv-content"
        controls
        autoPlay
        loop
      />
    );
  } else if (children) {
    content = <div className="retro-tv-content">{children}</div>;
  } else {
    content = <BouncingIcons />;
  }

  return (
    <div
      className="retro-tv-container"
      style={{ width: mediaWidth, height: mediaHeight }}
    >
      <div className="retro-tv-screen">{content}</div>
    </div>
  );
}
