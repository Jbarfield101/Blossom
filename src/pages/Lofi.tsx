import AlbumWizard from "../components/AlbumWizard";
import VersionBadge from "../components/VersionBadge";
import TaskList from "../components/TaskQueue/TaskList";

export default function Lofi() {
  return (
    <div style={{ padding: "2rem" }}>
      <VersionBadge />
      <AlbumWizard />
      <TaskList />
    </div>
  );
}
