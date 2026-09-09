import type { ProposalInput } from '../domain/types'

export interface SavedProposal {
  id: string
  input: ProposalInput
  /** 室内または外観の写真。IndexedDB には Blob のまま保存する */
  photo: Blob | null
  createdAt: number
  updatedAt: number
}
