import { useCallback, useEffect, useState } from 'react'
import { emptyInput } from './domain/defaults'
import { deleteProposal, getProposal, listProposals, newId, putProposal } from './storage/db'
import { downloadBlob, exportBackup, importBackup } from './storage/backup'
import { ExcelFormatError, readExcelFile } from './storage/excelImport'
import type { SavedProposal } from './storage/types'
import { ListScreen } from './ui/ListScreen'
import { EditScreen } from './ui/EditScreen'
import { PreviewScreen } from './ui/PreviewScreen'
import { HelpScreen } from './ui/HelpScreen'

type Screen =
  | { name: 'list' }
  | { name: 'help' }
  | { name: 'edit'; id: string }
  | { name: 'preview'; id: string }

const blankProposal = (): SavedProposal => ({
  id: newId(),
  input: emptyInput(),
  photo: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'list' })
  const [proposals, setProposals] = useState<SavedProposal[]>([])
  const [draft, setDraft] = useState<SavedProposal | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setProposals(await listProposals())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const notify = (text: string) => {
    setMessage(text)
    // 取り込み結果は行ごとの指摘を含むので、短い通知より長く出す
    window.setTimeout(() => setMessage(null), text.includes('\n') ? 30_000 : 4000)
  }

  const save = useCallback(
    async (proposal: SavedProposal) => {
      setSaving(true)
      try {
        const next = { ...proposal, updatedAt: Date.now() }
        await putProposal(next)
        setDraft(next)
        await refresh()
      } finally {
        setSaving(false)
      }
    },
    [refresh],
  )

  /** EditScreen からの更新。非同期の更新どうしが上書きし合わないよう関数で受ける */
  const updateDraft = useCallback((update: (prev: SavedProposal) => SavedProposal) => {
    setDraft((prev) => (prev ? update(prev) : prev))
  }, [])

  const openForEdit = async (id: string) => {
    const found = await getProposal(id)
    if (!found) return
    setDraft(found)
    setScreen({ name: 'edit', id })
  }

  const create = () => {
    const fresh = blankProposal()
    setDraft(fresh)
    setScreen({ name: 'edit', id: fresh.id })
  }

  const duplicate = async (id: string) => {
    const source = await getProposal(id)
    if (!source) return
    const copy: SavedProposal = {
      ...source,
      id: newId(),
      input: { ...source.input, propertyName: `${source.input.propertyName} (複製)` },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await putProposal(copy)
    await refresh()
    notify('複製しました')
  }

  const remove = async (id: string) => {
    const target = proposals.find((p) => p.id === id)
    const name = target?.input.propertyName || 'この提案書'
    if (!window.confirm(`${name} を削除します。元に戻せません。`)) return
    await deleteProposal(id)
    await refresh()
    notify('削除しました')
  }

  const doExport = async () => {
    const blob = await exportBackup()
    const stamp = new Date().toISOString().slice(0, 10)
    downloadBlob(blob, `rent-assessment-${stamp}.json`)
    notify('バックアップを書き出しました')
  }

  const doImportExcel = async (file: File) => {
    try {
      const { inputs, problems } = await readExcelFile(file)
      const now = Date.now()
      for (const [i, input] of inputs.entries()) {
        await putProposal({
          id: newId(),
          input,
          photo: null,
          // 並び順が入力した順になるよう、行の順で1msずつずらす
          createdAt: now + i,
          updatedAt: now + i,
        })
      }
      await refresh()

      const head = inputs.length > 0 ? `${inputs.length}件を取り込みました。` : '取り込めた行がありません。'
      const detail = problems.map((p) => `${p.row}行目: ${p.message}`).join('\n')
      notify(problems.length > 0 ? `${head}\n取り込めなかった行:\n${detail}` : head)
    } catch (error) {
      notify(
        error instanceof ExcelFormatError
          ? error.message
          : 'このファイルは読み込めませんでした。テンプレートの形式か確認してください。',
      )
    }
  }

  const doImport = async (file: File) => {
    try {
      const count = await importBackup(await file.text())
      await refresh()
      notify(`${count}件を取り込みました`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '取り込みに失敗しました')
    }
  }

  if (screen.name === 'help') {
    return <HelpScreen onBack={() => setScreen({ name: 'list' })} />
  }

  if (screen.name === 'list') {
    return (
      <ListScreen
        proposals={proposals}
        onCreate={create}
        onHelp={() => setScreen({ name: 'help' })}
        onOpen={(id) => void openForEdit(id)}
        onDuplicate={(id) => void duplicate(id)}
        onDelete={(id) => void remove(id)}
        onExport={() => void doExport()}
        onImport={(file) => void doImport(file)}
        onImportExcel={(file) => void doImportExcel(file)}
        message={message}
      />
    )
  }

  if (!draft) {
    setScreen({ name: 'list' })
    return null
  }

  if (screen.name === 'preview') {
    return <PreviewScreen proposal={draft} onBack={() => setScreen({ name: 'edit', id: draft.id })} />
  }

  return (
    <EditScreen
      proposal={draft}
      saving={saving}
      onChange={updateDraft}
      onSave={() => void save(draft)}
      onPreview={() => {
        void save(draft)
        setScreen({ name: 'preview', id: draft.id })
      }}
      onBack={() => {
        void save(draft)
        setScreen({ name: 'list' })
      }}
    />
  )
}
