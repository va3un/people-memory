import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

// The Add screen. Smart capture arrives in Phase 7, so this is a placeholder for now.
export function AddPage() {
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Add</h1>
      <p className="mt-1 text-sm text-muted">Save someone new to your people list.</p>

      <Card className="mt-5 p-4">
        <p className="section-label">Quick add</p>
        <div className="mt-3 flex flex-col gap-3">
          <Input name="full_name" placeholder="Full name" aria-label="Full name" />
          <Input
            name="how_i_know"
            placeholder="How do I know them?"
            aria-label="How do I know them?"
          />
        </div>
        <Button className="mt-4" size="lg" disabled>
          Save
        </Button>
        <p className="mt-3 text-xs text-muted">
          Saving people arrives in Phase 3. Smart capture arrives in Phase 7.
        </p>
      </Card>
    </main>
  )
}
