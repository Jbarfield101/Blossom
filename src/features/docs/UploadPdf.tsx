import { open } from "@tauri-apps/plugin-dialog";
import { useDocs } from "./useDocs";

export function UploadPdf() {
  const { addDoc } = useDocs();

  async function handleClick() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      await addDoc(selected, true);
    }
  }

  return <button onClick={handleClick}>Upload PDF</button>;
}
