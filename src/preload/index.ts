import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  settings: {
    get: (): Promise<{ steamApiKey: string; steamId: string }> =>
      ipcRenderer.invoke('settings:get'),
    set: (s: { steamApiKey: string; steamId: string }): Promise<void> =>
      ipcRenderer.invoke('settings:set', s)
  },
  games: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('games:getAll'),
    update: (game: unknown): Promise<unknown> => ipcRenderer.invoke('games:update', game),
    updateMany: (games: unknown[]): Promise<void> => ipcRenderer.invoke('games:updateMany', games),
    delete: (steamAppId: number): Promise<void> => ipcRenderer.invoke('games:delete', steamAppId)
  },
  steam: {
    import: (): Promise<{ total: number; newGames: number }> =>
      ipcRenderer.invoke('steam:import'),
    fetchAchievements: (appId: number): Promise<{ earned: number; total: number }> =>
      ipcRenderer.invoke('steam:fetchAchievements', appId)
  },
  hltb: {
    search: (gameName: string): Promise<{ main: number; extra: number; completionist: number }> =>
      ipcRenderer.invoke('hltb:search', gameName)
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url)
  },
  data: {
    exportToFile: (): Promise<{ success: boolean; path?: string }> =>
      ipcRenderer.invoke('data:exportToFile')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
