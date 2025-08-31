import { invoke } from '@tauri-apps/api/core';

export async function saveTempFile(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  // Tauri can serialize Uint8Array directly
  const path = await invoke<string>('save_temp_file', {
    fileName: file.name,
    data: buf,
  });
  return path;
}

