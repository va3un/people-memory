import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import { Toaster } from './components/ui/Toast'
import { usePwaUpdate } from './lib/usePwaUpdate'
import { AddPage } from './pages/AddPage'
import { BrowsePage } from './pages/BrowsePage'
import { DesignPage } from './pages/DesignPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'

// The app shell: four screens in the bottom bar plus a hidden design page.
export function App() {
  usePwaUpdate()

  return (
    <div className="min-h-dvh bg-background text-text">
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/add" element={<AddPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/design" element={<DesignPage />} />
      </Routes>
      <BottomNav />
      <Toaster />
    </div>
  )
}
