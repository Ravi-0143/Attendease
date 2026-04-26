import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import EnrollmentPage from './pages/EnrollmentPage.jsx'
import SetupPage from './pages/SetupPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import LateArrivalPage from './pages/LateArrivalPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ServiceStatus from './components/ServiceStatus.jsx'
import './App.css'

export default function App() {
  const [setupComplete, setSetupComplete] = useState(null) // null = loading
  const [reviewData, setReviewData] = useState(null)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  async function checkSetupStatus() {
    try {
      const res = await fetch('/api/setup/status')
      const data = await res.json()
      // If env vars are set (googleConfigured), don't force redirect to Setup.
      // googleConnected (OAuth token) is only needed when actually writing to Sheets.
      setSetupComplete(data.geminiConfigured && (data.googleConfigured || data.googleConnected))
    } catch {
      setSetupComplete(false)
    }
  }

  if (setupComplete === null) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner"></div>
        <p>Loading AttendEase…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <ServiceStatus />
      <Navbar />
      <main className="container">
        <Routes>
          <Route
            path="/"
            element={
              setupComplete
                ? <HomePage setReviewData={setReviewData} />
                : <Navigate to="/setup" replace />
            }
          />
          <Route
            path="/setup"
            element={<SetupPage onComplete={() => setSetupComplete(true)} />}
          />
          <Route path="/enrollment" element={<EnrollmentPage />} />
          <Route
            path="/review"
            element={
              reviewData
                ? <ReviewPage data={reviewData} onDone={() => setReviewData(null)} />
                : <Navigate to="/" replace />
            }
          />
          <Route path="/late" element={<LateArrivalPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}
