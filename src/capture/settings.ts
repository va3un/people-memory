// The opt-in surname rule is a device preference, excluded from every export and sync payload.
import { getDeviceSetting, setDeviceSetting } from '../db/typed'
export async function readSurnameSetting(): Promise<boolean> {
  return (await getDeviceSetting<unknown>('capture:surnameSuggestions')) === true
}
export async function saveSurnameSetting(value: boolean): Promise<void> {
  await setDeviceSetting('capture:surnameSuggestions', value)
}
