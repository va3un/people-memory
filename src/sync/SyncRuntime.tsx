// Mount the sync lifecycle without rendering or exposing authorization data.
import { useEffect } from 'react'
import { startSyncRuntime } from './runtime'
export function SyncRuntime() {
  useEffect(startSyncRuntime, [])
  return null
}
