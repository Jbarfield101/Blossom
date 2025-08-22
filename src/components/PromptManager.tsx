import { useState } from "react";
import { generatePrompt, type PromptType } from "../utils/promptGenerator";

export default function PromptManager() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handlePrompt = (type: PromptType) => {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    console.log(`${label} Prompt:`, generatePrompt(prompt, type));
  };

  return (
    <div>
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
            <button
              onClick={() => handlePrompt("image")}
              style={styles.actionBtn}
            >
              Image
            </button>
            <button
              onClick={() => handlePrompt("video")}
              style={styles.actionBtn}
            >
              Video
            </button>
            <button
              onClick={() => handlePrompt("music")}
              style={styles.actionBtn}
            >
              Music
            </button>
            <button
              onClick={() => handlePrompt("dnd")}
              style={styles.actionBtn}
            >
              DND
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
    position: "fixed",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    padding: 12,
    background: "#121214",
    border: "1px solid #333",
    borderRadius: 10,
    width: 400,
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
    justifyContent: "center",
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

