import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../features/theme/ThemeContext";
import { useUsers } from "../features/users/useUsers";
import BouncingIcons from "./BouncingIcons";

interface RetroTVProps {
  children?: React.ReactNode;
}

export default function RetroTV({ children }: RetroTVProps) {
  const { theme } = useTheme();
  const { currentUserId, users, setRetroTvMedia } = useUsers();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [mediaWidth, setMediaWidth] = useState<number | null>(null);
  const [mediaHeight, setMediaHeight] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") return;
      const type = file.type.startsWith("video") ? "video" : "image";
      setMediaUrl(result);
      setMediaType(type);
      if (type === "image") {
        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          setMediaWidth(width);
          setMediaHeight(height);
          setRetroTvMedia({ data: result, type, width, height });
        };
        img.src = result;
      } else {
        const videoEl = document.createElement("video");
        videoEl.onloadedmetadata = () => {
          const width = videoEl.videoWidth;
          const height = videoEl.videoHeight;
          setMediaWidth(width);
          setMediaHeight(height);
          setRetroTvMedia({ data: result, type, width, height });
        };
        videoEl.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!currentUserId) {
      setMediaUrl(null);
      setMediaType(null);
      setMediaWidth(null);
      setMediaHeight(null);
      return;
    }
    const stored = users[currentUserId]?.retroTvMedia;
    if (stored) {
      setMediaUrl(stored.data);
      setMediaType(stored.type);
      setMediaWidth(stored.width);
      setMediaHeight(stored.height);
    } else {
      setMediaUrl(null);
      setMediaType(null);
      setMediaWidth(null);
      setMediaHeight(null);
    }
  }, [currentUserId, users]);

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
