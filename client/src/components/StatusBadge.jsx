export default function StatusBadge({ status }) {
  const config = {
    Present: { className: 'badge-present', label: '✅ Present' },
    Absent: { className: 'badge-absent', label: '❌ Absent' },
    Late: { className: 'badge-late', label: '🕐 Late' },
  }

  const { className, label } = config[status] || config.Absent

  return <span className={`badge ${className}`}>{label}</span>
}
