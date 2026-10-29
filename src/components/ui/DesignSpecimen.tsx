// Fictional, local-only specimens: no directory reads, writes, provider calls or stored settings.
import { useState } from 'react'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Card } from './Card'
import { Chip } from './Chip'
import { Dialog } from './Dialog'
import { Input } from './Input'
import { Sheet } from './Sheet'
import { Tabs } from './Tabs'
import { showToast } from './Toast'

// An original vector portrait, not a photograph of a real person or an external resource.
const portrait = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e0e7ff"/><path d="M10 120a50 48 0 0 1 100 0" fill="#4f46e5"/><ellipse cx="60" cy="53" rx="26" ry="32" fill="#c88b65"/><path d="M33 50Q22 8 62 12Q98 10 87 52L78 31Q54 40 36 32Z" fill="#382820"/><circle cx="50" cy="53" r="2" fill="#18181b"/><circle cx="70" cy="53" r="2" fill="#18181b"/><path d="M51 67Q60 75 70 67" stroke="#382820" stroke-width="3" fill="none"/></svg>')}`
const names = [
  'Meera Vale',
  'Anil Sen',
  'Kavita Rao',
  'Lila West',
  'Maya West',
  'Leo West',
  'Maya Chen',
  'Ari Kim',
]

export function DesignSpecimen({ theme }: { theme: 'light' | 'dark' }) {
  const [modal, setModal] = useState<'sheet' | 'dialog'>()
  const [status, setStatus] = useState('No records are affected by these examples.')
  return (
    <section
      data-theme={theme}
      aria-label={`${theme} components`}
      className="min-w-0 rounded-card border bg-background p-4 text-text"
    >
      <h2 className="page-title capitalize">{theme}</h2>
      <p className="mt-2 text-muted">System type, generous controls and fictional people.</p>
      <section className="mt-6">
        <h3 className="section-label">Colours and typography</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            'background',
            'surface',
            'text',
            'muted',
            'border',
            'accent',
            'accent-soft',
            'danger',
          ].map((token) => (
            <div key={token} className="flex items-center gap-2 rounded-xl border p-2">
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-full border"
                style={{ background: `var(--${token})` }}
              />
              <span className="caption">{token}</span>
            </div>
          ))}
        </div>
        <p className="page-title mt-4">A familiar face</p>
        <p className="mt-2">Body text stays easy to read as your font size grows.</p>
        <p className="caption mt-2 text-muted">Caption · 13/18 at the default font size</p>
      </section>
      <section className="mt-6">
        <h3 className="section-label">Photo, initials and cards</h3>
        <Card className="mt-3 flex items-center gap-3 p-4">
          <Avatar name="Fictional Meera Vale" src={portrait} />
          <div className="min-w-0">
            <p className="font-semibold">Meera Vale</p>
            <p className="text-accent">Met at the fictional Garden Club</p>
            <Chip className="mt-2">Neighbour</Chip>
          </div>
        </Card>
        <div className="mt-4 flex flex-wrap gap-3" aria-label="Eight stable avatar colours">
          {names.map((name) => (
            <Avatar key={name} name={name} size={48} />
          ))}
        </div>
        <Card className="mt-4 p-4">
          <Avatar name="Fictional Meera Vale profile" src={portrait} size={120} />
          <p className="page-title mt-4">Meera Vale</p>
          <p className="text-muted">Mimi · née Reed</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>Neighbour</Chip>
            <Chip selected>Selected</Chip>
          </div>
        </Card>
      </section>
      <section className="mt-6">
        <h3 className="section-label">Buttons and states</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setStatus('Primary example pressed.')}>Primary</Button>
          <Button variant="secondary" onClick={() => setStatus('Secondary example pressed.')}>
            Secondary
          </Button>
          <Button variant="ghost" onClick={() => setStatus('Ghost example pressed.')}>
            Ghost
          </Button>
          <Button variant="danger" onClick={() => setModal('dialog')}>
            Danger
          </Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">A longer label wraps without clipping</Button>
        </div>
      </section>
      <section className="mt-6 space-y-4">
        <h3 className="section-label">Fields and validation</h3>
        <Input
          label="Full name"
          placeholder="Fictional Meera Vale"
          hint="A local design example; nothing is saved."
        />
        <Input
          label="Name needing attention"
          aria-invalid="true"
          hint="Enter a name before saving."
        />
        <Input label="Unavailable field" value="Example only" disabled />
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" />A labelled checkbox
        </label>
      </section>
      <section className="mt-6">
        <h3 className="section-label">Tabs and empty states</h3>
        <Tabs
          className="mt-3"
          items={[
            {
              id: 'contexts',
              label: 'Contexts (0)',
              content: (
                <Card className="p-4">
                  <p>No contexts yet.</p>
                  <Button variant="ghost" onClick={() => setModal('sheet')}>
                    Add a context
                  </Button>
                </Card>
              ),
            },
            {
              id: 'categories',
              label: 'Categories (0)',
              content: (
                <Card className="p-4">
                  <p>No categories yet.</p>
                  <Button
                    variant="ghost"
                    onClick={() => setStatus('Example only: add a person with a category.')}
                  >
                    Add a person
                  </Button>
                </Card>
              ),
            },
          ]}
        />
      </section>
      <section className="mt-6">
        <h3 className="section-label">Sheets, confirmation and toast</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setModal('sheet')}>
            Open sheet
          </Button>
          <Button variant="secondary" onClick={() => setModal('dialog')}>
            Open dialog
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              showToast({
                message: 'Design example only',
                action: {
                  label: 'Undo',
                  onClick: () => setStatus('Example undone. No records changed.'),
                },
              })
            }
          >
            Show toast
          </Button>
        </div>
        <Card className="mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
          <p>Example saved</p>
          <Button
            variant="secondary"
            onClick={() => setStatus('Example undone. No records changed.')}
          >
            Undo example
          </Button>
        </Card>
        <p role="status" className="mt-3 text-muted">
          {status}
        </p>
      </section>
      <Sheet
        theme={theme}
        open={modal === 'sheet'}
        onClose={() => setModal(undefined)}
        title="Pick a fictional context"
      >
        {['Garden Club', 'Example College'].map((name) => (
          <Button
            key={name}
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setStatus(`Selected ${name}. No records changed.`)
              setModal(undefined)
            }}
          >
            {name}
          </Button>
        ))}
      </Sheet>
      <Dialog
        theme={theme}
        open={modal === 'dialog'}
        onClose={() => setModal(undefined)}
        title="Example confirmation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(undefined)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setStatus('Example confirmed. No records changed.')
                setModal(undefined)
              }}
            >
              Confirm example
            </Button>
          </>
        }
      >
        This is a design example. No person will be deleted.
      </Dialog>
    </section>
  )
}
