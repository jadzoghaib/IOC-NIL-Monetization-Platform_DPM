import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Home from './pages/Home'
import FanEngagement from './pages/FanEngagement'
import AthleteMode from './pages/AthleteMode'
import BusinessMode from './pages/BusinessMode'
import ModeSwitcher from './components/ModeSwitcher'

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/fan/*"     element={<FanEngagement />} />
          <Route path="/athlete"   element={<AthleteMode />} />
          <Route path="/business/*" element={<BusinessMode />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      <ModeSwitcher />
    </BrowserRouter>
  )
}
