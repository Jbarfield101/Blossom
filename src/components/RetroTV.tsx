import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../features/theme/ThemeContext";
import BouncingIcons from "./BouncingIcons";

interface RetroTVProps {
  children?: React.ReactNode;
}

export default function RetroTV({ children }: RetroTVProps) {
  const { theme } = useTheme();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith("video") ? "video" : "image");
  };

  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  if (theme !== "retro") return null;

  let content: React.ReactNode;
  if (mediaUrl) {
    content =
      mediaType === "video" ? (
        <video
          src={mediaUrl}
          className="retro-tv-content"
          controls
          autoPlay
          loop
        />
      ) : (
        <img src={mediaUrl} className="retro-tv-content" alt="Uploaded media" />
      );
  } else if (children) {
    content = <div className="retro-tv-content">{children}</div>;
  } else {
    content = <BouncingIcons />;
  }

  return (
    <div className="retro-tv-container">
      <input
        type="file"
        accept="image/*,video/*"
        ref={fileInput}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div className="retro-tv-screen">
        {content}
        <button
          type="button"
          className="retro-tv-upload"
          onClick={() => fileInput.current?.click()}
        >
          Upload
        </button>
      </div>
    </div>
  );
}
