// Keep search mounted beside profiles on wide screens; phones retain one screen at a time.
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SearchPage } from '../../pages/SearchPage'
import { Button } from '../ui/Button'

function useWideScreen() {
  const [wide, setWide] = useState(() => window.matchMedia?.('(min-width: 64rem)').matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 64rem)')
    if (!query) return
    const update = () => setWide(query.matches)
    query.addEventListener('change', update)
    update()
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

export function DirectoryLayout() {
  const wide = useWideScreen()
  const isSearch = useLocation().pathname === '/'
  return (
    <main className="mx-auto grid w-full max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      {(wide || isSearch) && (
        <div className="min-w-0 lg:border-r lg:pr-4">
          <SearchPage embedded active={isSearch} />
        </div>
      )}
      {!isSearch ? (
        <div className="min-w-0">
          <Outlet />
        </div>
      ) : wide ? (
        <section aria-label="Person profile" className="page pt-24">
          <div className="card p-6">
            <h2 className="font-semibold">Choose someone to see their profile.</h2>
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => document.querySelector<HTMLInputElement>('#search')?.focus()}
            >
              Search people
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  )
}
