import { useCalendar } from "../features/calendar/useCalendar";

export default function TagStats() {
  const { tagTotals } = useCalendar();
  const entries = Object.entries(tagTotals);

  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Tag Stats</h3>
      <ul>
        {entries.map(([tag, ms]) => (
          <li key={tag}>
            {tag}: {(ms / (1000 * 60 * 60)).toFixed(2)}h
          </li>
        ))}
      </ul>
    </div>
  );
}
