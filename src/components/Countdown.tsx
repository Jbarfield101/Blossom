import { useEffect, useState } from 'react';

function calc(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  const total = diff > 0 ? diff : 0;
  const seconds = Math.floor(total / 1000) % 60;
  const minutes = Math.floor(total / 1000 / 60) % 60;
  const hours = Math.floor(total / 1000 / 60 / 60) % 24;
  const days = Math.floor(total / 1000 / 60 / 60 / 24);
  return { total, days, hours, minutes, seconds };
}

export default function Countdown({ target }: { target: string }) {
  const [time, setTime] = useState(() => calc(target));
  useEffect(() => {
    const id = setInterval(() => setTime(calc(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (time.total <= 0) return <span>Due</span>;
  return (
    <span>
      {time.days}d {time.hours}h {time.minutes}m {time.seconds}s
    </span>
  );
}
