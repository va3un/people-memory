import { SyncSettings } from '../sync/SyncSettings'
import { ProviderSettings } from '../components/settings/ProviderSettings'
import { CaptureSettings } from '../components/settings/CaptureSettings'
import { BackupCard } from '../components/settings/BackupCard'
import { AboutYou } from '../components/settings/AboutYou'
import { APP_VERSION } from '../lib/appVersion'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { DeveloperTools } from '../components/settings/DeveloperTools'
import { StorageCard } from '../components/settings/StorageCard'

// Safety settings stay visible, in the roadmap order, with device-only controls preserved.
export function SettingsPage() {
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Settings</h1>

      <SyncSettings />
      <BackupCard />
      <CaptureSettings />
      <ProviderSettings />
      <AboutYou />
      <section className="mt-6">
        <p className="section-label">Storage</p>
        <StorageCard />
      </section>

      <DeveloperTools />

      <section className="mt-6">
        <p className="section-label">About</p>
        <Card className="mt-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">People</p>
              <p className="text-base text-muted">Offline-first people memory app</p>
            </div>
            <Chip>Version {APP_VERSION}</Chip>
          </div>
        </Card>
      </section>
    </main>
  )
}
