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
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex gap-1 rounded-2xl bg-accent-soft p-1"
      >
        {items.map((item) => {
          const isActive = item.id === active?.id
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`${groupId}-${item.id}`}
              id={`${groupId}-tab-${item.id}`}
              onClick={() => setActiveId(item.id)}
              className={`min-h-12 flex-1 rounded-xl px-3 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-surface text-text shadow-sm' : 'text-accent'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {active ? (
        <div role="tabpanel" id={`${groupId}-${active.id}`} aria-labelledby={`${groupId}-tab-${active.id}`}>
          {active.content}
        </div>
      ) : null}
    </div>
  )
}
