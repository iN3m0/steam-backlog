export type GameStatus = 'unplayed' | 'in_progress' | 'ongoing' | 'completed' | 'mastered' | 'abandoned'
export type SortKey = 'name' | 'playtime' | 'priority' | 'status' | 'lastPlayed' | 'hltbMain' | 'hltbExtra' | 'hltb100' | 'achievements'
export type FilterStatus = 'all' | GameStatus
export type AppView = 'games' | 'stats'

export interface HltbData {
  main: number       // hours
  extra: number
  completionist: number
}

export interface AchievementData {
  earned: number
  total: number
}

export interface Game {
  steamAppId: number
  name: string
  imgIconUrl: string
  playtimeForever: number   // minutes
  lastPlayedAt: number      // Unix timestamp (seconds); 0 = never
  status: GameStatus
  priority: number          // 1–5
  notes: string
  tags: string[]
  hltb: HltbData | null
  achievements: AchievementData | null
  lastSynced: string
}

export const STATUS_LABELS: Record<GameStatus, string> = {
  unplayed: 'Unplayed',
  in_progress: 'In Progress',
  ongoing: 'Ongoing',
  completed: 'Completed',
  mastered: 'Mastered',
  abandoned: 'Abandoned'
}

export const STATUS_COLORS: Record<GameStatus, string> = {
  unplayed: '#8f98a0',
  in_progress: '#66c0f4',
  ongoing: '#9b59b6',
  completed: '#4bb543',
  mastered: '#c9a227',
  abandoned: '#c25f5f'
}

export function formatPlaytime(minutes: number): string {
  if (minutes === 0) return '0 hrs'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hrs`
}

export function formatLastPlayed(timestamp: number): string {
  if (timestamp === 0) return 'Never'
  const date = new Date(timestamp * 1000)
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export function steamCoverUrl(appId: number): string {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`
}

export function steamHeaderUrl(appId: number): string {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
}

export function steamPageUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`
}
