import { useUsers, defaultModules, type ModuleKey } from "../users/useUsers";

export function useSettings() {
  const modules = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id].modules : defaultModules;
  });
  const toggleModule = useUsers((state) => state.toggleModule);
  return { modules, toggleModule };
}

export type { ModuleKey };
