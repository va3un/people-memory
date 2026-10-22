import { useState } from 'react'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Sheet } from '../components/ui/Sheet'
import { Tabs } from '../components/ui/Tabs'
import { showToast } from '../components/ui/Toast'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <p className="section-label">{title}</p>
      <Card className="mt-2 p-4">{children}</Card>
    </section>
  )
}

// The hidden design page at #/design. It shows every building block for review.
export function DesignPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Design</h1>
      <p className="mt-1 text-sm text-muted">Every building block in one place.</p>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Input">
        <Input label="Full name" placeholder="Meera Joshi" hint="Tap targets are at least 48 px." />
      </Section>

      <Section title="Card">
        <p className="text-sm text-muted">
          A soft surface with a border and a gentle shadow in light mode.
        </p>
      </Section>

      <Section title="Chip">
        <div className="flex flex-wrap gap-2">
          <Chip>Family</Chip>
          <Chip selected>Selected</Chip>
        </div>
      </Section>

      <Section title="Avatar">
        <div className="flex items-center gap-3">
          <Avatar name="Meera Joshi" />
          <Avatar name="Anil Joshi" size={40} />
          <Avatar name="Dr. Kavita Rao" size={72} />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          items={[
            { id: 'one', label: 'First', content: <p className="text-sm text-muted">First panel</p> },
            { id: 'two', label: 'Second', content: <p className="text-sm text-muted">Second panel</p> },
          ]}
        />
      </Section>

      <Section title="Sheet and Dialog">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Button variant="ghost" onClick={() => showToast({ message: 'This is a toast' })}>
            Show toast
          </Button>
        </div>
      </Section>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Pick a context">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" className="justify-start">
            Fr. Agnel School
          </Button>
          <Button variant="ghost" className="justify-start">
            ICLES College
          </Button>
        </div>
      </Sheet>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete this person?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        The person is marked as deleted, so it can sync. You can undo for 10 seconds.
      </Dialog>
    </main>
  )
}
