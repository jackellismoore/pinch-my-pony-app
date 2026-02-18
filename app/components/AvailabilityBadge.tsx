'use client';

export function AvailabilityBadge(props: {
  label: string;
  tone: 'neutral' | 'warn' | 'info';
}) {
  const { label, tone } = props;

  const bg =
    tone === 'warn'
      ? 'rgba(255, 200, 0, 0.18)'
      : tone === 'info'
      ? 'rgba(0, 180, 255, 0.15)'
      : 'rgba(0,0,0,0.06)';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        border: '1px solid rgba(0,0,0,0.12)',
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
