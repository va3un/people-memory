import { Search } from 'lucide-react'
import { Input } from '../components/ui/Input'

// The home screen. Search is wired up in Phase 5, so this is a placeholder for now.
export function SearchPage() {
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Search</h1>
      <p className="mt-1 text-sm text-muted">Find anyone you know.</p>

      <div className="relative mt-5">
        <Search
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          name="search"
          type="search"
          placeholder="Search people"
          aria-label="Search people"
          autoFocus
          className="h-14 rounded-full pl-11"
        />
      </div>

      <div className="mt-8">
        <p className="section-label">Coming next</p>
        <p className="mt-2 text-sm text-muted">
          Search results appear here in Phase 5.
        </p>
      </div>
    </main>
  )
}
