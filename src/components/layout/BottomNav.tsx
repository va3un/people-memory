import { NavLink } from 'react-router-dom'
import { Plus, Search, LayoutGrid, Settings } from 'lucide-react'

const items = [
  { to: '/', label: 'Search', icon: Search },
  { to: '/add', label: 'Add', icon: Plus, raised: true },
  { to: '/browse', label: 'Browse', icon: LayoutGrid },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// The bottom bar with Search, a raised Add button, Browse and Settings.
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/80 backdrop-blur-lg"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon
          if (item.raised) {
            return (
              <li key={item.to} className="col-start-3 flex flex-col items-center justify-end">
                <NavLink
                  to={item.to}
                  aria-label={item.label}
                  className="-mt-6 flex shrink-0 flex-col items-center justify-center rounded-2xl transition-transform duration-150 ease-out active:scale-95"
                >
                  <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
                    <Icon size={26} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="caption py-1 text-accent" aria-hidden="true">
                    Add
                  </span>
                </NavLink>
              </li>
            )
          }
          return (
            <li
              key={item.to}
              className={item.to === '/' ? 'col-span-2 flex min-w-0' : 'flex min-w-0'}
            >
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 caption font-medium transition-colors duration-150 ease-out ${
                    isActive ? 'text-accent' : 'text-muted'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} aria-hidden="true" />
                <span className="max-w-full break-words">{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
