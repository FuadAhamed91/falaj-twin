import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useClock } from './lib/clock'
import { OverviewPage } from './pages/OverviewPage'
import { TwinPage } from './pages/TwinPage'
import { FacilitiesPage } from './pages/FacilitiesPage'
import { ThreatsPage } from './pages/ThreatsPage'
import { SimulationPage } from './pages/SimulationPage'
import { ResponsePage } from './pages/ResponsePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  useClock()
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/twin" element={<TwinPage />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/threats" element={<ThreatsPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/response" element={<ResponsePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<OverviewPage />} />
      </Routes>
    </Layout>
  )
}
