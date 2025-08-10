import SongForm from "../SongForm";
import VersionBadge from "../components/VersionBadge";

export default function Lofi() {
  return (
    <div style={{ padding: "2rem" }}>
      <VersionBadge />
      <SongForm />
    </div>
  );
}
