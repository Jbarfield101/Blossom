import pkg from "../../package.json";

export default function VersionBadge() {
  return (
    <div style={{ textAlign: "center", color: "white" }}>
      <div style={{ fontSize: "40px", fontWeight: 800 }}>Blossom</div>
      <div style={{ fontSize: "28px", fontWeight: 600 }}>v{pkg.version}</div>
    </div>
  );
}
