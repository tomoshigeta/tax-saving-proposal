import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SavedProposal } from './types'

/**
 * 提案履歴の保存先。
 *
 * localStorage は約5MBかつ文字列のみで、画像を base64 化すると容量が約1.33倍に膨らむため
 * 数件で破綻する。画像を Blob のまま置ける IndexedDB を使う。
 */
interface Schema extends DBSchema {
  proposals: {
    key: string
    value: SavedProposal
    indexes: { updatedAt: number }
  }
}

const DB_NAME = 'rent-assessment'
const VERSION = 1

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db() {
  dbPromise ??= openDB<Schema>(DB_NAME, VERSION, {
    upgrade(database) {
      const store = database.createObjectStore('proposals', { keyPath: 'id' })
      store.createIndex('updatedAt', 'updatedAt')
    },
  })
  return dbPromise
}

/** 更新日の降順 */
export async function listProposals(): Promise<SavedProposal[]> {
  const all = await (await db()).getAllFromIndex('proposals', 'updatedAt')
  return all.reverse()
}

export async function getProposal(id: string): Promise<SavedProposal | undefined> {
  return (await db()).get('proposals', id)
}

export async function putProposal(proposal: SavedProposal): Promise<void> {
  await (await db()).put('proposals', proposal)
}

export async function deleteProposal(id: string): Promise<void> {
  await (await db()).delete('proposals', id)
}

export const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`
