import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'

// The Browse screen. Contexts and categories arrive in Phase 4.
export function BrowsePage() {
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Browse</h1>
      <p className="mt-1 text-sm text-muted">People grouped by place and category.</p>

      <Tabs
        className="mt-5"
        items={[
          {
            id: 'contexts',
            label: 'Contexts',
            content: (
              <Card className="p-4 text-sm text-muted">
                Schools, colleges, offices, societies and places appear here.
              </Card>
            ),
          },
          {
            id: 'categories',
            label: 'Categories',
            content: (
              <Card className="p-4">
                <div className="flex flex-wrap gap-2">
                  <Chip>Family</Chip>
                  <Chip>Relative</Chip>
                  <Chip>Friend</Chip>
                  <Chip>Colleague</Chip>
                  <Chip>Neighbour</Chip>
                </div>
              </Card>
            ),
          },
        ]}
      />
    </main>
  )
}
