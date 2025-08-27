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
      setMediaUrl(result);
      const isVideo = file.type.startsWith("video");
      setMediaType(isVideo ? "video" : "image");

      const update = (width: number, height: number) => {
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
    if (!currentUserId) return;
    const media = users[currentUserId]?.retroTvMedia;
    if (media) {
      setMediaUrl(media.data);
      setMediaType(media.type);
      setMediaWidth(media.width);
      setMediaHeight(media.height);
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
