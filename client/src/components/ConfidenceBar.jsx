export default function ConfidenceBar({ value }) {
  const level = value >= 80 ? 'high' : value >= 50 ? 'medium' : 'low'

  return (
    <div className="confidence-bar-container">
      <div className="confidence-bar">
        <div
          className={`confidence-bar-fill ${level}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="confidence-label">{value}%</span>
    </div>
  )
}
