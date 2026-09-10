import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { emptyInput } from '../domain/defaults'

/**
 * v2(登記費用・試算期間なし)のデータベースを作ってから db.ts を読み込み、
 * v3 への移行で既定値が埋まることを確かめる。
 */
describe('IndexedDB の移行', () => {
  it('v2 の提案書は登記費用0・試算期間15で読める', async () => {
    const legacyInput = { ...emptyInput(), propertyName: '旧データ', price: 30_000_000 } as Record<
      string,
      unknown
    >
    delete legacyInput.registrationFee
    delete legacyInput.simulationYears

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('rent-assessment', 2)
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore('proposals', { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('proposals', 'readwrite')
        tx.objectStore('proposals').put({
          id: 'legacy',
          input: legacyInput,
          photo: null,
          createdAt: 1,
          updatedAt: 1,
        })
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })

    const { getProposal } = await import('./db')
    const found = await getProposal('legacy')
    expect(found).toBeDefined()
    expect(found!.input.propertyName).toBe('旧データ')
    expect(found!.input.registrationFee).toBe(0)
    expect(found!.input.simulationYears).toBe(15)
  })
})
