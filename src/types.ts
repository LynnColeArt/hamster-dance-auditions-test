export type AuditionStatus = 'draft' | 'scheduled' | 'posted'

export interface Audition {
  id: number
  hamsterName: string
  danceStyle: string
  scheduledAt: string
  status: AuditionStatus
  createdAt: string
}
