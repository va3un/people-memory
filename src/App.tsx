import { useEffect } from 'react'
import { requestInitialPersistence } from './lib/persistence'
import { SyncRuntime } from './sync/SyncRuntime'
import { DirectoryProvider } from './search/DirectoryProvider'
import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import { Toaster } from './components/ui/Toast'
import { usePwaUpdate } from './lib/usePwaUpdate'
import { PersonPage } from './pages/PersonPage'
import { EditPersonPage } from './pages/EditPersonPage'
import { MeSetupPage } from './pages/MeSetupPage'
import { ContextPage } from './pages/ContextPage'
import { CategoryPage } from './pages/CategoryPage'
import { readMe } from './db/me'
import { useLiveData } from './lib/useLiveData'
import { AddRoute } from './pages/AddPage'
import { BrowsePage } from './pages/BrowsePage'
import { DesignPage } from './pages/DesignPage'
import { DirectoryLayout } from './components/layout/DirectoryLayout'
import { SettingsPage } from './pages/SettingsPage'

// The app shell: four screens in the bottom bar plus a hidden design page.
export function App() {
  usePwaUpdate()
  const { data: me, error } = useLiveData(readMe)
  const storageReady = me !== undefined && !error
  useEffect(() => {
    if (storageReady)
      void requestInitialPersistence().catch(() => {
        // A storage-permission failure must never prevent local use or change directory records.
        // Settings continues to show the actual browser status and backup reminder.
      })
  }, [storageReady, me?.id])

  return (
    <DirectoryProvider>
      <SyncRuntime />
      <div className="min-h-dvh bg-background text-text">
        {error ? (
          <main className="page py-6">
            <p role="alert">
              Could not load your Me profile. Existing data has been kept. Try reopening the app.
            </p>
          </main>
        ) : me === undefined ? (
          <main className="page py-6">
            <p role="status">Loading your profile…</p>
          </main>
        ) : me === null ? (
          <MeSetupPage />
        ) : (
          <Routes>
            <Route element={<DirectoryLayout />}>
              <Route index element={null} />
              <Route path="/people/:id" element={<PersonPage embedded />} />
            </Route>
            <Route path="/people/:id/edit" element={<EditPersonPage />} />
            <Route path="/add" element={<AddRoute />} />
            <Route path="/contexts/:id" element={<ContextPage />} />
            <Route path="/categories/:category" element={<CategoryPage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/design" element={<DesignPage />} />
          </Routes>
        )}
        {me && <BottomNav />}
        <Toaster />
      </div>
    </DirectoryProvider>
  )
}
