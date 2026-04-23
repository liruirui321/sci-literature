import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Library from './pages/Library'
import Dashboard from './pages/Dashboard'
import PaperDetail from './pages/PaperDetail'
import KnowledgeGraph from './pages/KnowledgeGraph'
import Compare from './pages/Compare'
import Ask from './pages/Ask'
import Settings from './pages/Settings'
import Guide from './pages/Guide'
import PaperFinder from './pages/PaperFinder'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Library />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/paper/:id" element={<PaperDetail />} />
        <Route path="/finder" element={<PaperFinder />} />
        <Route path="/graph" element={<KnowledgeGraph />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
