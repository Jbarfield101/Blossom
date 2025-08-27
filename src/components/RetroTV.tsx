import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../features/theme/ThemeContext";
import { useUsers } from "../features/users/useUsers";
import BouncingIcons from "./BouncingIcons";

interface RetroTVProps {
  children?: React.ReactNode;
}

export default function RetroTV({ children }: RetroTVProps) {
  const { theme } = useTheme();
  const currentUserId = useUsers((state) => state.currentUserId);
  const retroTvMedia = useUsers((state) =>
    state.currentUserId
      ? state.users[state.currentUserId]?.retroTvMedia
      : null
  );
  const setRetroTvMedia = useUsers((state) => state.setRetroTvMedia);
  const clearRetroTvMedia = useUsers((state) => state.clearRetroTvMedia);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [mediaWidth, setMediaWidth] = useState(640);
  const [mediaHeight, setMediaHeight] = useState(480);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const isVideo = file.type.startsWith("video");

      const update = (width: number, height: number) => {
        setMediaUrl(result);
        setMediaType(isVideo ? "video" : "image");
        setMediaWidth(width);
        setMediaHeight(height);
        if (currentUserId) {
          setRetroTvMedia({
            data: result,
            type: isVideo ? "video" : "image",
            width,
            height,
          });
        }
      };

      if (isVideo) {
        const video = document.createElement("video");
        video.src = result;
        video.addEventListener(
          "loadedmetadata",
          () => update(video.videoWidth, video.videoHeight),
          { once: true }
        );
      } else {
        const img = new Image();
        img.src = result;
        img.onload = () => update(img.width, img.height);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (retroTvMedia) {
      setMediaUrl(retroTvMedia.data);
      setMediaType(retroTvMedia.type);
      setMediaWidth(retroTvMedia.width);
      setMediaHeight(retroTvMedia.height);
    } else {
      setMediaUrl(null);
      setMediaType(null);
      setMediaWidth(640);
      setMediaHeight(480);
    }
  }, [currentUserId, retroTvMedia]);

  useEffect(() => () => clearRetroTvMedia(), []);

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
    <div
      className="retro-tv-container"
      style={{ width: mediaWidth, height: mediaHeight }}
    >
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
