// Status compares actual portable fingerprints to the last acknowledged upload, including photos and tombstones.
import { readAuth, readState, getSetting } from './store'
import { prepare } from './model'
import { portableDataset, readSnapshot } from '../backup/snapshot'
export async function status() {
  const auth = await readAuth(),
    notice = await getSetting<string>('sync:notice')
  if (!auth)
    return { auth: undefined, notice, unsynced: undefined, state: undefined, signature: '' }
  const [snapshot, state] = await Promise.all([readSnapshot(), readState(auth)])
  const local = await prepare(await portableDataset(snapshot))
  const keys = new Set([...Object.keys(local.hashes), ...Object.keys(state.baseline)])
  return {
    auth,
    notice,
    state,
    unsynced: [...keys].filter((key) => local.hashes[key] !== state.baseline[key]).length,
    signature: JSON.stringify(local.hashes),
  }
}
