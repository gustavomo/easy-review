import { useEffect, useState } from 'react';

interface ElapsedCounterProps {
  startedAt: number;  // Date.now() when generation started
}

/** Elapsed timer. Updates every second. Format: "Generating... {N}s". Label typography (11px/600). */
export function ElapsedCounter({ startedAt }: ElapsedCounterProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-descriptionForeground)' }}>
      Generating... {elapsed}s
    </span>
  );
}
