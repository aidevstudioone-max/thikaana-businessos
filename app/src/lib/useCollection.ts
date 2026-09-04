import { useCallback, useState } from 'react'
import { getAll, remove as dbRemove, saveAll, upsert as dbUpsert } from './db'

// Small state hook over a localStorage collection. Every page that reads/writes a
// collection goes through this so a future API layer only has to change db.ts.
export function useCollection<T extends { id: string }>(collection: string) {
  const [items, setItems] = useState<T[]>(() => getAll<T>(collection))
  const refresh = useCallback(() => setItems(getAll<T>(collection)), [collection])
  const upsert = useCallback(
    (item: T) => {
      dbUpsert(collection, item)
      setItems(getAll<T>(collection))
    },
    [collection]
  )
  const remove = useCallback(
    (id: string) => {
      dbRemove(collection, id)
      setItems(getAll<T>(collection))
    },
    [collection]
  )
  const replaceAll = useCallback(
    (next: T[]) => {
      saveAll(collection, next)
      setItems(next)
    },
    [collection]
  )
  return { items, refresh, upsert, remove, replaceAll, setItems }
}
