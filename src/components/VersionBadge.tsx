import pkg from '../../package.json';

export default function VersionBadge() {
  return (
    <div style={{ fontSize: '48px', color: 'white', fontWeight: 800 }}>
      {pkg.version}
    </div>
  );
}
