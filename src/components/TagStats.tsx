import { useCalendar } from "../features/calendar/useCalendar";

export default function TagStats() {
  const { tagTotals } = useCalendar();
  const entries = Object.entries(tagTotals);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Tag Stats</h3>
      <ul className="space-y-1">
        {entries.map(([tag, ms]) => (
          <li key={tag} className="text-sm text-gray-700">
            {tag}: {(ms / (1000 * 60 * 60)).toFixed(2)}h
          </li>
        ))}
      </ul>
    </div>
  );
}
