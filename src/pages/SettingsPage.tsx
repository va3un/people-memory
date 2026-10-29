import { BackupCard } from '../components/settings/BackupCard'
import { AboutYou } from '../components/settings/AboutYou'
import { APP_VERSION } from '../lib/appVersion'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { DeveloperTools } from '../components/settings/DeveloperTools'
import { StorageCard } from '../components/settings/StorageCard'

// Settings provides verified local backups; Dropbox sync remains a later phase.
export function SettingsPage() {
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Settings</h1>

      <section className="mt-6">
        <p className="section-label">Storage</p>
        <StorageCard />
      </section>

      <BackupCard />
      <AboutYou />
      <DeveloperTools />

      <section className="mt-6">
        <p className="section-label">About</p>
        <Card className="mt-2 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">People</p>
              <p className="text-sm text-muted">Offline-first people memory app</p>
            </div>
            <Chip>Version {APP_VERSION}</Chip>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <p className="section-label">Coming next</p>
        <Card className="mt-2 divide-y divide-border">
          <p className="p-4 text-sm text-muted">Sync with Dropbox (Phase 9)</p>
          <p className="p-4 text-sm text-muted">Smart capture settings (Phase 8)</p>
        </Card>
      </section>
    </main>
  )
}
