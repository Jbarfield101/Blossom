import { useScrapedItems } from '../features/scraper/useScrapedItems';

export default function ScrapedItemsList() {
  const items = useScrapedItems((s) => s.items);
  if (items.length === 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 50,
        color: '#fff',
        background: 'rgba(0,0,0,0.4)',
        padding: '8px 12px',
        borderRadius: 8,
        maxWidth: 240,
      }}
    >
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
        {items.map((it) => (
          <li key={it.id}>{it.title}</li>
        ))}
      </ul>
    </div>
  );
}
