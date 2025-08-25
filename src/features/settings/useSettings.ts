import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useUsers, defaultModules, type ModuleKey } from "../users/useUsers";

export function useSettings() {
  const modules = useUsers((state) => {
    const id = state.currentUserId;
    return { ...defaultModules, ...(id ? state.users[id].modules : {}) };
  });
  const toggleModule = useUsers((state) => state.toggleModule);
  const cpuLimit = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id].cpuLimit : 90;
  });
  const memLimit = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id].memLimit : 90;
  });
  const setCpuLimit = useUsers((state) => state.setCpuLimit);
  const setMemLimit = useUsers((state) => state.setMemLimit);

  useEffect(() => {
    invoke("set_task_limits", { cpu: cpuLimit, memory: memLimit }).catch(() => {});
  }, [cpuLimit, memLimit]);

  return { modules, toggleModule, cpuLimit, memLimit, setCpuLimit, setMemLimit };
}

export type { ModuleKey };
