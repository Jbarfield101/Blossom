import { useState } from "react";
import { generatePrompt } from "../utils/promptGenerator";

export default function PromptManager() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleVideo = () => {
    console.log("Video Prompt:", generatePrompt(prompt, "video"));
  };

  const handleImage = () => {
    console.log("Image Prompt:", generatePrompt(prompt, "image"));
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={styles.btn}>
        Prompt Manager
      </button>
      {open && (
        <div style={styles.panel}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={styles.textarea}
            placeholder="Enter prompt"
          />
          <div style={styles.actions}>
            <button onClick={handleVideo} style={styles.actionBtn}>
              Video Prompt
            </button>
            <button onClick={handleImage} style={styles.actionBtn}>
              Image Prompt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#3a82f6",
    color: "#fff",
    cursor: "pointer",
  },
  panel: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    padding: 12,
    background: "#121214",
    border: "1px solid #333",
    borderRadius: 10,
    width: 300,
    zIndex: 10,
  },
  textarea: {
    width: "100%",
    minHeight: 80,
    marginBottom: 8,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#1e1e1e",
    color: "#fff",
    padding: 8,
    resize: "vertical",
  },
  actions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  actionBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: "#3a82f6",
    color: "#fff",
    cursor: "pointer",
  },
};

