import { useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

interface Props { onClose: () => void }

const SECTIONS = [
  { id: 'start',    icon: '🚀', title: 'Getting Started'   },
  { id: 'library',  icon: '🎮', title: 'Managing Games'    },
  { id: 'hltb',     icon: '⏱',  title: 'HLTB & Achievements' },
  { id: 'features', icon: '⚡', title: 'Features'          },
  { id: 'faq',      icon: '❓', title: 'FAQ'               },
]

export default function HelpModal({ onClose }: Props) {
  const [active, setActive] = useState('start')

  function openExternal(url: string) { api.app.openExternal(url) }

  function handleOverlay(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="help-modal">
        {/* Sidebar */}
        <div className="help-sidebar">
          <div className="help-sidebar-title">Help &amp; Guide</div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`help-nav-btn ${active === s.id ? 'active' : ''}`}
              onClick={() => setActive(s.id)}
            >
              <span>{s.icon}</span> {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="help-content">
          <button className="help-close" onClick={onClose}>×</button>

          {active === 'start' && <GettingStarted openExternal={openExternal} />}
          {active === 'library'  && <ManagingGames />}
          {active === 'hltb'     && <HltbGuide />}
          {active === 'features' && <Features />}
          {active === 'faq'      && <FAQ openExternal={openExternal} />}
        </div>
      </div>
    </div>
  )
}

// ── Section components ──────────────────────────────────────────────────────

function H({ children }: { children: React.ReactNode }) {
  return <div className="help-section-title">{children}</div>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="help-p">{children}</p>
}
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="help-step">
      <div className="help-step-num">{n}</div>
      <div>{children}</div>
    </div>
  )
}
function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="help-faq-item">
      <div className="help-faq-q">{q}</div>
      <div className="help-faq-a">{children}</div>
    </div>
  )
}

function GettingStarted({ openExternal }: { openExternal: (u: string) => void }) {
  return (
    <>
      <H>Getting Started</H>
      <P>Steam Backlog Tracker connects to your Steam account to import your game library. You'll need two things: a Steam Web API key and your Steam ID.</P>

      <Step n={1}>
        Get your <strong>Steam Web API Key</strong> from{' '}
        <button className="help-link" onClick={() => openExternal('https://steamcommunity.com/dev/apikey')}>
          steamcommunity.com/dev/apikey ↗
        </button>
        . Log in to Steam and enter any domain name (e.g. <code>localhost</code>) to generate the key.
      </Step>

      <Step n={2}>
        Find your <strong>Steam ID (64-bit)</strong> at{' '}
        <button className="help-link" onClick={() => openExternal('https://www.steamidfinder.com/')}>
          steamidfinder.com ↗
        </button>
        . It looks like <code>76561198XXXXXXXXX</code>.
      </Step>

      <Step n={3}>
        Click the <strong>⚙ Settings</strong> button in the top-right corner and paste both values in.
      </Step>

      <Step n={4}>
        Click <strong>⟳ Sync Library</strong>. Your games will be imported and you're ready to go.
      </Step>

      <div className="help-callout">
        ⚠ Your Steam game list must be set to <strong>Public</strong>. In Steam, go to your profile → Edit Profile → Privacy Settings → Game Details: Public.
      </div>
    </>
  )
}

function ManagingGames() {
  return (
    <>
      <H>Managing Your Games</H>
      <P>Click any game card to open its detail panel on the right side.</P>

      <H>Statuses</H>
      <div className="help-table">
        {[
          ['Unplayed', 'Haven\'t started it yet'],
          ['In Progress', 'Currently playing'],
          ['Ongoing', 'Live-service / multiplayer with no completion state (e.g. R6, Fortnite)'],
          ['Completed', 'Finished the main story or campaign'],
          ['Mastered', 'Achieved 100% / all achievements'],
          ['Abandoned', 'Gave up on it'],
        ].map(([status, desc]) => (
          <div key={status} className="help-table-row">
            <div className="help-table-key">{status}</div>
            <div className="help-table-val">{desc}</div>
          </div>
        ))}
      </div>

      <H>Priority Stars</H>
      <P>1–5 stars represent how much you want to play a game. The 🎲 Random Picker favours higher-priority unplayed and in-progress games.</P>

      <H>Tags</H>
      <P>Type a tag in the Tags field and press Enter or Tab to add it. Use tags like <code>co-op</code>, <code>rpg</code>, <code>short</code> to organise your library. You can filter by tag using the search bar.</P>

      <H>Bulk Actions</H>
      <P>Click the <strong>☑</strong> button in the toolbar to enter selection mode. Click cards to select them, then use the bulk action bar to change status or remove games.</P>
    </>
  )
}

function HltbGuide() {
  return (
    <>
      <H>HowLongToBeat (HLTB)</H>
      <P>HLTB provides crowd-sourced completion time estimates for each game. In a game's detail panel, click <strong>Fetch HLTB</strong> to pull the data.</P>

      <div className="help-table">
        {[
          ['Main Story', 'Time to complete the main campaign or primary objective'],
          ['Main + Extra', 'Main story plus notable side content'],
          ['100%', 'All achievements, collectibles, and side content'],
        ].map(([k, v]) => (
          <div key={k} className="help-table-row">
            <div className="help-table-key">{k}</div>
            <div className="help-table-val">{v}</div>
          </div>
        ))}
      </div>

      <P>To fetch HLTB data for your whole library at once, click <strong>⚡ Fetch All ▾ → HLTB data</strong> in the header. Requests are paced at ~1 per second to avoid being rate-limited — for 200 games this takes about 3–4 minutes.</P>

      <H>Achievements</H>
      <P>Click <strong>Fetch Achievements</strong> in a game's detail panel to load your earned/total achievement count from Steam. The progress bar fills as you earn more.</P>

      <P>To bulk-fetch for all games, use <strong>⚡ Fetch All ▾ → Achievements</strong>. Games with no achievement system or private stats will be skipped automatically.</P>

      <div className="help-callout">
        💡 Use <strong>Sort: Achievement %</strong> to find games where you're close to 100% — a great shortlist for boosting your completion rate.
      </div>
    </>
  )
}

function Features() {
  return (
    <>
      <H>🎲 Random Game Picker</H>
      <P>Click the 🎲 button in the toolbar to get a random game suggestion from your currently visible list. It prefers unplayed and in-progress games. You can filter or search first to narrow the pool — e.g. filter to Unplayed and sort by HLTB Main to get a random short game.</P>

      <H>📊 Stats Page</H>
      <P>Switch to the Stats view in the sidebar for a full breakdown of your library. Click any stat card to expand a list of the games in that group. Click any Playtime Distribution bucket to see the games in that range.</P>
      <P><strong>Backlog Heat</strong> estimates how long it would take to clear your unplayed and in-progress games based on HLTB data. Toggle between Main Story and 100% mode. Check "Include Ongoing" to factor in live-service games too.</P>

      <H>⚡ Bulk Fetch</H>
      <P>The <strong>⚡ Fetch All ▾</strong> dropdown fetches HLTB or achievement data for every game that's missing it. A progress bar tracks the operation and you can cancel at any time.</P>

      <H>☑ Bulk Selection</H>
      <P>Click ☑ in the toolbar, select games, then use the bulk action bar to change their status or remove them all at once.</P>

      <H>⌨ Keyboard Shortcuts</H>
      <div className="help-table">
        {[
          ['Ctrl + F', 'Focus the search bar'],
          ['Escape', 'Clear search / close detail panel / close modals'],
          ['↑ / ↓  or  J / K', 'Navigate between games in the grid'],
        ].map(([k, v]) => (
          <div key={k} className="help-table-row">
            <div className="help-table-key" style={{ fontFamily: 'monospace' }}>{k}</div>
            <div className="help-table-val">{v}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function FAQ({ openExternal }: { openExternal: (u: string) => void }) {
  return (
    <>
      <H>Frequently Asked Questions</H>

      <Q q="Why don't my games show up after syncing?">
        Your Steam game list must be Public. In Steam, go to your Profile → Edit Profile → Privacy Settings → Game Details → set to <strong>Public</strong>. Then sync again.
      </Q>

      <Q q="Why are some cover images missing?">
        Very old games or non-game items (soundtracks, tools) sometimes don't have Steam capsule images. These show a text placeholder with the game name instead.
      </Q>

      <Q q="HLTB says 'No HLTB results' for a game.">
        Very niche, obscure, or old games may not have entries on HowLongToBeat. The field will stay empty — this is expected.
      </Q>

      <Q q="Achievement fetch fails with 'private' or 'no stats'.">
        Both <strong>Game Details</strong> and <strong>Game Achievements</strong> must be Public in your Steam privacy settings. Some games also simply have no achievement system.
      </Q>

      <Q q="The HLTB bulk fetch is very slow.">
        Requests are deliberately paced at ~1.2 seconds apart to avoid being blocked by HowLongToBeat's rate limiting. For a 300-game library, expect around 6 minutes. You can cancel at any time and resume later — already-fetched games are skipped.
      </Q>

      <Q q="Where is my data stored?">
        All your data is saved locally in{' '}
        <code>%APPDATA%\steam-backlog\config.json</code>. Use{' '}
        <strong>Settings → Export Data</strong> to create a portable JSON backup.
        No data is ever sent to any server other than Steam and HowLongToBeat.
      </Q>

      <Q q="How do I report a bug or request a feature?">
        <button className="help-link" onClick={() => openExternal('https://github.com/iN3m0/steam-backlog/issues')}>
          Open an issue on GitHub ↗
        </button>
      </Q>
    </>
  )
}
