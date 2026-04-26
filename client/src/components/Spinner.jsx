export default function Spinner({ text = 'Processing…', subtext = '' }) {
  return (
    <div className="spinner-overlay" id="loading-spinner">
      <div className="spinner"></div>
      <p className="spinner-text">{text}</p>
      {subtext && <p className="spinner-subtext">{subtext}</p>}
    </div>
  )
}
