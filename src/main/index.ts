import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { autoUpdater } from 'electron-updater'

export type GameStatus = 'unplayed' | 'in_progress' | 'ongoing' | 'completed' | 'mastered' | 'abandoned'

export interface Game {
  steamAppId: number
  name: string
  imgIconUrl: string
  playtimeForever: number
  lastPlayedAt: number
  status: GameStatus
  priority: number
  notes: string
  tags: string[]
  hltb: { main: number; extra: number; completionist: number } | null
  achievements: { earned: number; total: number } | null
  lastSynced: string
}

interface WindowState { width: number; height: number; x?: number; y?: number; isMaximized: boolean }

interface StoreSchema {
  games: Record<string, Game>
  settings: { steamApiKey: string; steamId: string }
  windowState: WindowState
}

const store = new Store<StoreSchema>({
  defaults: {
    games: {},
    settings: { steamApiKey: '', steamId: '' },
    windowState: { width: 1280, height: 820, isMaximized: false }
  }
})

// ── HLTB search ───────────────────────────────────────────────────────────────
// HLTB uses /api/bleed with a short-lived session token from /api/bleed/init.
// We fetch a fresh token per search (no stored key needed).

const HLTB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// Token is IP+UA bound; cache for 4 min (HLTB seems to expire around 5 min)
let bleedTokenCache: { token: string; hpKey: string; hpVal: string; exp: number } | null = null

async function getBleedToken(force = false): Promise<{ token: string; hpKey: string; hpVal: string }> {
  if (!force && bleedTokenCache && Date.now() < bleedTokenCache.exp) return bleedTokenCache
  try {
    const r = await fetch(`https://howlongtobeat.com/api/bleed/init?t=${Date.now()}`, {
      headers: { 'User-Agent': HLTB_UA, 'Referer': 'https://howlongtobeat.com/' }
    })
    const data = await r.json()
    bleedTokenCache = { ...data, exp: Date.now() + 4 * 60 * 1000 }
    return bleedTokenCache
  } catch {
    throw new Error('Could not reach HowLongToBeat. Check your internet connection.')
  }
}

async function searchHltb(gameName: string): Promise<{ main: number; extra: number; completionist: number }> {
  let init = await getBleedToken()

  // 2. Build payload — hpKey/hpVal must also appear as a body property
  const payload: Record<string, unknown> = {
    searchType: 'games',
    searchTerms: gameName.split(' '),
    searchPage: 1,
    size: 5,
    searchOptions: {
      games: {
        userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main',
        rangeTime: { min: 0, max: 0 },
        gameplay: { perspective: '', flow: '', genre: '', difficulty: '' },
        rangeYear: { min: '', max: '' },
        modifier: ''
      },
      users: { sortCategory: 'postcount' },
      lists: { sortCategory: 'follows' },
      filter: '', sort: 0, randomizer: 0
    },
    useCache: true
  }
  // 3. Search (retry once if token expired)
  const doSearch = async (tok: typeof init) => fetch('https://howlongtobeat.com/api/bleed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': HLTB_UA,
      'Origin': 'https://howlongtobeat.com',
      'Referer': 'https://howlongtobeat.com/',
      'x-auth-token': tok.token,
      'x-hp-key': tok.hpKey,
      'x-hp-val': tok.hpVal
    },
    body: JSON.stringify({ ...payload, [tok.hpKey]: tok.hpVal })
  })

  let res = await doSearch(init)
  if (res.status === 403) {
    init = await getBleedToken(true)
    res = await doSearch(init)
  }
  if (!res.ok) throw new Error(`HLTB returned ${res.status}. Try again.`)

  const data = await res.json()
  if (!data.data?.length) throw new Error(`No HLTB results for "${gameName}".`)

  const g = data.data[0]
  return {
    main: Math.round((g.comp_main || 0) / 3600),
    extra: Math.round((g.comp_plus || 0) / 3600),
    completionist: Math.round((g.comp_100 || 0) / 3600)
  }
}

function normalizeGame(g: Partial<Game> & { steamAppId: number; name: string }): Game {
  return {
    lastPlayedAt: 0,
    hltb: null,
    achievements: null,
    imgIconUrl: '',
    playtimeForever: 0,
    status: 'unplayed',
    priority: 3,
    notes: '',
    tags: [],
    lastSynced: new Date().toISOString(),
    ...g
  }
}

function createWindow(): void {
  const saved = store.get('windowState')

  const mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Steam Backlog Tracker',
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (saved.isMaximized) mainWindow.maximize()
  })

  function saveWindowState() {
    if (mainWindow.isDestroyed()) return
    const isMaximized = mainWindow.isMaximized()
    const bounds = isMaximized ? {} : mainWindow.getBounds()
    store.set('windowState', { ...store.get('windowState'), ...bounds, isMaximized })
  }

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)
  mainWindow.on('close', saveWindowState)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.steambacklog')
  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))

  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => store.get('settings'))

  ipcMain.handle('settings:set', (_, s: { steamApiKey: string; steamId: string }) => {
    store.set('settings', s)
  })

  // ── Games ─────────────────────────────────────────────────────────────────
  ipcMain.handle('games:getAll', () =>
    Object.values(store.get('games')).map(normalizeGame)
  )

  ipcMain.handle('games:update', (_, game: Game) => {
    store.set(`games.${game.steamAppId}`, game)
    return game
  })

  ipcMain.handle('games:updateMany', (_, games: Game[]) => {
    const stored = store.get('games')
    for (const g of games) stored[g.steamAppId.toString()] = g
    store.set('games', stored)
  })

  ipcMain.handle('games:delete', (_, steamAppId: number) => {
    const games = store.get('games')
    delete games[steamAppId.toString()]
    store.set('games', games)
  })

  // ── Steam API ─────────────────────────────────────────────────────────────
  ipcMain.handle('steam:import', async () => {
    const settings = store.get('settings')
    if (!settings.steamApiKey || !settings.steamId) {
      throw new Error('Steam API key and Steam ID are required. Open Settings to add them.')
    }

    const url =
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/` +
      `?key=${settings.steamApiKey}&steamid=${settings.steamId}` +
      `&include_appinfo=1&include_played_free_games=1&format=json`

    let response: Response
    try {
      response = await fetch(url)
    } catch {
      throw new Error('Network error. Check your internet connection.')
    }

    if (response.status === 403) throw new Error('Invalid Steam API key.')
    if (!response.ok) throw new Error(`Steam API returned ${response.status}. Check your Steam ID.`)

    const data = await response.json()
    const steamGames: Array<{
      appid: number
      name: string
      playtime_forever: number
      img_icon_url: string
      rtime_last_played: number
    }> = data.response?.games || []

    if (steamGames.length === 0) {
      throw new Error('No games found. Make sure your Steam profile and game list are Public.')
    }

    const existing = store.get('games')
    let newCount = 0

    for (const sg of steamGames) {
      const id = sg.appid.toString()
      if (!existing[id]) {
        existing[id] = normalizeGame({
          steamAppId: sg.appid,
          name: sg.name,
          imgIconUrl: sg.img_icon_url,
          playtimeForever: sg.playtime_forever || 0,
          lastPlayedAt: sg.rtime_last_played || 0,
          lastSynced: new Date().toISOString()
        })
        newCount++
      } else {
        existing[id].name = sg.name
        existing[id].playtimeForever = sg.playtime_forever || 0
        existing[id].lastPlayedAt = sg.rtime_last_played || 0
        existing[id].imgIconUrl = sg.img_icon_url
        existing[id].lastSynced = new Date().toISOString()
      }
    }

    store.set('games', existing)
    return { total: steamGames.length, newGames: newCount }
  })

  // ── Achievements ──────────────────────────────────────────────────────────
  ipcMain.handle('steam:fetchAchievements', async (_, appId: number) => {
    const { steamApiKey, steamId } = store.get('settings')
    if (!steamApiKey || !steamId) throw new Error('Configure Steam API key and Steam ID first.')

    const url =
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/` +
      `?appid=${appId}&key=${steamApiKey}&steamid=${steamId}&format=json`

    let response: Response
    try {
      response = await fetch(url)
    } catch {
      throw new Error('Network error.')
    }

    const data = await response.json()

    if (!data.playerstats?.success) {
      const msg: string = data.playerstats?.error || ''
      if (msg.toLowerCase().includes('private')) throw new Error('Achievement stats are private.')
      throw new Error('This game has no achievement stats.')
    }

    const list: Array<{ achieved: number }> = data.playerstats.achievements
    const earned = list.filter((a) => a.achieved === 1).length
    return { earned, total: list.length }
  })

  // ── HowLongToBeat ─────────────────────────────────────────────────────────
  ipcMain.handle('hltb:search', async (_, gameName: string) => {
    return await searchHltb(gameName)
  })

  // ── App utilities ─────────────────────────────────────────────────────────
  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('app:openExternal', (_, url: string) => shell.openExternal(url))

  ipcMain.handle('data:exportToFile', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Library Data',
      defaultPath: `steam-backlog-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { success: false }
    const payload = {
      exportedAt: new Date().toISOString(),
      version: app.getVersion(),
      games: Object.values(store.get('games')).map(normalizeGame),
      steamId: store.get('settings').steamId
    }
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return { success: true, path: result.filePath }
  })

  createWindow()

  // Auto-updater — only runs in packaged app.
  // To enable: set the correct owner/repo in package.json "publish" config
  // and create a GitHub release tagged with the version number.
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
