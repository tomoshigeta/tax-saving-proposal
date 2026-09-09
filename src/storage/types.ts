import type { ProposalInput } from '../domain/types'

export interface SavedProposal {
  id: string
  input: ProposalInput
  /** 間取り図。IndexedDB には Blob のまま保存する */
  floorPlan: Blob | null
  /** 外観写真 */
  exterior: Blob | null
  createdAt: number
  updatedAt: number
}
