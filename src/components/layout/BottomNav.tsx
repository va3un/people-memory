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
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon
          if (item.raised) {
            return (
              <li key={item.to} className="flex flex-1 items-end justify-center">
                <NavLink
                  to={item.to}
                  aria-label={item.label}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform duration-150 active:scale-95"
                >
                  <Icon size={26} strokeWidth={2.5} />
                </NavLink>
              </li>
            )
          }
          return (
            <li key={item.to} className="flex flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    isActive ? 'text-accent' : 'text-muted'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
