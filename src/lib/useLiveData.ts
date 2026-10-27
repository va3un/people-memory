// Subscribe to IndexedDB changes, including changes from another open app tab.
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

export function useLiveData<T>(query: () => Promise<T>) {
  const [state, setState] = useState<{ query?: () => Promise<T>; data?: T; error?: string }>({})
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (data) => setState({ query, data }),
      error: () => setState({ query, error: 'Could not read saved data. Try reopening the app.' }),
    })
    return () => subscription.unsubscribe()
  }, [query])
  return state.query === query ? state : {}
}
