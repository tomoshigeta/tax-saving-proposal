import { withDefaults } from '../domain/defaults'
import { blobToDataUrl, dataUrlToBlob } from './images'
import { listProposals, putProposal } from './db'
import type { SavedProposal } from './types'

/**
 * JSON エクスポート / インポート。
 *
 * IndexedDB はブラウザのキャッシュクリアや PC 買い替えで消える。
 * 履歴の復旧手段がゼロになるのを避けるため、ファイルへの書き出しを備える。
 */
const FORMAT = 'rent-assessment-backup'
const FORMAT_VERSION = 1

interface BackupProposal extends Omit<SavedProposal, 'photo'> {
  photo: string | null
}

interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  proposals: BackupProposal[]
}

export async function exportBackup(): Promise<Blob> {
  const proposals = await listProposals()
  const backup: Backup = {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    proposals: await Promise.all(
      proposals.map(async (p) => ({
        ...p,
        photo: p.photo ? await blobToDataUrl(p.photo) : null,
      })),
    ),
  }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

/** 同じ id の提案は上書きする。戻り値は取り込んだ件数 */
export async function importBackup(text: string): Promise<number> {
  const parsed: unknown = JSON.parse(text)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Backup).format !== FORMAT ||
    !Array.isArray((parsed as Backup).proposals)
  ) {
    throw new Error('このファイルは提案書のバックアップではありません')
  }

  const backup = parsed as Backup
  for (const p of backup.proposals) {
    await putProposal({
      ...p,
      // 古いバックアップには後から増えた項目が無い。既定値で埋める
      input: withDefaults(p.input),
      photo: p.photo ? await dataUrlToBlob(p.photo) : null,
    })
  }
  return backup.proposals.length
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
