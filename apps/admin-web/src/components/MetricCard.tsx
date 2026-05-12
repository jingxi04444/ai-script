export function MetricCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><em>{delta}</em></article>;
}
