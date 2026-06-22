import { useState, useEffect, useMemo, useRef } from 'react'
import { Game, FilterStatus, SortKey, AppView, STATUS_LABELS } from './types'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import GameGrid from './components/GameGrid'
import GameDetail from './components/GameDetail'
import SettingsModal from './components/SettingsModal'
import Notification from './components/Notification'
import StatsDashboard from './components/StatsDashboard'
import BulkActionBar from './components/BulkActionBar'
import RandomPickerModal from './components/RandomPickerModal'
import BulkProgressBar, { BulkProgress } from './components/BulkProgressBar'
import AboutModal from './components/AboutModal'
import HelpModal from './components/HelpModal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

const HLTB_DELAY_MS = 1200      // between HLTB requests — be respectful
const ACH_DELAY_MS  = 150       // Steam API is more permissive

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export default function App() {
  const [games, setGames] = useState<Game[]>([])
  const [selected, setSelected] = useState<Game | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [view, setView] = useState<AppView>('games')
  const [showSettings, setShowSettings] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [randomGame, setRandomGame] = useState<Game | null>(null)
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const cancelRef = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.games.getAll().then((data: Game[]) => setGames(data))
    api.settings.get().then((s: { steamApiKey: string }) => {
      if (!s.steamApiKey) setShowSettings(true)
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }
      if (e.key === 'Escape') {
        if (showAbout)    { setShowAbout(false);    return }
        if (showHelp)     { setShowHelp(false);     return }
        if (showSettings) { setShowSettings(false); return }
        if (randomGame)   { setRandomGame(null);    return }
        if (search)       { setSearch('');          return }
        if (selected)     { setSelected(null);      return }
        if (isSelecting)  { exitSelectMode();       return }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showAbout, showHelp, showSettings, randomGame, search, selected, isSelecting])

  function notify(msg: string, type: 'success' | 'error') {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // ── Sync ──────────────────────────────────────────────────────────────────
  async function handleSync() {
    setIsSyncing(true)
    try {
      const result = await api.steam.import()
      const updated: Game[] = await api.games.getAll()
      setGames(updated)
      notify(`Synced ${result.total} games · ${result.newGames} new`, 'success')
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Sync failed', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // ── Single game updates ───────────────────────────────────────────────────
  async function handleGameUpdate(updated: Game) {
    await api.games.update(updated)
    setGames(prev => prev.map(g => g.steamAppId === updated.steamAppId ? updated : g))
    setSelected(updated)
  }

  async function handleGameDelete(game: Game) {
    await api.games.delete(game.steamAppId)
    setGames(prev => prev.filter(g => g.steamAppId !== game.steamAppId))
    if (selected?.steamAppId === game.steamAppId) setSelected(null)
  }

  // ── Bulk selection ────────────────────────────────────────────────────────
  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitSelectMode() { setIsSelecting(false); setSelectedIds(new Set()) }

  async function handleExport() {
    try {
      const result = await api.data.exportToFile()
      if (result.success) notify(`Exported to ${result.path}`, 'success')
    } catch {
      notify('Export failed', 'error')
    }
  }

  async function handleBulkStatus(status: FilterStatus) {
    if (status === 'all') return
    const toUpdate = games.filter(g => selectedIds.has(g.steamAppId)).map(g => ({ ...g, status: status as Game['status'] }))
    await api.games.updateMany(toUpdate)
    setGames(prev => prev.map(g => selectedIds.has(g.steamAppId) ? { ...g, status: status as Game['status'] } : g))
    notify(`Updated ${toUpdate.length} game${toUpdate.length !== 1 ? 's' : ''}`, 'success')
    exitSelectMode()
  }

  async function handleBulkDelete() {
    for (const id of selectedIds) await api.games.delete(id)
    setGames(prev => prev.filter(g => !selectedIds.has(g.steamAppId)))
    if (selected && selectedIds.has(selected.steamAppId)) setSelected(null)
    notify(`Removed ${selectedIds.size} game${selectedIds.size !== 1 ? 's' : ''}`, 'success')
    exitSelectMode()
  }

  // ── Bulk HLTB fetch ───────────────────────────────────────────────────────
  async function startBulkHltb() {
    const toFetch = games.filter(g => !g.hltb)
    if (toFetch.length === 0) { notify('All games already have HLTB data', 'success'); return }

    cancelRef.current = false
    let errors = 0
    setBulkProgress({ type: 'hltb', done: 0, total: toFetch.length, errors: 0 })

    for (let i = 0; i < toFetch.length; i++) {
      if (cancelRef.current) break
      const game = toFetch[i]

      try {
        const hltb = await api.hltb.search(game.name)
        const updated = { ...game, hltb }
        await api.games.update(updated)
        setGames(prev => prev.map(g => g.steamAppId === updated.steamAppId ? updated : g))
      } catch {
        errors++
      }

      setBulkProgress({ type: 'hltb', done: i + 1, total: toFetch.length, errors })
      if (i < toFetch.length - 1) await sleep(HLTB_DELAY_MS)
    }

    const cancelled = cancelRef.current
    setBulkProgress(null)
    const fetched = toFetch.length - errors - (cancelled ? toFetch.length - (bulkProgress?.done ?? 0) : 0)
    notify(
      cancelled
        ? `Cancelled — HLTB fetched for ${toFetch.findIndex((_, i) => i === (bulkProgress?.done ?? 0))} games`
        : `HLTB done — ${toFetch.length - errors} fetched, ${errors} not found`,
      'success'
    )
    void fetched
  }

  // ── Bulk achievement fetch ────────────────────────────────────────────────
  async function startBulkAchievements() {
    const toFetch = games.filter(g => !g.achievements)
    if (toFetch.length === 0) { notify('All games already have achievement data', 'success'); return }

    cancelRef.current = false
    let errors = 0
    setBulkProgress({ type: 'achievements', done: 0, total: toFetch.length, errors: 0 })

    for (let i = 0; i < toFetch.length; i++) {
      if (cancelRef.current) break
      const game = toFetch[i]

      try {
        const achievements = await api.steam.fetchAchievements(game.steamAppId)
        const updated = { ...game, achievements }
        await api.games.update(updated)
        setGames(prev => prev.map(g => g.steamAppId === updated.steamAppId ? updated : g))
      } catch {
        // Game has no achievements or stats are private — skip silently
        errors++
      }

      setBulkProgress({ type: 'achievements', done: i + 1, total: toFetch.length, errors })
      if (i < toFetch.length - 1) await sleep(ACH_DELAY_MS)
    }

    const cancelled = cancelRef.current
    setBulkProgress(null)
    notify(
      cancelled ? 'Achievement fetch cancelled' : `Achievements done — ${toFetch.length - errors} fetched, ${errors} no data`,
      'success'
    )
  }

  // ── Random picker ─────────────────────────────────────────────────────────
  function pickRandom() {
    if (displayed.length === 0) { notify('No games in current view to pick from', 'error'); return }
    const pool = displayed.filter(g => g.status === 'unplayed' || g.status === 'in_progress')
    const source = pool.length > 0 ? pool : displayed
    setRandomGame(source[Math.floor(Math.random() * source.length)])
  }

  function rePickRandom() {
    const pool = displayed.filter(g => g.status === 'unplayed' || g.status === 'in_progress')
    const source = pool.length > 0 ? pool : displayed
    setRandomGame(source[Math.floor(Math.random() * source.length)])
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<FilterStatus, number> = { all: games.length, unplayed: 0, in_progress: 0, ongoing: 0, completed: 0, mastered: 0, abandoned: 0 }
    for (const g of games) c[g.status]++
    return c
  }, [games])

  const { hltbMissing, achievementsMissing } = useMemo(() => ({
    hltbMissing: games.filter(g => !g.hltb).length,
    achievementsMissing: games.filter(g => !g.achievements).length
  }), [games])

  const displayed = useMemo(() => {
    let result = games
    if (filter !== 'all') result = result.filter(g => g.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(g => g.name.toLowerCase().includes(q) || g.tags.some(t => t.toLowerCase().includes(q)))
    }
    if (sort === 'hltbMain')     result = result.filter(g => g.hltb && g.hltb.main > 0)
    if (sort === 'hltbExtra')    result = result.filter(g => g.hltb && g.hltb.extra > 0)
    if (sort === 'hltb100')      result = result.filter(g => g.hltb && g.hltb.completionist > 0)
    if (sort === 'achievements')  result = result.filter(g => g.achievements && g.achievements.total > 0)

    return [...result].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'playtime') return b.playtimeForever - a.playtimeForever
      if (sort === 'priority') return b.priority - a.priority
      if (sort === 'status') return STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status])
      if (sort === 'lastPlayed') {
        if (a.lastPlayedAt === 0 && b.lastPlayedAt === 0) return 0
        if (a.lastPlayedAt === 0) return 1
        if (b.lastPlayedAt === 0) return -1
        return b.lastPlayedAt - a.lastPlayedAt
      }
      if (sort === 'hltbMain' || sort === 'hltbExtra' || sort === 'hltb100') {
        const key = sort === 'hltbMain' ? 'main' : sort === 'hltbExtra' ? 'extra' : 'completionist'
        const aH = a.hltb?.[key] ?? Infinity
        const bH = b.hltb?.[key] ?? Infinity
        if (aH === bH) return a.name.localeCompare(b.name)
        return aH - bH
      }
      if (sort === 'achievements') {
        const aPct = a.achievements ? a.achievements.earned / a.achievements.total : -1
        const bPct = b.achievements ? b.achievements.earned / b.achievements.total : -1
        if (aPct === bPct) return a.name.localeCompare(b.name)
        return bPct - aPct
      }
      return 0
    })
  }, [games, filter, search, sort])

  const isBulkFetching = bulkProgress !== null

  return (
    <>
      <Header
        isSyncing={isSyncing}
        onSync={handleSync}
        onSettings={() => setShowSettings(true)}
        onFetchAllHltb={startBulkHltb}
        onFetchAllAchievements={startBulkAchievements}
        hltbMissing={hltbMissing}
        achievementsMissing={achievementsMissing}
        isBulkFetching={isBulkFetching}
        onHelp={() => setShowHelp(true)}
        onAbout={() => setShowAbout(true)}
        onExport={handleExport}
      />
      <div className="layout">
        <Sidebar filter={filter} counts={counts} onFilter={setFilter} view={view} onViewChange={setView} />
        <div className="main-content">
          <div className="toolbar">
            <input
              ref={searchRef}
              className="search-input"
              placeholder="Search games or tags… (Ctrl+F)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
              <option value="name">Sort: Name</option>
              <option value="playtime">Sort: Playtime</option>
              <option value="lastPlayed">Sort: Last Played</option>
              <option value="priority">Sort: Priority</option>
              <option value="status">Sort: Status</option>
              <optgroup label="HLTB (shortest first)">
                <option value="hltbMain">Sort: HLTB Main</option>
                <option value="hltbExtra">Sort: HLTB Extra</option>
                <option value="hltb100">Sort: HLTB 100%</option>
              </optgroup>
              <optgroup label="Achievements">
                <option value="achievements">Sort: Achievement %</option>
              </optgroup>
            </select>
            <button className="btn btn-icon" title="Pick a random game" onClick={pickRandom} disabled={view !== 'games'}>🎲</button>
            <button
              className={`btn btn-icon ${isSelecting ? 'btn-primary' : ''}`}
              title={isSelecting ? 'Exit select mode' : 'Select multiple games'}
              onClick={() => isSelecting ? exitSelectMode() : setIsSelecting(true)}
              disabled={view !== 'games'}
            >☑</button>
            <span className="game-count">{displayed.length} game{displayed.length !== 1 ? 's' : ''}</span>
          </div>

          {isSelecting && selectedIds.size > 0 && (
            <BulkActionBar count={selectedIds.size} onStatusChange={handleBulkStatus} onDelete={handleBulkDelete} onCancel={exitSelectMode} />
          )}

          {bulkProgress && (
            <BulkProgressBar progress={bulkProgress} onCancel={() => { cancelRef.current = true }} />
          )}

          {view === 'stats' ? (
            <StatsDashboard games={games} />
          ) : (
            <div className="content-area">
              <GameGrid
                games={displayed}
                selected={selected}
                onSelect={g => { if (!isSelecting) setSelected(g) }}
                hasAnyGames={games.length > 0}
                onOpenSettings={() => setShowSettings(true)}
                isSelecting={isSelecting}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
              {selected && !isSelecting && (
                <GameDetail key={selected.steamAppId} game={selected} onUpdate={handleGameUpdate} onDelete={handleGameDelete} />
              )}
            </div>
          )}
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onSaved={() => notify('Settings saved', 'success')} />}
      {showHelp  && <HelpModal  onClose={() => setShowHelp(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {randomGame && (
        <RandomPickerModal
          game={randomGame}
          onPickAgain={rePickRandom}
          onView={() => { setSelected(randomGame); setRandomGame(null) }}
          onClose={() => setRandomGame(null)}
        />
      )}

      {notification && <Notification msg={notification.msg} type={notification.type} />}
    </>
  )
}
