export function renderHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BowlSteam</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 12px; background: #f0f2f5; color: #1a1a1a; }
    h1 { font-size: 1.4rem; margin-bottom: 12px; }
    h2 { font-size: 1.15rem; margin-bottom: 10px; color: #333; }
    h3 { font-size: 1rem; margin-bottom: 8px; color: #555; }
    .card { background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    input[type="text"], input[type="number"], input[type="url"], select { font-size: 1rem; padding: 10px 12px; width: 100%; border: 1.5px solid #ddd; border-radius: 8px; margin-bottom: 8px; background: white; }
    input:focus, select:focus { outline: none; border-color: #2563eb; }
    button { font-size: 0.95rem; padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
    .btn-primary { background: #2563eb; color: white; width: 100%; }
    .btn-primary:disabled { background: #93b4f5; cursor: not-allowed; }
    .btn-success { background: #16a34a; color: white; width: 100%; }
    .btn-danger { background: #ef4444; color: white; padding: 6px 12px; font-size: 0.8rem; }
    .btn-sm { padding: 6px 12px; font-size: 0.8rem; width: auto; }
    .btn-outline { background: white; border: 1.5px solid #ddd; color: #333; }
    .btn-warning { background: #f59e0b; color: white; }
    .row { display: flex; gap: 8px; align-items: center; }
    .row > * { flex: 1; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .badge-upcoming { background: #dbeafe; color: #2563eb; }
    .badge-completed { background: #dcfce7; color: #16a34a; }
    .badge-home { background: #dcfce7; color: #16a34a; }
    .badge-away { background: #fee2e2; color: #dc2626; }
    .badge-dropped { background: #fef3c7; color: #92400e; }
    .badge-selected { background: #dbeafe; color: #2563eb; }
    .badge-reserve { background: #f3e8ff; color: #7c3aed; }
    .player-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .player-row:last-child { border-bottom: none; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #666; font-size: 0.8rem; }
    td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; }
    .nav { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
    .nav a { padding: 8px 14px; border-radius: 8px; text-decoration: none; color: #666; font-weight: 500; font-size: 0.9rem; background: white; cursor: pointer; }
    .nav a.active { background: #2563eb; color: white; }
    a { color: #2563eb; text-decoration: none; cursor: pointer; }
    .back { display: inline-block; margin-bottom: 10px; font-size: 0.9rem; }
    .empty { color: #999; text-align: center; padding: 20px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
    .topbar h1 { margin: 0; }
    .win { color: #16a34a; font-weight: 600; }
    .loss { color: #ef4444; font-weight: 600; }
    .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .toggle-row:last-child { border-bottom: none; }
    .toggle { position: relative; width: 48px; height: 28px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle .slider { position: absolute; inset: 0; background: #ccc; border-radius: 14px; cursor: pointer; transition: 0.2s; }
    .toggle .slider:before { content: ''; position: absolute; width: 22px; height: 22px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .slider { background: #2563eb; }
    .toggle input:checked + .slider:before { transform: translateX(20px); }
    .copy-btn { background: #f3f4f6; border: 1px solid #ddd; padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; color: #333; }
    .copy-btn.copied { background: #dcfce7; color: #16a34a; border-color: #16a34a; }
    .fixture-card { cursor: pointer; }
    .fixture-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .score-row { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .score-row:last-child { border-bottom: none; }
    .score-row .name { flex: 1; font-weight: 500; }
    .score-row input { width: 60px; text-align: center; margin-bottom: 0; padding: 8px; }
    .score-row .vs { color: #999; font-weight: 700; font-size: 0.85rem; }
    .dropped-banner { background: #fef3c7; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 0.9rem; color: #92400e; }
    .selected-list { counter-reset: sel; }
    .selected-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; counter-increment: sel; }
    .selected-item:last-child { border-bottom: none; }
    .selected-item::before { content: counter(sel) '.'; font-weight: 600; color: #666; margin-right: 8px; min-width: 20px; }
    .config-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .config-row:last-child { border-bottom: none; }
    .config-row label { font-size: 0.9rem; color: #333; }
    .config-row input, .config-row select { width: 80px; margin-bottom: 0; text-align: center; }
    .mb-8 { margin-bottom: 8px; }
    .mb-12 { margin-bottom: 12px; }
    .mt-8 { margin-top: 8px; }
    .mt-12 { margin-top: 12px; }
    .text-sm { font-size: 0.85rem; }
    .text-muted { color: #999; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .steps { display: flex; gap: 2px; margin-bottom: 16px; }
    .step { flex: 1; height: 4px; border-radius: 2px; background: #e5e7eb; }
    .step.done { background: #2563eb; }
    .step.active { background: #93b4f5; }
    .role-picker { display: flex; gap: 4px; flex-shrink: 0; }
    .role-picker button { padding: 4px 10px; font-size: 0.75rem; border-radius: 6px; border: 1.5px solid #ddd; background: white; color: #666; cursor: pointer; font-weight: 500; }
    .role-picker button.active-core { background: #2563eb; color: white; border-color: #2563eb; }
    .role-picker button.active-reserve { background: #7c3aed; color: white; border-color: #7c3aed; }
    .role-picker button.active-skip { background: #e5e7eb; color: #999; border-color: #e5e7eb; }
    .method-card { border: 2px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 8px; cursor: pointer; }
    .method-card.selected { border-color: #2563eb; background: #eff6ff; }
    .method-card h3 { margin-bottom: 4px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>

// --- State ---
let state = { teamId: null, seasonId: null, teams: [], seasons: [] };

// Setup wizard state
let setup = { step: 1, teamId: null, leagueName: '', teamName: '', url: '', scraped: null, players: [], method: 'form_based' };

// --- API helpers ---
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const $app = document.getElementById('app');
function render(html) { $app.innerHTML = html; }

// --- Router ---
function navigate(hash) { location.hash = hash; }

window.addEventListener('hashchange', route);
window.addEventListener('load', async () => {
  await loadState();
  route();
});

async function loadState() {
  state.teams = await api('/teams');
  if (state.teams.length > 0) {
    state.teamId = state.teams[0].id;
    state.seasons = await api('/seasons?team_id=' + state.teamId);
    const current = state.seasons.find(s => s.is_current);
    if (current) state.seasonId = current.id;
  }
}

function route() {
  const hash = location.hash.slice(1) || '/';
  const m = (pattern) => {
    const re = new RegExp('^' + pattern.replace(/:(\\w+)/g, '(\\\\d+)') + '$');
    const match = hash.match(re);
    return match ? match.slice(1).map(Number) : null;
  };

  let params;
  if (hash === '/') return viewDashboard();
  if (hash === '/setup') return viewSetup();
  if (hash === '/squad') return viewSquad();
  if (hash === '/ratings') return viewRatings();
  if (hash === '/fixtures') return viewFixtures();
  if (hash === '/season') return viewSeason();
  if ((params = m('/fixture/:id'))) return viewFixture(params[0]);
  if ((params = m('/player/:id'))) return viewPlayer(params[0]);
  if ((params = m('/season/:id/settings'))) return viewSettings(params[0]);
  render('<div class="card empty">Page not found</div>');
}

// ==========================================
// SETUP WIZARD
// ==========================================

function viewSetup() {
  const steps = [1,2,3,4,5];
  const stepBar = '<div class="steps">' + steps.map(s =>
    '<div class="step ' + (s < setup.step ? 'done' : s === setup.step ? 'active' : '') + '"></div>'
  ).join('') + '</div>';

  let content = '';
  if (setup.step === 1) content = setupStep1();
  if (setup.step === 2) content = setupStep2();
  if (setup.step === 3) content = setupStep3();
  if (setup.step === 4) content = setupStep4();
  if (setup.step === 5) content = setupStep5();

  render(stepBar + content);
}

// Step 1: League name
function setupStep1() {
  return \`
    <div class="card">
      <h2>What league do you play in?</h2>
      <input type="text" id="setup-league" placeholder="League name" value="\${esc(setup.leagueName)}">
      <button class="btn-primary mt-8" onclick="setupNext1()">Next</button>
    </div>
  \`;
}

function setupNext1() {
  const v = document.getElementById('setup-league').value.trim();
  if (!v) return;
  setup.leagueName = v;
  setup.step = 2;
  viewSetup();
}

// Step 2: Team name + URL
function setupStep2() {
  return \`
    <div class="card">
      <h2>Your team</h2>
      <label class="text-sm text-muted">Team name</label>
      <input type="text" id="setup-team" placeholder="e.g. Westlands 1" value="\${esc(setup.teamName)}">
      <label class="text-sm text-muted">Team page URL (from league website)</label>
      <input type="url" id="setup-url" placeholder="https://www.cgleague.co.uk/..." value="\${esc(setup.url)}">
      <p class="text-sm text-muted mb-8">Paste the URL of your team's page on the league website. We'll import your fixtures and player list from there.</p>
      <div class="row">
        <button class="btn-outline" onclick="setup.step=1;viewSetup()">Back</button>
        <button class="btn-primary" onclick="setupNext2()">Fetch Data</button>
      </div>
    </div>
  \`;
}

async function setupNext2() {
  const team = document.getElementById('setup-team').value.trim();
  const url = document.getElementById('setup-url').value.trim();
  if (!team) return alert('Enter your team name');
  setup.teamName = team;
  setup.url = url;

  // Create the team
  if (!setup.teamId) {
    const res = await api('/teams', { method: 'POST', body: { name: team, league_name: setup.leagueName, website_url: url || null } });
    setup.teamId = res.id;
  } else {
    await api('/teams/' + setup.teamId, { method: 'PUT', body: { name: team, league_name: setup.leagueName, website_url: url || null } });
  }

  // If URL provided, scrape it
  if (url) {
    render('<div class="card"><div class="empty">Fetching data from league website...</div></div>');
    try {
      setup.scraped = await api('/teams/' + setup.teamId + '/scrape', { method: 'POST', body: { year: new Date().getFullYear() } });
      // Initialize player roles — all default to 'skip'
      setup.players = setup.scraped.players.map(p => ({ name: p.name, role: 'skip' }));
    } catch (e) {
      alert('Could not fetch data: ' + e.message);
      viewSetup();
      return;
    }
  } else {
    setup.scraped = { fixtures: [], players: [], division: '' };
    setup.players = [];
  }

  setup.step = 3;
  viewSetup();
}

// Step 3: Categorize players
function setupStep3() {
  const counts = { core: 0, reserve: 0, skip: 0 };
  setup.players.forEach(p => counts[p.role]++);

  const playerRows = setup.players.map((p, i) => \`
    <div class="player-row">
      <span style="flex:1;">\${p.name}</span>
      <div class="role-picker">
        <button class="\${p.role === 'core' ? 'active-core' : ''}" onclick="setRole(\${i},'core')">Core</button>
        <button class="\${p.role === 'reserve' ? 'active-reserve' : ''}" onclick="setRole(\${i},'reserve')">Res</button>
        <button class="\${p.role === 'skip' ? 'active-skip' : ''}" onclick="setRole(\${i},'skip')">Skip</button>
      </div>
    </div>
  \`).join('');

  return \`
    <div class="card">
      <h2>Build your squad</h2>
      <p class="text-sm text-muted mb-8">For each player, choose: <strong>Core</strong> (regular squad), <strong>Res</strong> (reserve), or <strong>Skip</strong> (not in your team).</p>
      <div class="text-sm mb-8">
        Core: <strong>\${counts.core}</strong> &middot;
        Reserve: <strong>\${counts.reserve}</strong> &middot;
        Skipped: <strong>\${counts.skip}</strong>
      </div>
      \${playerRows}
    </div>

    <div class="card">
      <h3>Add unlisted player</h3>
      <div class="row">
        <input type="text" id="extra-player-name" placeholder="Player name" style="margin-bottom:0;">
        <select id="extra-player-role" style="width:90px;margin-bottom:0;">
          <option value="core">Core</option>
          <option value="reserve">Reserve</option>
        </select>
        <button class="btn-sm btn-primary" style="flex:none;" onclick="addExtraPlayer()">Add</button>
      </div>
    </div>

    <div class="row mt-8">
      <button class="btn-outline" onclick="setup.step=2;viewSetup()">Back</button>
      <button class="btn-primary" onclick="setupNext3()">Next</button>
    </div>
  \`;
}

function setRole(idx, role) {
  setup.players[idx].role = role;
  viewSetup();
}

function addExtraPlayer() {
  const name = document.getElementById('extra-player-name').value.trim();
  const role = document.getElementById('extra-player-role').value;
  if (!name) return;
  setup.players.push({ name, role });
  viewSetup();
}

function setupNext3() {
  const active = setup.players.filter(p => p.role !== 'skip');
  if (active.length === 0) return alert('Select at least one player for your squad');
  setup.step = 4;
  viewSetup();
}

// Step 4: Selection method
function setupStep4() {
  return \`
    <div class="card">
      <h2>Selection method</h2>
      <p class="text-sm text-muted mb-12">How should the team be selected each week?</p>

      <div class="method-card \${setup.method === 'form_based' ? 'selected' : ''}" onclick="setup.method='form_based';viewSetup()">
        <h3>Form-based with drop rule</h3>
        <p class="text-sm text-muted">Top 8 by rolling average of last 3 scores. Worst loser each week sits out the next match. Configurable parameters.</p>
      </div>

      <p class="text-sm text-muted mt-12">More methods coming soon. You can adjust the parameters after setup.</p>
    </div>

    <div class="row mt-8">
      <button class="btn-outline" onclick="setup.step=3;viewSetup()">Back</button>
      <button class="btn-primary" onclick="setupNext4()">Next</button>
    </div>
  \`;
}

function setupNext4() {
  setup.step = 5;
  viewSetup();
}

// Step 5: Review & confirm
function setupStep5() {
  const core = setup.players.filter(p => p.role === 'core');
  const reserve = setup.players.filter(p => p.role === 'reserve');
  const division = setup.scraped.division || 'Unknown';
  const fixtureCount = setup.scraped.fixtures.length;

  return \`
    <div class="card">
      <h2>Review</h2>
      <div class="mb-8">
        <div class="text-sm text-muted">League</div>
        <div style="font-weight:500;">\${esc(setup.leagueName)}</div>
      </div>
      <div class="mb-8">
        <div class="text-sm text-muted">Team</div>
        <div style="font-weight:500;">\${esc(setup.teamName)}</div>
      </div>
      <div class="mb-8">
        <div class="text-sm text-muted">Division / Year</div>
        <div style="font-weight:500;">\${esc(division)} &middot; \${new Date().getFullYear()}</div>
      </div>
      <div class="mb-8">
        <div class="text-sm text-muted">Fixtures</div>
        <div style="font-weight:500;">\${fixtureCount} matches imported</div>
      </div>
      <div class="mb-8">
        <div class="text-sm text-muted">Squad</div>
        <div style="font-weight:500;">\${core.length} core + \${reserve.length} reserve</div>
      </div>
      <div class="mb-8">
        <div class="text-sm text-muted">Selection method</div>
        <div style="font-weight:500;">Form-based with drop rule</div>
      </div>
    </div>

    <div class="row">
      <button class="btn-outline" onclick="setup.step=4;viewSetup()">Back</button>
      <button class="btn-success" onclick="finishSetup()">Create Season</button>
    </div>
  \`;
}

async function finishSetup() {
  render('<div class="card"><div class="empty">Setting up...</div></div>');

  const division = setup.scraped.division || 'Unknown';
  const year = new Date().getFullYear();

  const activePlayers = setup.players.filter(p => p.role !== 'skip');

  await api('/teams/' + setup.teamId + '/setup', {
    method: 'POST',
    body: {
      year,
      division,
      selection_method: setup.method,
      players: activePlayers,
      fixtures: setup.scraped.fixtures,
    },
  });

  // Reset setup state
  setup = { step: 1, teamId: null, leagueName: '', teamName: '', url: '', scraped: null, players: [], method: 'form_based' };

  await loadState();
  navigate('/');
}

// ==========================================
// MAIN VIEWS
// ==========================================

async function viewDashboard() {
  if (!state.teamId || !state.seasonId) {
    render(\`
      <div class="topbar"><h1>BowlSteam</h1></div>
      <div class="card empty">
        <p style="margin-bottom:12px;">Welcome! Let's set up your team.</p>
        <button class="btn-primary" onclick="navigate('/setup')">Get Started</button>
      </div>
    \`);
    return;
  }

  const team = state.teams.find(t => t.id === state.teamId);
  const season = state.seasons.find(s => s.id === state.seasonId);
  const [fixtures, ratings] = await Promise.all([
    api('/fixtures?season_id=' + state.seasonId),
    api('/ratings?season_id=' + state.seasonId),
  ]);

  const completed = fixtures.filter(f => f.status === 'completed');
  const upcoming = fixtures.filter(f => f.status === 'upcoming');
  const nextFixture = upcoming[0];
  const lastCompleted = completed[completed.length - 1];

  let nextHtml = '<div class="card empty">No upcoming fixtures</div>';
  if (nextFixture) {
    nextHtml = \`
      <div class="card fixture-card" onclick="navigate('/fixture/\${nextFixture.id}')">
        <div class="flex-between mb-8">
          <h3>Next Match</h3>
          <span class="badge badge-\${nextFixture.venue.toLowerCase()}">\${nextFixture.venue}</span>
        </div>
        <div style="font-size:1.1rem;font-weight:600;margin-bottom:4px;">vs \${nextFixture.opponent}</div>
        <div class="text-sm text-muted">\${fmtDate(nextFixture.match_date)} &middot; Week \${nextFixture.week_number}</div>
      </div>
    \`;
  }

  let resultHtml = '';
  if (lastCompleted) {
    const results = await api('/fixtures/' + lastCompleted.id + '/results');
    const wins = results.filter(r => r.player_score > r.opponent_score).length;
    const losses = results.filter(r => r.player_score < r.opponent_score).length;
    const totalFor = results.reduce((s, r) => s + r.player_score, 0);
    const totalAgainst = results.reduce((s, r) => s + r.opponent_score, 0);
    resultHtml = \`
      <div class="card">
        <div class="flex-between mb-8">
          <h3>Last Result</h3>
          <span class="text-sm text-muted">\${fmtDate(lastCompleted.match_date)}</span>
        </div>
        <div style="font-weight:600;margin-bottom:4px;">vs \${lastCompleted.opponent} (\${lastCompleted.venue})</div>
        <div>Games: <span class="win">\${wins}W</span> &ndash; <span class="loss">\${losses}L</span> &middot; Points: \${totalFor} &ndash; \${totalAgainst}</div>
      </div>
    \`;
  }

  render(\`
    <div class="topbar">
      <div>
        <h1>\${team ? team.name : 'BowlSteam'}</h1>
        <div class="text-sm text-muted">\${season ? season.division + ' &middot; ' + season.year : ''}</div>
      </div>
      <a onclick="navigate('/season')" class="text-sm">Manage</a>
    </div>

    <div class="card">
      <div class="flex-between">
        <div class="text-sm text-muted">\${completed.length} of \${fixtures.length} matches played</div>
      </div>
      <div style="margin-top:6px;background:#e5e7eb;border-radius:4px;height:6px;">
        <div style="background:#2563eb;border-radius:4px;height:6px;width:\${fixtures.length ? (completed.length/fixtures.length*100) : 0}%;"></div>
      </div>
    </div>

    \${nextHtml}
    \${resultHtml}

    <div class="nav">
      <a onclick="navigate('/fixtures')">Fixtures</a>
      <a onclick="navigate('/ratings')">Ratings</a>
      <a onclick="navigate('/squad')">Squad</a>
    </div>
  \`);
}

async function viewFixtures() {
  if (!state.seasonId) { navigate('/'); return; }
  const fixtures = await api('/fixtures?season_id=' + state.seasonId);

  const rows = fixtures.map(f => \`
    <div class="card fixture-card" onclick="navigate('/fixture/\${f.id}')">
      <div class="flex-between">
        <div>
          <div style="font-weight:500;">vs \${f.opponent}</div>
          <div class="text-sm text-muted">\${fmtDate(f.match_date)} &middot; Week \${f.week_number}</div>
        </div>
        <div style="display:flex;gap:4px;">
          <span class="badge badge-\${f.venue.toLowerCase()}">\${f.venue}</span>
          <span class="badge badge-\${f.status}">\${f.status}</span>
        </div>
      </div>
    </div>
  \`).join('');

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <h1>Fixtures</h1>
    \${rows || '<div class="card empty">No fixtures yet.</div>'}
  \`);
}

async function viewFixture(fixtureId) {
  const fixture = await api('/fixtures/' + fixtureId);
  const config = await api('/seasons/' + fixture.season_id + '/config');
  const players = await api('/players?team_id=' + fixture.team_id);

  const availMap = {};
  for (const a of fixture.availability) availMap[a.player_id] = a.is_available;

  const hasResults = fixture.results.length > 0;
  const hasSelection = fixture.selections.length > 0;

  // Availability panel
  const availRows = players.map(p => {
    const checked = availMap[p.id] !== undefined ? availMap[p.id] : 1;
    return \`
      <div class="toggle-row">
        <div>
          <span>\${p.name}</span>
          \${p.is_reserve ? '<span class="badge badge-reserve" style="margin-left:6px;">R</span>' : ''}
        </div>
        <label class="toggle">
          <input type="checkbox" data-player-id="\${p.id}" \${checked ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    \`;
  }).join('');

  // Selection panel
  let selectionHtml = '';
  if (hasSelection) {
    const selected = fixture.selections.filter(s => s.is_selected);
    const dropped = fixture.selections.filter(s => s.is_dropped);
    const notSelected = fixture.selections.filter(s => !s.is_selected && !s.is_dropped);

    const selRows = selected.map(s => \`
      <div class="selected-item">
        <span style="flex:1;">\${s.name} \${s.is_reserve ? '<span class="badge badge-reserve">R</span>' : ''}</span>
        <span class="text-sm text-muted">\${s.rating_at_selection.toFixed(1)}</span>
      </div>
    \`).join('');

    let droppedHtml = '';
    if (dropped.length > 0) {
      droppedHtml = dropped.map(d => \`
        <div class="dropped-banner">Dropped: \${d.name} (rating: \${d.rating_at_selection.toFixed(1)})</div>
      \`).join('');
    }

    let notSelHtml = '';
    if (notSelected.length > 0) {
      notSelHtml = '<div class="text-sm text-muted mt-8">Not selected:</div>' +
        notSelected.map(s => \`<div class="text-sm" style="padding:4px 0;">\${s.name} (\${s.rating_at_selection.toFixed(1)})</div>\`).join('');
    }

    selectionHtml = \`
      <div class="card">
        <div class="flex-between mb-8">
          <h3>Selection (\${selected.length})</h3>
          <button class="copy-btn" onclick="copySelection(\${fixtureId})">Copy</button>
        </div>
        \${droppedHtml}
        <div class="selected-list">\${selRows}</div>
        \${notSelHtml}
      </div>
    \`;
  }

  // Results panel
  let resultsHtml = '';
  if (hasResults) {
    const resRows = fixture.results.map(r => {
      const won = r.player_score > r.opponent_score;
      return \`
        <div class="score-row">
          <span class="name">\${r.name}</span>
          <span class="\${won ? 'win' : 'loss'}">\${r.player_score}</span>
          <span class="vs">-</span>
          <span class="\${won ? 'loss' : 'win'}">\${r.opponent_score}</span>
        </div>
      \`;
    }).join('');
    const totalFor = fixture.results.reduce((s, r) => s + r.player_score, 0);
    const totalAgainst = fixture.results.reduce((s, r) => s + r.opponent_score, 0);
    resultsHtml = \`
      <div class="card">
        <h3>Results</h3>
        \${resRows}
        <div style="margin-top:8px;font-weight:600;text-align:center;">
          Total: \${totalFor} &ndash; \${totalAgainst}
        </div>
      </div>
    \`;
  }

  // Score entry
  let scoreEntryHtml = '';
  if (hasSelection && !hasResults && fixture.status === 'upcoming') {
    const selected = fixture.selections.filter(s => s.is_selected);
    const entryRows = selected.map(s => \`
      <div class="score-row">
        <span class="name">\${s.name}</span>
        <input type="number" min="0" max="\${config.max_score}" data-result-player="\${s.player_id}" data-field="player_score" placeholder="0">
        <span class="vs">-</span>
        <input type="number" min="0" max="\${config.max_score}" data-result-player="\${s.player_id}" data-field="opponent_score" placeholder="0">
      </div>
    \`).join('');
    scoreEntryHtml = \`
      <div class="card">
        <h3>Enter Scores</h3>
        \${entryRows}
        <button class="btn-success mt-12" onclick="submitResults(\${fixtureId})">Save Results</button>
      </div>
    \`;
  }

  render(\`
    <a class="back" onclick="navigate('/fixtures')">&larr; Fixtures</a>
    <div class="card">
      <div class="flex-between mb-8">
        <div>
          <div style="font-size:1.1rem;font-weight:600;">vs \${fixture.opponent}</div>
          <div class="text-sm text-muted">\${fmtDate(fixture.match_date)} &middot; Week \${fixture.week_number}</div>
        </div>
        <div style="display:flex;gap:4px;">
          <span class="badge badge-\${fixture.venue.toLowerCase()}">\${fixture.venue}</span>
          <span class="badge badge-\${fixture.status}">\${fixture.status}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex-between mb-8">
        <h3>Availability</h3>
        <button class="btn-sm btn-primary" onclick="saveAvailability(\${fixtureId})">Save</button>
      </div>
      \${availRows}
    </div>

    \${!hasSelection && fixture.status === 'upcoming' ? \`
      <button class="btn-primary mb-12" onclick="doRunSelection(\${fixtureId})">Run Selection</button>
    \` : ''}
    \${hasSelection && fixture.status === 'upcoming' ? \`
      <button class="btn-outline btn-sm mb-12" style="width:100%;" onclick="doRunSelection(\${fixtureId})">Re-run Selection</button>
    \` : ''}

    \${selectionHtml}
    \${scoreEntryHtml}
    \${resultsHtml}
  \`);
}

async function viewRatings() {
  if (!state.seasonId) { navigate('/'); return; }
  const ratings = await api('/ratings?season_id=' + state.seasonId);

  const fixtures = await api('/fixtures?season_id=' + state.seasonId);
  const upcoming = fixtures.filter(f => f.status === 'upcoming');
  let droppedIds = new Set();
  if (upcoming.length > 0) {
    try {
      const sel = await api('/fixtures/' + upcoming[0].id + '/selection');
      for (const s of sel) {
        if (s.is_dropped) droppedIds.add(s.player_id);
      }
    } catch (e) {}
  }

  const rows = ratings.map((r, i) => \`
    <tr onclick="navigate('/player/\${r.player_id}')" style="cursor:pointer;">
      <td>\${i + 1}</td>
      <td>
        \${r.name}
        \${r.is_reserve ? '<span class="badge badge-reserve">R</span>' : ''}
        \${droppedIds.has(r.player_id) ? '<span class="badge badge-dropped">dropped</span>' : ''}
      </td>
      <td style="font-weight:600;">\${r.rating.toFixed(1)}</td>
      <td class="text-sm text-muted">\${r.recent_scores.join(', ') || '-'}</td>
      <td class="text-sm text-muted">\${r.games_played}</td>
    </tr>
  \`).join('');

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <div class="flex-between mb-12">
      <h1>Ratings</h1>
      <button class="copy-btn" onclick="copyRatings()">Copy</button>
    </div>
    <div class="card" style="overflow-x:auto;">
      <table>
        <thead><tr><th>#</th><th>Player</th><th>Avg</th><th>Recent</th><th>P</th></tr></thead>
        <tbody>\${rows}</tbody>
      </table>
    </div>
  \`);
}

async function viewPlayer(playerId) {
  if (!state.seasonId) { navigate('/'); return; }
  const [players, history, ratings] = await Promise.all([
    api('/players?team_id=' + state.teamId),
    api('/players/' + playerId + '/history?season_id=' + state.seasonId),
    api('/ratings?season_id=' + state.seasonId),
  ]);

  const player = players.find(p => p.id === playerId);
  const rating = ratings.find(r => r.player_id === playerId);

  const rows = history.map(h => {
    const won = h.player_score > h.opponent_score;
    const margin = Math.abs(h.player_score - h.opponent_score);
    return \`
      <tr>
        <td class="text-sm">\${fmtDateShort(h.match_date)}</td>
        <td class="text-sm">\${h.opponent}</td>
        <td class="text-sm">\${h.venue}</td>
        <td class="\${won ? 'win' : 'loss'}">\${h.player_score}-\${h.opponent_score}</td>
        <td class="\${won ? 'win' : 'loss'}">\${won ? '+' : '-'}\${margin}</td>
      </tr>
    \`;
  }).join('');

  render(\`
    <a class="back" onclick="navigate('/ratings')">&larr; Ratings</a>
    <div class="card">
      <h2>\${player ? player.name : 'Player'}</h2>
      \${rating ? \`
        <div class="mt-8">
          <span style="font-size:1.3rem;font-weight:700;">\${rating.rating.toFixed(1)}</span>
          <span class="text-sm text-muted"> avg</span>
          <span class="text-sm text-muted" style="margin-left:12px;">\${rating.games_played} games</span>
        </div>
        \${rating.recent_scores.length ? \`<div class="text-sm text-muted mt-8">Recent: \${rating.recent_scores.join(', ')}</div>\` : ''}
      \` : ''}
    </div>
    <div class="card" style="overflow-x:auto;">
      <h3>Match History</h3>
      \${history.length ? \`
        <table>
          <thead><tr><th>Date</th><th>vs</th><th>V</th><th>Score</th><th>+/-</th></tr></thead>
          <tbody>\${rows}</tbody>
        </table>
      \` : '<div class="empty">No matches played yet</div>'}
    </div>
  \`);
}

async function viewSquad() {
  if (!state.teamId) { navigate('/'); return; }
  const players = await api('/players?team_id=' + state.teamId);
  const regulars = players.filter(p => !p.is_reserve);
  const reserves = players.filter(p => p.is_reserve);

  const makeRow = (p) => \`
    <div class="player-row">
      <span>\${p.name}</span>
      <div style="display:flex;gap:4px;">
        <button class="btn-sm btn-outline" onclick="toggleReserve(\${p.id}, \${p.is_reserve ? 0 : 1})">\${p.is_reserve ? 'Make Core' : 'Make Res'}</button>
        <button class="btn-sm btn-danger" onclick="deactivatePlayer(\${p.id})">Remove</button>
      </div>
    </div>
  \`;

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <h1>Squad</h1>

    <div class="card">
      <h3>Add Player</h3>
      <div class="row">
        <input type="text" id="new-player-name" placeholder="Player name" style="margin-bottom:0;">
        <select id="new-player-role" style="width:90px;margin-bottom:0;">
          <option value="core">Core</option>
          <option value="reserve">Reserve</option>
        </select>
        <button class="btn-sm btn-primary" style="flex:none;" onclick="addPlayer()">Add</button>
      </div>
    </div>

    <div class="card">
      <h3>Core (\${regulars.length})</h3>
      \${regulars.map(makeRow).join('') || '<div class="empty">None</div>'}
    </div>

    <div class="card">
      <h3>Reserves (\${reserves.length})</h3>
      \${reserves.map(makeRow).join('') || '<div class="empty">None</div>'}
    </div>
  \`);
}

async function viewSeason() {
  await loadState();

  const seasonRows = state.seasons.map(s => \`
    <div class="player-row">
      <div>
        <span style="font-weight:500;">\${s.year}</span>
        <span class="text-sm text-muted"> &middot; \${s.division}</span>
        \${s.is_current ? '<span class="badge badge-selected" style="margin-left:6px;">current</span>' : ''}
      </div>
      <div style="display:flex;gap:4px;">
        <button class="btn-sm btn-outline" onclick="navigate('/season/\${s.id}/settings')">Settings</button>
        \${!s.is_current ? \`<button class="btn-sm btn-primary" onclick="setCurrentSeason(\${s.id})">Set Active</button>\` : ''}
      </div>
    </div>
  \`).join('');

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <h1>Season Management</h1>

    \${state.seasons.length ? \`
      <div class="card">
        <h3>Seasons</h3>
        \${seasonRows}
      </div>
    \` : ''}

    \${state.seasonId ? \`
      <div class="card">
        <h3>Sync Fixtures</h3>
        <p class="text-sm text-muted mb-8">Re-import fixtures from the league website.</p>
        <button class="btn-primary" onclick="syncFixtures()">Sync Fixtures</button>
        <div id="sync-result" class="mt-8"></div>
      </div>
    \` : ''}

    <div class="card">
      <button class="btn-outline" style="width:100%;" onclick="navigate('/setup')">New Season Setup</button>
    </div>
  \`);
}

async function viewSettings(seasonId) {
  const config = await api('/seasons/' + seasonId + '/config');
  const season = state.seasons.find(s => s.id === seasonId);

  const field = (label, key, type = 'number') => \`
    <div class="config-row">
      <label>\${label}</label>
      <input type="\${type}" id="cfg-\${key}" value="\${config[key]}" \${type === 'number' ? 'min="0"' : ''}>
    </div>
  \`;

  const toggle = (label, key) => \`
    <div class="config-row">
      <label>\${label}</label>
      <label class="toggle">
        <input type="checkbox" id="cfg-\${key}" \${config[key] ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
  \`;

  render(\`
    <a class="back" onclick="navigate('/season')">&larr; Seasons</a>
    <h1>Settings \${season ? '(' + season.year + ')' : ''}</h1>

    <div class="card">
      <h3>Squad & Selection</h3>
      \${field('Squad size', 'squad_size')}
      \${field('Reserves', 'reserve_count')}
      \${field('Players per match', 'pick_count')}
      \${field('Max score', 'max_score')}
    </div>

    <div class="card">
      <h3>Rating System</h3>
      \${field('Rolling window (games)', 'rating_window')}
      \${field('Default rating', 'default_rating')}
    </div>

    <div class="card">
      <h3>Drop Rule</h3>
      \${toggle('Enable drop rule', 'drop_enabled')}
      \${field('Players to drop', 'drop_count')}
      \${field('Drop duration (weeks)', 'drop_duration')}
      \${toggle('Carry over if unavailable', 'drop_carry_over')}
    </div>

    <button class="btn-success" onclick="saveConfig(\${seasonId})">Save Settings</button>
  \`);
}

// --- Actions ---

async function saveAvailability(fixtureId) {
  const toggles = document.querySelectorAll('[data-player-id]');
  const players = [];
  toggles.forEach(t => {
    players.push({ player_id: parseInt(t.dataset.playerId), is_available: t.checked ? 1 : 0 });
  });
  await api('/fixtures/' + fixtureId + '/availability', { method: 'PUT', body: { players } });
  viewFixture(fixtureId);
}

async function doRunSelection(fixtureId) {
  const toggles = document.querySelectorAll('[data-player-id]');
  if (toggles.length > 0) {
    const players = [];
    toggles.forEach(t => {
      players.push({ player_id: parseInt(t.dataset.playerId), is_available: t.checked ? 1 : 0 });
    });
    await api('/fixtures/' + fixtureId + '/availability', { method: 'PUT', body: { players } });
  }
  await api('/fixtures/' + fixtureId + '/select', { method: 'POST' });
  viewFixture(fixtureId);
}

async function submitResults(fixtureId) {
  const inputs = document.querySelectorAll('[data-result-player]');
  const byPlayer = {};
  inputs.forEach(inp => {
    const pid = inp.dataset.resultPlayer;
    if (!byPlayer[pid]) byPlayer[pid] = {};
    byPlayer[pid][inp.dataset.field] = parseInt(inp.value) || 0;
  });
  const results = Object.entries(byPlayer).map(([pid, scores]) => ({
    player_id: parseInt(pid),
    player_score: scores.player_score || 0,
    opponent_score: scores.opponent_score || 0,
  }));
  await api('/fixtures/' + fixtureId + '/results', { method: 'POST', body: { results } });
  viewFixture(fixtureId);
}

async function addPlayer() {
  const name = document.getElementById('new-player-name').value.trim();
  if (!name) return;
  const role = document.getElementById('new-player-role').value;
  await api('/players', { method: 'POST', body: { team_id: state.teamId, name, is_reserve: role === 'reserve' } });
  viewSquad();
}

async function toggleReserve(playerId, isReserve) {
  await api('/players/' + playerId, { method: 'PUT', body: { is_reserve: isReserve } });
  viewSquad();
}

async function deactivatePlayer(playerId) {
  if (!confirm('Remove this player from the squad?')) return;
  await api('/players/' + playerId, { method: 'DELETE' });
  viewSquad();
}

async function setCurrentSeason(seasonId) {
  await api('/seasons/' + seasonId + '/set-current', { method: 'POST' });
  await loadState();
  navigate('/');
}

async function syncFixtures() {
  const el = document.getElementById('sync-result');
  el.textContent = 'Syncing...';
  try {
    const result = await api('/seasons/' + state.seasonId + '/import-fixtures', { method: 'POST' });
    el.innerHTML = '<span class="win">Done! ' + result.imported + ' new, ' + result.updated + ' updated (' + result.total + ' total)</span>';
  } catch (e) {
    el.innerHTML = '<span class="loss">Error: ' + e.message + '</span>';
  }
}

async function saveConfig(seasonId) {
  const fields = ['squad_size', 'reserve_count', 'pick_count', 'max_score', 'rating_window', 'default_rating', 'drop_count', 'drop_duration'];
  const toggles = ['drop_enabled', 'drop_carry_over'];
  const body = {};
  for (const f of fields) {
    const el = document.getElementById('cfg-' + f);
    if (el) body[f] = parseFloat(el.value);
  }
  for (const f of toggles) {
    const el = document.getElementById('cfg-' + f);
    if (el) body[f] = el.checked ? 1 : 0;
  }
  await api('/seasons/' + seasonId + '/config', { method: 'PUT', body });
  alert('Settings saved');
}

// --- Copy to clipboard ---

async function copySelection(fixtureId) {
  const fixture = await api('/fixtures/' + fixtureId);
  const team = state.teams.find(t => t.id === state.teamId);
  const teamName = team ? team.name.toUpperCase() : 'TEAM';

  const sel = fixture.selections.filter(s => s.is_selected)
    .sort((a, b) => (b.rating_at_selection || 0) - (a.rating_at_selection || 0));
  const dropped = fixture.selections.filter(s => s.is_dropped);
  const notSel = fixture.selections.filter(s => !s.is_selected && !s.is_dropped);

  let text = teamName + ' vs ' + fixture.opponent + ' (' + fixture.venue + ')\\n';
  text += fmtDate(fixture.match_date) + '\\n\\n';
  text += 'SELECTED (' + sel.length + '):\\n';
  sel.forEach((s, i) => {
    text += (i + 1) + '. ' + s.name.padEnd(18) + ' - ' + (s.rating_at_selection || 0).toFixed(1) + '\\n';
  });
  if (dropped.length) {
    text += '\\nDROPPED: ' + dropped.map(d => d.name).join(', ') + '\\n';
  }
  if (notSel.length) {
    text += '\\nNOT SELECTED:\\n';
    notSel.forEach(s => {
      text += '- ' + s.name + ' (' + (s.rating_at_selection || 0).toFixed(1) + ')\\n';
    });
  }

  await navigator.clipboard.writeText(text);
  const btn = document.querySelector('.copy-btn');
  if (btn) { btn.textContent = 'Copied!'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000); }
}

async function copyRatings() {
  const ratings = await api('/ratings?season_id=' + state.seasonId);
  let text = 'RATINGS\\n\\n';
  text += '#  Player            Avg   Recent\\n';
  ratings.forEach((r, i) => {
    const num = String(i + 1).padStart(2);
    const name = r.name.padEnd(18);
    const avg = r.rating.toFixed(1).padStart(5);
    const recent = r.recent_scores.join(', ') || '-';
    text += num + ' ' + name + avg + '  ' + recent + '\\n';
  });

  await navigator.clipboard.writeText(text);
  const btn = document.querySelector('.copy-btn');
  if (btn) { btn.textContent = 'Copied!'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000); }
}

// --- Helpers ---

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

  </script>
</body>
</html>`;
}
