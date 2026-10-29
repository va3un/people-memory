import { useId, useState, type ReactNode } from 'react'

export type TabItem = {
  id: string
  label: string
  content: ReactNode
}

export type TabsProps = {
  items: TabItem[]
  initialTabId?: string
  className?: string
}

// A simple tab bar with a pill highlight on the active tab.
export function Tabs({ items, initialTabId, className = '' }: TabsProps) {
  const groupId = useId()
  const [activeId, setActiveId] = useState(initialTabId ?? items[0]?.id ?? '')

  const active = items.find((item) => item.id === activeId) ?? items[0]

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div role="tablist" aria-label="Tabs" className="flex gap-1 rounded-2xl bg-accent-soft p-1">
        {items.map((item) => {
          const isActive = item.id === active?.id
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(event) => {
                const index = items.findIndex((tab) => tab.id === item.id)
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % items.length
                    : event.key === 'ArrowLeft'
                      ? (index + items.length - 1) % items.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? items.length - 1
                          : undefined
                if (next === undefined) return
                event.preventDefault()
                setActiveId(items[next].id)
                document.getElementById(`${groupId}-tab-${items[next].id}`)?.focus()
              }}
              aria-controls={`${groupId}-${item.id}`}
              id={`${groupId}-tab-${item.id}`}
              onClick={() => setActiveId(item.id)}
              className={`min-h-12 min-w-0 flex-1 rounded-xl px-3 text-base font-medium transition-colors duration-150 ease-out ${
                isActive ? 'bg-surface text-text ' : 'text-accent'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={`${groupId}-${active.id}`}
          aria-labelledby={`${groupId}-tab-${active.id}`}
        >
          {active.content}
        </div>
      ) : null}
    </div>
  )
}
