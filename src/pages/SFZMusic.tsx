import SFZSongForm from "../components/SFZSongForm";
import TaskList from "../components/TaskQueue/TaskList";

export default function SFZMusic() {
  return (
    <div style={{ padding: "2rem" }}>
      <SFZSongForm />
      <TaskList />
    </div>
  );
}
