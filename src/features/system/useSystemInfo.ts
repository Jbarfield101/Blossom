import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SystemInfo {
  cpu_usage: number;
  mem_usage: number;
  gpu_usage: number | null;
}

export function useSystemInfo() {
  const [info, setInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchInfo = async () => {
      try {
        const data = await invoke<SystemInfo>("system_info");
        if (mounted) setInfo(data);
      } catch {
        // ignore errors
      }
    };
    fetchInfo();
    const id = setInterval(fetchInfo, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return info;
}
