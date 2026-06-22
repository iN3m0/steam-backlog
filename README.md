# Steam Backlog Tracker

A desktop app for managing your Steam game backlog. Import your library, track completion status, fetch HLTB time estimates, and visualise your progress with stats.

![Steam Backlog Tracker](https://img.shields.io/badge/platform-Windows-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Version](https://img.shields.io/github/v/release/iN3m0/steam-backlog)

## Features

- **Library sync** — import all games from your Steam account in one click
- **Status tracking** — Unplayed, In Progress, Ongoing, Completed, Mastered, Abandoned
- **Priority system** — 1–5 star priority rating per game
- **HLTB integration** — fetch Main Story, Main+Extra, and 100% time estimates from HowLongToBeat
- **Achievement tracking** — earned/total achievements with a progress bar
- **Stats dashboard** — playtime distribution, backlog heat map, HLTB vs actual comparisons
- **Bulk operations** — fetch HLTB or achievement data for your entire library at once
- **Smart sorting** — sort by HLTB time, achievement %, last played, priority, playtime, and more
- **Tag system** — tag games and filter by tag via the search bar
- **Random game picker** — can't decide what to play? Let the app pick from your current filter
- **Data export** — export your library as JSON for backup or migration
- **Virtual scrolling** — handles 500+ game libraries without slowdown

## Download

Grab the latest installer from the [Releases](https://github.com/iN3m0/steam-backlog/releases) page.

## Setup

You need two things before syncing:

**1. Steam Web API Key**
Get one at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey). Log in and enter any domain (e.g. `localhost`).

**2. Steam ID (64-bit)**
Find yours at [steamidfinder.com](https://www.steamidfinder.com/). It looks like `76561198XXXXXXXXX`.

Open the app → click **⚙ Settings** → paste both values → click **⟳ Sync Library**.

> **Note:** Your Steam game list must be set to **Public**.
> Steam → Profile → Edit Profile → Privacy Settings → Game Details: **Public**

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + F` | Focus search |
| `Escape` | Clear search / close panels / close modals |

## Development

```bash
npm install
npm run dev
```

### Build installer

```bash
npm run package
```

Produces a Windows `.exe` installer in `release/`.

## Tech Stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React 18](https://react.dev/) + TypeScript
- [electron-store](https://github.com/sindresorhus/electron-store) for local persistence
- [HowLongToBeat](https://howlongtobeat.com) API for time estimates
- [Steam Web API](https://steamcommunity.com/dev) for library data and achievements
- [@tanstack/react-virtual](https://tanstack.com/virtual) for virtualised scrolling

## License

MIT
