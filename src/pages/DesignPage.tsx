// Hidden, responsive light/dark gallery. All sample content and actions are fictional.
import { DesignSpecimen } from '../components/ui/DesignSpecimen'

export function DesignPage() {
  return (
    <main className="page mx-auto w-full max-w-6xl pt-6">
      <h1 className="page-title">Design</h1>
      <p className="mt-2 text-muted">
        Every building block in light and dark. Examples never change your records.
      </p>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <DesignSpecimen theme="light" />
        <DesignSpecimen theme="dark" />
      </div>
    </main>
  )
}
