export function renderHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BowlSteam</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 1100px; margin: 0 auto; padding: 12px; background: #f0f2f5; color: #1a1a1a; }
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
    .role-picker button.active-skip { background: #9ca3af; color: white; border-color: #9ca3af; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a1a1a; color: white; padding: 10px 20px; border-radius: 8px; font-size: 0.9rem; z-index: 999; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .toast.show { opacity: 1; }
    .toast.error { background: #dc2626; }
    .badge-ready { background: #dbeafe; color: #2563eb; }
    .method-card { border: 2px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 8px; cursor: pointer; }
    .method-card.selected { border-color: #2563eb; background: #eff6ff; }
    .method-card h3 { margin-bottom: 4px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>

// --- State ---
let state = { pin: null, role: null, clubId: null, clubName: null, teamId: null, seasonId: null, teams: [], seasons: [] };

function isCaptain() { return state.role === 'captain'; }

// Setup wizard state
let setup = { step: 1, teamId: null, leagueName: '', teamName: '', url: '', scraped: null, players: [], method: 'form_based' };

// --- API helpers ---
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.pin) headers['X-Club-Pin'] = state.pin;
  const res = await fetch('/api' + path, {
    headers,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth') { logout(); return; }
    const msg = data.error || 'Request failed';
    if (typeof showToast === 'function') showToast(msg, true);
    throw new Error(msg);
  }
  return data;
}

const $app = document.getElementById('app');
function render(html) { $app.innerHTML = html; }

// --- Toast notifications ---
function showToast(msg, isError) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 2500);
}

// --- Clipboard helper with fallback ---
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('Copied to clipboard');
    return true;
  } catch (e) {
    showToast('Copy failed', true);
    return false;
  }
}

// --- Router ---
function navigate(hash) { location.hash = hash; }

window.addEventListener('hashchange', route);
window.addEventListener('load', async () => {
  // Check for saved PIN
  const savedPin = localStorage.getItem('bowlsteam_pin');
  if (savedPin) {
    try {
      const auth = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: savedPin }),
      }).then(r => r.json());
      if (auth.id) {
        state.pin = savedPin;
        state.role = auth.role || 'captain';
        state.clubId = auth.id;
        state.clubName = auth.name;
        if (auth.needsName && isCaptain()) { viewSetClubName(); return; }
        await loadState();
        route();
        return;
      }
    } catch (e) {}
    localStorage.removeItem('bowlsteam_pin');
  }
  viewLogin();
});

function logout() {
  localStorage.removeItem('bowlsteam_pin');
  state = { pin: null, clubId: null, clubName: null, teamId: null, seasonId: null, teams: [], seasons: [] };
  viewLogin();
}

async function loadState() {
  state.teams = await api('/teams');
  if (state.teams.length > 0) {
    state.teamId = state.teams[0].id;
    state.seasons = await api('/seasons?team_id=' + state.teamId);
    const current = state.seasons.find(s => s.is_current);
    if (current) state.seasonId = current.id;
  }
}

// --- Login Screen ---
function viewLogin() {
  render(\`
    <div class="topbar"><h1>BowlSteam</h1></div>
    <div class="card" style="text-align:center;">
      <p style="font-size:1.1rem;font-weight:500;margin-bottom:6px;">Automated team selection for bowls</p>
      <p class="text-sm text-muted mb-12">Enter your club PIN to get started.</p>
      <input type="text" id="pin-input" placeholder="Enter PIN" maxlength="10" style="text-align:center;font-size:1.3rem;letter-spacing:4px;">
      <button class="btn-primary mt-8" onclick="doLogin()">Enter</button>
      <div class="mt-12"><a class="text-sm" onclick="viewAddTeam()" style="cursor:pointer;">Add a new league / team</a></div>
    </div>
  \`);
  document.getElementById('pin-input').focus();
  document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

function viewAddTeam() {
  render(\`
    <div class="topbar"><h1>BowlSteam</h1></div>
    <div class="card">
      <a class="back" onclick="viewLogin()">&larr; Back</a>
      <h2>Add a new league / team</h2>
      <p class="text-sm text-muted mb-12">Creates a separate, independent team with its
        own captain and player PINs. Requires the admin key.</p>
      <label class="text-sm">Admin key</label>
      <input type="password" id="nt-admin" placeholder="Admin key">
      <label class="text-sm">Club / team display name</label>
      <input type="text" id="nt-name" placeholder="e.g. Westlands 2">
      <label class="text-sm">League name</label>
      <input type="text" id="nt-league" placeholder="e.g. Newcastle Mid-week">
      <label class="text-sm">cgleague team URL (optional)</label>
      <input type="text" id="nt-url" placeholder="https://www.cgleague.co.uk/team.php?L=...&T=...">
      <label class="text-sm">Captain PIN</label>
      <input type="text" id="nt-cap" maxlength="10" placeholder="Captain PIN">
      <label class="text-sm">Player PIN (read-only access)</label>
      <input type="text" id="nt-player" maxlength="10" placeholder="Player PIN">
      <button class="btn-success mt-12" onclick="doAddTeam()">Create team</button>
    </div>
  \`);
}

async function doAddTeam() {
  const v = id => document.getElementById(id).value.trim();
  const adminKey = v('nt-admin');
  const payload = {
    name: v('nt-name'),
    team_name: v('nt-name'),
    league_name: v('nt-league'),
    website_url: v('nt-url') || null,
    captain_pin: v('nt-cap'),
    player_pin: v('nt-player'),
  };
  if (!adminKey) { showToast('Admin key required', true); return; }
  if (!payload.team_name || !payload.league_name || !payload.captain_pin) {
    showToast('Name, league and captain PIN are required', true);
    return;
  }
  try {
    const res = await fetch('/api/admin/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminKey },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) { showToast(d.error || 'Failed to create team', true); return; }
    render(\`
      <div class="topbar"><h1>BowlSteam</h1></div>
      <div class="card">
        <h2>Team created</h2>
        <p class="text-sm mb-8"><strong>\${payload.team_name}</strong> is ready.</p>
        <p class="text-sm">Captain PIN: <strong>\${d.captain_pin}</strong></p>
        <p class="text-sm mb-12">Player PIN: <strong>\${d.player_pin || '(none)'}</strong></p>
        <p class="text-sm text-muted mb-12">Log in with the captain PIN to run setup and selection.</p>
        <button class="btn-primary" onclick="viewLogin()">Go to login</button>
      </div>
    \`);
  } catch (e) {
    showToast('Failed to create team', true);
  }
}

async function doLogin() {
  const pin = document.getElementById('pin-input').value.trim();
  if (!pin) return;
  try {
    const auth = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }).then(r => r.json());
    if (auth.error) { showToast(auth.error, true); return; }
    state.pin = pin;
    state.role = auth.role || 'captain';
    state.clubId = auth.id;
    state.clubName = auth.name;
    localStorage.setItem('bowlsteam_pin', pin);
    if (auth.needsName && isCaptain()) { viewSetClubName(); return; }
    await loadState();
    route();
  } catch (e) {
    showToast('Invalid PIN', true);
  }
}

function viewSetClubName() {
  render(\`
    <div class="topbar"><h1>BowlSteam</h1></div>
    <div class="card">
      <h2>Welcome! Name your club</h2>
      <p class="text-sm text-muted mb-8">This is the first time this PIN has been used. Enter your club or bowling green name.</p>
      <input type="text" id="club-name-input" placeholder="e.g. Westlands Bowling Club">
      <button class="btn-success mt-8" onclick="doSetClubName()">Continue</button>
    </div>
  \`);
  document.getElementById('club-name-input').focus();
}

async function doSetClubName() {
  const name = document.getElementById('club-name-input').value.trim();
  if (!name) return;
  try {
    await fetch('/api/auth/set-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: state.pin, name }),
    });
    state.clubName = name;
    await loadState();
    navigate('/');
    route();
  } catch (e) {
    showToast('Failed to set name', true);
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
  if (hash === '/rules') return viewRules();
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
  // Reuse the club's existing team (e.g. one created by "Add a new league /
  // team") instead of inserting a duplicate row. Only on fresh entry; once
  // teamId is set the wizard's update path is used. Clubs with no team yet
  // keep the original create-on-setup behaviour.
  if (setup.step === 1 && setup.teamId === null && state.teams && state.teams.length > 0) {
    const t = state.teams[0];
    setup.teamId = t.id;
    setup.teamName = t.name || '';
    setup.leagueName = t.league_name || '';
    setup.url = t.website_url || '';
  }

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
      // Initialize player roles — all default to 'core'
      setup.players = setup.scraped.players.map(p => ({ name: p.name, role: 'core' }));
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
    <div class="player-row" data-player-idx="\${i}">
      <span style="flex:1;">\${p.name}</span>
      <div class="role-picker">
        <button data-role="core" class="\${p.role === 'core' ? 'active-core' : ''}" onclick="setRole(\${i},'core')">Core</button>
        <button data-role="reserve" class="\${p.role === 'reserve' ? 'active-reserve' : ''}" onclick="setRole(\${i},'reserve')">Res</button>
        <button data-role="skip" class="\${p.role === 'skip' ? 'active-skip' : ''}" onclick="setRole(\${i},'skip')">Skip</button>
      </div>
    </div>
  \`).join('');

  return \`
    <div class="card">
      <h2>Build your squad</h2>
      <p class="text-sm text-muted mb-8">For each player, choose: <strong>Core</strong> (regular squad), <strong>Res</strong> (reserve), or <strong>Skip</strong> (not in your team).</p>
      <div class="text-sm mb-8" id="role-counts">
        Core: <strong>\${counts.core}</strong> &middot;
        Reserve: <strong>\${counts.reserve}</strong> &middot;
        Skipped: <strong>\${counts.skip}</strong>
      </div>
      <div class="row mb-8">
        <button class="btn-sm btn-outline" onclick="setAllRoles('core')">All Core</button>
        <button class="btn-sm btn-outline" onclick="setAllRoles('skip')">All Skip</button>
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
  // Update counts without full re-render to preserve scroll position
  const counts = { core: 0, reserve: 0, skip: 0 };
  setup.players.forEach(p => counts[p.role]++);
  const countsEl = document.getElementById('role-counts');
  if (countsEl) countsEl.innerHTML = 'Core: <strong>' + counts.core + '</strong> &middot; Reserve: <strong>' + counts.reserve + '</strong> &middot; Skipped: <strong>' + counts.skip + '</strong>';
  // Update just the buttons for this row
  const row = document.querySelector('[data-player-idx="' + idx + '"]');
  if (row) {
    row.querySelectorAll('.role-picker button').forEach(btn => {
      const r = btn.dataset.role;
      btn.className = r === role ? 'active-' + role : '';
    });
  }
}

function setAllRoles(role) {
  setup.players.forEach((p, i) => { p.role = role; });
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
        <p class="text-sm text-muted">Top 8 by rolling average of last 4 scores. Worst loser each week sits out the next match. Configurable parameters.</p>
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
      <div class="card" style="text-align:center;">
        <p style="font-size:1.1rem;font-weight:500;margin-bottom:6px;">Automated team selection for bowls</p>
        <p class="text-sm text-muted" style="margin-bottom:14px;">Import your fixtures, manage your squad, and let form-based ratings pick the best team each week.</p>
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
        <div class="text-sm text-muted">\${state.clubName ? state.clubName + ' &middot; ' : ''}\${season ? season.division + ' &middot; ' + season.year : ''}\${isCaptain() ? '' : ' &middot; <span style="color:#7c3aed;">view-only</span>'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        \${isCaptain() ? '<a onclick="navigate(\\'/season\\')" class="text-sm">Manage</a>' : ''}
        <a onclick="logout()" class="text-sm" style="color:#999;">Logout</a>
      </div>
    </div>

    <div class="card">
      <div class="flex-between">
        <div class="text-sm text-muted">\${completed.length} of \${fixtures.length} matches played</div>
      </div>
      <div style="margin-top:6px;background:#e5e7eb;border-radius:4px;height:6px;overflow:hidden;">
        <div style="background:#2563eb;border-radius:4px;height:6px;width:\${fixtures.length ? (completed.length/fixtures.length*100) : 0}%;\${completed.length === 0 ? 'display:none;' : ''}"></div>
      </div>
    </div>

    \${nextHtml}
    \${resultHtml}

    <div class="nav">
      <a onclick="navigate('/fixtures')">Fixtures</a>
      <a onclick="navigate('/ratings')">Ratings</a>
      <a onclick="navigate('/squad')">Squad</a>
      <a onclick="navigate('/rules')">Rules</a>
    </div>
  \`);
}

async function viewFixtures() {
  if (!state.seasonId) { navigate('/'); return; }
  const fixtures = await api('/fixtures?season_id=' + state.seasonId);

  // Check which upcoming fixtures have selections
  const selSets = {};
  for (const f of fixtures) {
    if (f.status === 'upcoming') {
      try {
        const sel = await api('/fixtures/' + f.id + '/selection');
        if (sel.length > 0) selSets[f.id] = true;
      } catch (e) {}
    }
  }

  const rows = fixtures.map(f => {
    const hasSel = selSets[f.id];
    let resultLine = '';
    if (f.status === 'completed' && (f.wins > 0 || f.losses > 0)) {
      const won = f.wins > f.losses;
      const drew = f.wins === f.losses;
      const resultLabel = drew ? 'Drew' : (won ? 'Won' : 'Lost');
      const resultClass = drew ? '' : (won ? 'win' : 'loss');
      resultLine = \`
        <div class="text-sm" style="margin-top:4px;">
          <span class="\${resultClass}" style="font-weight:600;">\${resultLabel} \${f.wins}-\${f.losses}</span>
          <span class="text-muted"> &middot; \${f.points_for}–\${f.points_against}</span>
        </div>
      \`;
    }
    return \`
    <div class="card fixture-card" onclick="navigate('/fixture/\${f.id}')">
      <div class="flex-between">
        <div style="flex:1;">
          <div style="font-weight:500;">vs \${f.opponent}</div>
          <div class="text-sm text-muted">\${fmtDate(f.match_date)} &middot; Week \${f.week_number}</div>
          \${resultLine}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <span class="badge badge-\${f.venue.toLowerCase()}">\${f.venue}</span>
          \${f.status === 'upcoming' && hasSel ? '<span class="badge badge-ready">selected</span>' : ''}
          <span class="badge badge-\${f.status}">\${f.status}</span>
        </div>
      </div>
    </div>
  \`;}).join('');

  // Season summary: matches won/lost (a match = our wins > opp wins), and games W-L total
  const completed = fixtures.filter(f => f.status === 'completed');
  let matchesW = 0, matchesL = 0, matchesD = 0;
  let gamesW = 0, gamesL = 0, ptsF = 0, ptsA = 0;
  for (const f of completed) {
    gamesW += f.wins;
    gamesL += f.losses;
    ptsF += f.points_for;
    ptsA += f.points_against;
    if (f.wins > f.losses) matchesW++;
    else if (f.wins < f.losses) matchesL++;
    else if (f.wins + f.losses > 0) matchesD++;
  }

  let summaryHtml = '';
  if (completed.length > 0) {
    summaryHtml = \`
      <div class="card">
        <div class="text-sm">
          <strong>\${completed.length}</strong> of \${fixtures.length} matches played
        </div>
        <div class="text-sm" style="margin-top:4px;">
          Matches: <span class="win">\${matchesW}W</span> – <span class="loss">\${matchesL}L</span>\${matchesD > 0 ? ' – ' + matchesD + 'D' : ''}
        </div>
        <div class="text-sm">
          Games: <span class="win">\${gamesW}W</span> – <span class="loss">\${gamesL}L</span>
          <span class="text-muted">&middot; Pts \${ptsF}–\${ptsA} (\${ptsF - ptsA >= 0 ? '+' : ''}\${ptsF - ptsA})</span>
        </div>
      </div>
    \`;
  }

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <h1>Fixtures</h1>
    \${summaryHtml}
    \${rows || '<div class="card empty">No fixtures yet.</div>'}
  \`);
}

async function viewFixture(fixtureId) {
  const fixture = await api('/fixtures/' + fixtureId);
  const config = await api('/seasons/' + fixture.season_id + '/config');
  const players = await api('/players?team_id=' + fixture.team_id);
  const ratings = await api('/ratings?season_id=' + fixture.season_id);
  const ratingMap = {};
  for (const r of ratings) ratingMap[r.player_id] = r;

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
          \${playerLink(p.id, p.name)}
          \${p.is_reserve ? '<span class="badge badge-reserve" style="margin-left:6px;">R</span>' : ''}
        </div>
        <label class="toggle">
          <input type="checkbox" data-player-id="\${p.id}" \${checked ? 'checked' : ''} \${isCaptain() ? '' : 'disabled'}>
          <span class="slider"></span>
        </label>
      </div>
    \`;
  }).join('');

  // Selection panel
  let selectionHtml = '';
  if (hasSelection) {
    const selected = fixture.selections.filter(s => s.is_selected);
    const notSelected = fixture.selections.filter(s => !s.is_selected && !s.is_dropped);

    // Players not in any selection record = were unavailable when selection ran
    const inSelection = new Set(fixture.selections.map(s => s.player_id));
    const unavailable = players
      .filter(p => !inSelection.has(p.id))
      .map(p => ({
        player_id: p.id,
        name: p.name,
        is_reserve: p.is_reserve,
        rating: (ratingMap[p.id] || {}).rating,
      }))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const selRows = selected.map(s => \`
      <div class="selected-item">
        <span style="flex:1;">\${playerLink(s.player_id, s.name)} \${s.is_reserve ? '<span class="badge badge-reserve">R</span>' : ''}</span>
        <span class="text-sm text-muted">\${s.rating_at_selection.toFixed(1)}</span>
      </div>
    \`).join('');

    let notSelHtml = '';
    if (notSelected.length > 0) {
      notSelHtml = '<div class="text-sm text-muted mt-8">Not selected:</div>' +
        notSelected.map(s => \`<div class="text-sm" style="padding:4px 0;">\${playerLink(s.player_id, s.name)}\${s.is_reserve ? ' <span class="badge badge-reserve">R</span>' : ''} (\${s.rating_at_selection.toFixed(1)})</div>\`).join('');
    }

    let unavailHtml = '';
    if (unavailable.length > 0) {
      unavailHtml = '<div class="text-sm text-muted mt-8">Unavailable:</div>' +
        unavailable.map(u => \`<div class="text-sm" style="padding:4px 0;">\${playerLink(u.player_id, u.name)}\${u.is_reserve ? ' <span class="badge badge-reserve">R</span>' : ''} (\${u.rating != null ? u.rating.toFixed(1) : '-'})</div>\`).join('');
    }

    selectionHtml = \`
      <div class="card">
        <div class="flex-between mb-8">
          <h3>Selection (\${selected.length})</h3>
          <button class="copy-btn" onclick="copySelection(\${fixtureId})">Copy</button>
        </div>
        <div class="selected-list">\${selRows}</div>
        \${notSelHtml}
        \${unavailHtml}
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
          <span class="name">\${playerLink(r.player_id, r.name)}</span>
          <span class="\${won ? 'win' : 'loss'}">\${r.player_score}</span>
          <span class="vs">-</span>
          <span class="\${won ? 'loss' : 'win'}">\${r.opponent_score}</span>
        </div>
      \`;
    }).join('');
    const editRows = fixture.results.map(r => \`
      <div class="score-row">
        <span class="name">\${r.name}</span>
        <input type="number" min="0" max="\${config.max_score}" data-result-player="\${r.player_id}" data-field="player_score" value="\${r.player_score}">
        <span class="vs">-</span>
        <input type="number" min="0" max="\${config.max_score}" data-result-player="\${r.player_id}" data-field="opponent_score" value="\${r.opponent_score}">
      </div>
    \`).join('');
    const totalFor = fixture.results.reduce((s, r) => s + r.player_score, 0);
    const totalAgainst = fixture.results.reduce((s, r) => s + r.opponent_score, 0);
    resultsHtml = \`
      <div class="card">
        <div class="flex-between mb-8">
          <h3>Results</h3>
          \${isCaptain() ? \`<div style="display:flex;gap:4px;">
            <button class="btn-sm btn-outline" onclick="importMatchResults(\${fixtureId})">Re-import</button>
            <button class="btn-sm btn-outline" onclick="toggleEditResults(\${fixtureId})">Edit</button>
          </div>\` : ''}
        </div>
        <div id="results-view">
          \${resRows}
          <div style="margin-top:8px;font-weight:600;text-align:center;">
            Total: \${totalFor} &ndash; \${totalAgainst}
          </div>
        </div>
        <div id="results-edit" style="display:none;">
          \${editRows}
          <button class="btn-success mt-12" onclick="submitResults(\${fixtureId})">Save Results</button>
        </div>
      </div>
    \`;
  }

  // Score entry
  let scoreEntryHtml = '';
  if (isCaptain() && hasSelection && !hasResults && fixture.status === 'upcoming') {
    const selected = fixture.selections.filter(s => s.is_selected);
    const entryRows = selected.map(s => \`
      <div class="score-row" data-row-player="\${s.player_id}">
        <span class="name">\${s.name}</span>
        <input type="number" min="0" max="\${config.max_score}" data-result-player="\${s.player_id}" data-field="player_score" placeholder="0">
        <span class="vs">-</span>
        <input type="number" min="0" max="\${config.max_score}" data-result-player="\${s.player_id}" data-field="opponent_score" placeholder="0">
      </div>
    \`).join('');
    scoreEntryHtml = \`
      <div class="card">
        <div class="flex-between mb-8">
          <h3>Enter Scores</h3>
          <button class="btn-sm btn-outline" onclick="importMatchResults(\${fixtureId})">Import from URL</button>
        </div>
        <div id="score-entry-rows">\${entryRows}</div>
        <button class="btn-success mt-12" onclick="submitResults(\${fixtureId})">Save Results</button>
      </div>
    \`;
  }

  // Suggested order — captain-only decision-support (player_order.prd §6, §7.2).
  // Raw fetch (not api()) so a "data not loaded" 503 stays quiet, not a toast.
  let orderHtml = '';
  if (isCaptain() && hasSelection) {
    let rec = null, orderErr = null;
    try {
      const res = await fetch('/api/fixtures/' + fixtureId + '/order', {
        headers: { 'X-Club-Pin': state.pin },
      });
      const d = await res.json();
      if (res.ok) rec = d; else orderErr = d.error || 'Unavailable';
    } catch (e) { orderErr = 'Unavailable'; }
    orderHtml = orderCard(fixtureId, rec, orderErr);
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
      <details>
        <summary style="cursor:pointer;font-weight:600;font-size:1.1rem;display:flex;justify-content:space-between;align-items:center;">
          <span>Availability</span>
          <span class="text-sm text-muted" style="font-weight:400;">\${players.filter(p => (availMap[p.id] !== undefined ? availMap[p.id] : 1)).length}/\${players.length} available</span>
        </summary>
        <div class="mt-12">
          \${isCaptain() ? \`<div style="text-align:right;margin-bottom:8px;"><button class="btn-sm btn-primary" onclick="saveAvailability(\${fixtureId})">Save</button></div>\` : ''}
          \${availRows}
        </div>
      </details>
    </div>

    \${isCaptain() && !hasSelection && fixture.status === 'upcoming' ? \`
      <button class="btn-primary mb-12" onclick="doRunSelection(\${fixtureId})">Run Selection</button>
    \` : ''}
    \${isCaptain() && hasSelection && fixture.status === 'upcoming' ? \`
      <button class="btn-outline btn-sm mb-12" style="width:100%;" onclick="doRunSelection(\${fixtureId})">Re-run Selection</button>
    \` : ''}

    \${selectionHtml}
    \${orderHtml}
    \${scoreEntryHtml}
    \${resultsHtml}
  \`);
}

// Captain-only suggested-order card. Deliberately framed as a steer with
// visible uncertainty, never as a guaranteed optimiser (player_order.prd §7.2).
function orderCard(fixtureId, rec, err) {
  const wrap = inner => \`<div class="card" id="order-card">\${inner}</div>\`;
  if (err) return wrap(\`<h3>Suggested Order</h3><div class="text-sm text-muted mt-8">Unavailable — \${err}</div>\`);
  if (!rec || rec.error) return wrap(\`<h3>Suggested Order</h3><div class="text-sm text-muted mt-8">\${(rec && rec.error) || 'No recommendation'}</div>\`);

  const pct = Math.round((rec.predictability || 0) * 100);
  const conf = rec.low_confidence
    ? '<span class="badge badge-skip">low confidence</span>'
    : '<span class="badge badge-core">usable signal</span>';
  const rows = rec.order.map(o => \`
    <tr>
      <td style="font-weight:600;">\${o.board}</td>
      <td style="white-space:nowrap;">\${o.player}</td>
      <td style="text-align:right;">\${o.expected.toFixed(1)}</td>
      <td class="text-sm text-muted" style="white-space:nowrap;">\${o.assumed_opponent || '—'}</td>
    </tr>\`).join('');

  const totalLine = rec.anchored
    ? \`Your expected total: <strong>\${rec.expected_total}</strong> / \${rec.max_total} — shared across boards by relative strength
       <span class="text-muted">(range \${rec.total_low}–\${rec.total_high}; model's own guess was ~\${rec.model_total})</span>\`
    : \`Model estimate: <strong>\${rec.expected_total}</strong> / \${rec.max_total}
       <span class="text-muted">(range \${rec.total_low}–\${rec.total_high}; calibrated to \${rec.predict_season || 'all'} season)</span>\`;
  const inputVal = rec.anchored ? rec.expected_total : rec.model_total;

  return wrap(\`
      <div class="flex-between mb-8">
        <h3>Suggested Order \${conf}</h3>
        <button class="copy-btn" onclick="copyOrder(\${fixtureId})">Copy</button>
      </div>
      <div class="text-sm text-muted mb-8">
        A steer, not a guarantee — the model picks who plays where; you set the
        overall level you honestly expect (it knows the division, the data doesn't).
      </div>
      <div class="text-sm mb-8">
        \${totalLine}<br>
        Opponent order predictability: <strong>\${pct}%</strong>
        <span class="text-muted">(\${rec.opponent_matches} past matches)</span>
      </div>
      <div class="text-sm mb-8" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span>Your honest expected total:</span>
        <input id="order-total" type="number" min="0" max="\${rec.max_total}" step="1"
          value="\${Math.round(inputVal)}" style="width:80px;margin:0;">
        <span class="text-muted">/ \${rec.max_total}</span>
        <button class="btn-sm btn-primary" onclick="applyOrderTotal(\${fixtureId})">Apply</button>
        \${rec.anchored ? \`<button class="btn-sm btn-outline" onclick="applyOrderTotal(\${fixtureId}, true)">Use model</button>\` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr class="text-sm text-muted" style="text-align:left;">
          <th>#</th><th>Player</th><th style="text-align:right;">Exp</th><th>Likely opponent</th>
        </tr></thead>
        <tbody>\${rows}</tbody>
      </table>
      <div class="text-sm text-muted mt-8">
        vs simple strongest-first order: \${rec.gain_vs_naive >= 0 ? '+' : ''}\${rec.gain_vs_naive} chalks
        \${rec.low_confidence ? '— marginal; the opponent doesn\\'t keep a fixed order' : ''}
      </div>
      \${(rec.opponent_roster && rec.opponent_roster.length) ? \`
      <details class="mt-8">
        <summary style="cursor:pointer;font-weight:600;">Opponent squad — ranked (\${rec.opponent_roster.length})</summary>
        <div class="text-sm text-muted" style="margin:6px 0;">
          Strength = expected chalks vs an average player (same scale as our ratings).
          Name-only identity, so treat as a rough scouting guide.
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr class="text-sm text-muted" style="text-align:left;">
            <th>#</th><th>Player</th><th style="text-align:right;">Strength</th>
            <th style="text-align:right;">Games</th><th style="text-align:right;">Usual&nbsp;#</th>
          </tr></thead>
          <tbody>\${rec.opponent_roster.map((p, i) => \`
            <tr>
              <td>\${i + 1}</td>
              <td style="white-space:nowrap;">\${p.name}</td>
              <td style="text-align:right;font-weight:600;">\${p.strength.toFixed(1)}</td>
              <td style="text-align:right;" class="text-muted">\${p.games}</td>
              <td style="text-align:right;" class="text-muted">\${p.usual_board || '—'}</td>
            </tr>\`).join('')}</tbody>
        </table>
      </details>\` : ''}\`);
}

async function applyOrderTotal(fixtureId, useModel) {
  const el = document.getElementById('order-total');
  const val = useModel ? null : (el && parseFloat(el.value));
  const qs = (val && val > 0) ? '?total=' + encodeURIComponent(val) : '';
  let rec = null, e = null;
  try {
    const res = await fetch('/api/fixtures/' + fixtureId + '/order' + qs, {
      headers: { 'X-Club-Pin': state.pin },
    });
    const d = await res.json();
    if (res.ok) rec = d; else e = d.error || 'Unavailable';
  } catch (_) { e = 'Unavailable'; }
  const card = document.getElementById('order-card');
  if (card) card.outerHTML = orderCard(fixtureId, rec, e);
}

async function copyOrder(fixtureId) {
  let rec;
  try {
    const res = await fetch('/api/fixtures/' + fixtureId + '/order', {
      headers: { 'X-Club-Pin': state.pin },
    });
    rec = await res.json();
    if (!res.ok) { showToast(rec.error || 'Unavailable', true); return; }
  } catch (e) { showToast('Unavailable', true); return; }
  let text = 'Suggested order vs ' + rec.opponent + ' (' + rec.venue + ')\\n';
  text += 'Steer only — expected ~' + rec.expected_total + '/' + rec.max_total +
    ' (range ' + rec.total_low + '-' + rec.total_high + ')\\n\\n';
  rec.order.forEach(o => {
    text += o.board + '. ' + o.player.padEnd(18) + ' ~' + o.expected.toFixed(1) +
      (o.assumed_opponent ? '  (likely ' + o.assumed_opponent + ')' : '') + '\\n';
  });
  await copyText(text);
}

async function viewRatings() {
  if (!state.seasonId) { navigate('/'); return; }
  const [ratings, config] = await Promise.all([
    api('/ratings?season_id=' + state.seasonId),
    api('/seasons/' + state.seasonId + '/config'),
  ]);
  const w = (config && config.rating_window) || 4;

  const cores = ratings.filter(r => !r.is_reserve);
  const reserves = ratings.filter(r => r.is_reserve);

  const makeRow = (r, i) => {
    const record = r.games_played > 0
      ? '<span class="win">' + r.wins + '</span>-<span class="loss">' + r.losses + '</span>'
      : '-';
    const points = r.games_played > 0
      ? r.points_for + '–' + r.points_against
      : '-';
    return \`
    <tr onclick="navigate('/player/\${r.player_id}')" style="cursor:pointer;">
      <td>\${i + 1}</td>
      <td style="white-space:nowrap;">\${r.name}</td>
      <td style="font-weight:600;">\${r.rating.toFixed(1)}</td>
      <td class="text-sm" style="white-space:nowrap;">\${record}</td>
      <td class="text-sm text-muted" style="white-space:nowrap;">\${points}</td>
      \${recentScoreCells(r, w)}
      \${recentBonusCells(r, w)}
    </tr>
  \`;};

  const coreRows = cores.map(makeRow).join('');
  const reserveRows = reserves.map(makeRow).join('');

  // Team totals (cores + reserves combined)
  const totW = ratings.reduce((s, r) => s + (r.wins || 0), 0);
  const totL = ratings.reduce((s, r) => s + (r.losses || 0), 0);
  const totPF = ratings.reduce((s, r) => s + (r.points_for || 0), 0);
  const totPA = ratings.reduce((s, r) => s + (r.points_against || 0), 0);

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <div class="flex-between mb-12">
      <h1>Ratings</h1>
      <button class="copy-btn" onclick="copyRatings()">Copy</button>
    </div>
    \${totW + totL > 0 ? \`
      <div class="card">
        <h3>Team Totals</h3>
        <div class="text-sm">Games: <span class="win">\${totW}W</span> – <span class="loss">\${totL}L</span></div>
        <div class="text-sm">Points: \${totPF} – \${totPA} (diff \${totPF - totPA >= 0 ? '+' : ''}\${totPF - totPA})</div>
      </div>
    \` : ''}
    \${cores.length ? \`
      <div class="card" style="overflow-x:auto;">
        <h3>Core (\${cores.length})</h3>
        <table>
          <thead>
            <tr style="white-space:nowrap;">
              <th rowspan="2">#</th>
              <th rowspan="2">Player</th>
              <th rowspan="2">Avg+diff</th>
              <th rowspan="2">W-L</th>
              <th rowspan="2">Pts</th>
              <th colspan="\${w}" style="border-left:1px solid #ddd;text-align:center;">Last \${w} scores</th>
              <th colspan="\${w}" style="border-left:1px solid #ddd;text-align:center;">Last \${w} difficulty bonus</th>
            </tr>
            <tr style="white-space:nowrap;font-size:0.7rem;color:#888;text-align:center;">
              \${recentSubHeaders(w)}
              \${recentSubHeaders(w)}
            </tr>
          </thead>
          <tbody>\${coreRows}</tbody>
        </table>
      </div>
    \` : ''}
    \${reserves.length ? \`
      <div class="card" style="overflow-x:auto;">
        <h3>Reserves (\${reserves.length})</h3>
        <table>
          <thead>
            <tr style="white-space:nowrap;">
              <th rowspan="2">#</th>
              <th rowspan="2">Player</th>
              <th rowspan="2">Avg+diff</th>
              <th rowspan="2">W-L</th>
              <th rowspan="2">Pts</th>
              <th colspan="\${w}" style="border-left:1px solid #ddd;text-align:center;">Last \${w} scores</th>
              <th colspan="\${w}" style="border-left:1px solid #ddd;text-align:center;">Last \${w} difficulty bonus</th>
            </tr>
            <tr style="white-space:nowrap;font-size:0.7rem;color:#888;text-align:center;">
              \${recentSubHeaders(w)}
              \${recentSubHeaders(w)}
            </tr>
          </thead>
          <tbody>\${reserveRows}</tbody>
        </table>
      </div>
    \` : ''}
    <div class="card text-sm text-muted">
      <strong>Key:</strong>
      <div style="margin-top:4px;"><strong style="color:#7c3aed;">R</strong> = reserve week (available but not selected, counts as 20)</div>
      <div><strong style="color:#dc2626;">A</strong> = away (unavailable, counts as 19)</div>
      <div>W-L = wins-losses · Pts = points for–against</div>
      <div>Avg includes a difficulty bonus (opponent strength) — see <a onclick="navigate('/rules')" style="cursor:pointer;text-decoration:underline;">Selection Rules</a>.</div>
    </div>
  \`);
}

async function viewPlayer(playerId) {
  if (!state.seasonId) { navigate('/'); return; }
  const [players, timeline, ratings, config] = await Promise.all([
    api('/players?team_id=' + state.teamId),
    api('/players/' + playerId + '/timeline?season_id=' + state.seasonId),
    api('/ratings?season_id=' + state.seasonId),
    api('/seasons/' + state.seasonId + '/config'),
  ]);
  const w = (config && config.rating_window) || 4;

  const player = players.find(p => p.id === playerId);
  const rating = ratings.find(r => r.player_id === playerId);

  const rows = timeline.map(t => {
    let avail = '-';
    if (t.was_available === true) avail = '<span class="win">✓</span>';
    else if (t.was_available === false) avail = '<span class="loss">✗</span>';

    let status = '-';
    let statusClass = 'text-muted';
    if (t.entry_type === 'played') { status = 'Played'; statusClass = ''; }
    else if (t.entry_type === 'reserve') { status = '<strong style="color:#7c3aed;">R</strong>eserve'; statusClass = ''; }
    else if (t.entry_type === 'away') { status = '<strong style="color:#dc2626;">A</strong>way'; statusClass = ''; }
    // Show toggle button to flip R<->A for the captain when player didn't play
    if (isCaptain() && (t.entry_type === 'reserve' || t.entry_type === 'away')) {
      const target = t.entry_type === 'reserve' ? 'A' : 'R';
      const newAvail = t.entry_type === 'reserve' ? 0 : 1;
      status += ' <button class="btn-sm btn-outline" style="padding:2px 6px;font-size:0.7rem;margin-left:4px;" onclick="event.stopPropagation();toggleRA(' + t.fixture_id + ',' + playerId + ',' + newAvail + ')">→ ' + target + '</button>';
    }

    let resultHtml = '-';
    let resultClass = '';
    if (t.result) {
      const won = t.result.player_score > t.result.opp_score;
      resultClass = won ? 'win' : 'loss';
      resultHtml = t.result.player_score + '-' + t.result.opp_score;
      if (t.opponent_name) {
        resultHtml += '<div class="text-sm text-muted" style="font-weight:400;">vs ' + esc(t.opponent_name) + '</div>';
      }
    }

    const recent = t.recent_scores && t.recent_scores.length
      ? t.recent_scores.map(s => Number.isInteger(s) ? s : s.toFixed(0)).join(',')
      : '-';

    let bonusHtml = '-';
    if (t.entry_type === 'played') {
      if (t.difficulty_bonus === null || t.difficulty_bonus === undefined) {
        bonusHtml = '<span class="text-muted">—</span>';
      } else if (t.difficulty_bonus === 0) {
        bonusHtml = '<span class="text-muted">0</span>';
      } else {
        const sign = t.difficulty_bonus > 0 ? '+' : '';
        const cls = t.difficulty_bonus > 0 ? 'win' : 'loss';
        bonusHtml = '<span class="' + cls + '">' + sign + t.difficulty_bonus.toFixed(2) + '</span>';
      }
    }

    return \`
      <tr>
        <td class="text-sm">\${fmtDateShort(t.match_date)}</td>
        <td class="text-sm">\${t.opponent}</td>
        <td class="text-sm">\${t.venue.charAt(0)}</td>
        <td class="text-sm" style="text-align:center;">\${avail}</td>
        <td class="text-sm \${statusClass}">\${status}</td>
        <td class="text-sm \${resultClass}">\${resultHtml}</td>
        <td class="text-sm">\${bonusHtml}</td>
        <td class="text-sm" style="font-weight:600;">\${t.rating_after != null ? t.rating_after.toFixed(1) : '-'}</td>
        <td class="text-sm text-muted">\${recent}</td>
      </tr>
    \`;
  }).join('');

  render(\`
    <a class="back" onclick="history.back()">&larr; Back</a>
    <div class="card">
      <h2>\${player ? player.name : 'Player'} \${player && player.is_reserve ? '<span class="badge badge-reserve">R</span>' : ''}</h2>
      \${rating ? \`
        <div class="mt-8">
          <span style="font-size:1.3rem;font-weight:700;">\${rating.rating.toFixed(1)}</span>
          <span class="text-sm text-muted"> avg+diff</span>
          <span class="text-sm text-muted" style="margin-left:12px;">\${rating.games_played} \${rating.games_played === 1 ? 'game' : 'games'}</span>
        </div>
        \${rating.games_played > 0 ? \`
          <div class="text-sm mt-8">
            <span class="win">\${rating.wins}W</span> &ndash; <span class="loss">\${rating.losses}L</span>
            <span class="text-muted" style="margin-left:12px;">Pts: \${rating.points_for}&ndash;\${rating.points_against}</span>
          </div>
        \` : ''}
        \${rating.recent_entries && rating.recent_entries.length ? \`
          <div class="text-sm text-muted mt-8">Last \${w} scores: \${fmtRecent(rating)}</div>
          <div class="text-sm text-muted mt-8">Last \${w} difficulty bonus: \${fmtRecentBonuses(rating)}</div>
        \` : ''}
      \` : ''}
    </div>
    <div class="card" style="overflow-x:auto;">
      <h3>Season Timeline</h3>
      \${timeline.length ? \`
        <table>
          <thead><tr><th>Date</th><th>vs</th><th>V</th><th>Avail</th><th>Status</th><th>Result</th><th>Bonus</th><th>Avg+diff</th><th>Last \${w} scores</th></tr></thead>
          <tbody>\${rows}</tbody>
        </table>
      \` : '<div class="empty">No fixtures yet</div>'}
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
      <span>\${playerLink(p.id, p.name)}</span>
      \${isCaptain() ? \`<div style="display:flex;gap:4px;">
        <button class="btn-sm btn-outline" onclick="toggleReserve(\${p.id}, \${p.is_reserve ? 0 : 1})">\${p.is_reserve ? 'Make Core' : 'Make Res'}</button>
        <button class="btn-sm btn-danger" onclick="deactivatePlayer(\${p.id})">Remove</button>
      </div>\` : ''}
    </div>
  \`;

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <h1>Squad</h1>

    \${isCaptain() ? \`<div class="card">
      <h3>Add Player</h3>
      <div class="row">
        <input type="text" id="new-player-name" placeholder="Player name" style="margin-bottom:0;">
        <select id="new-player-role" style="width:90px;margin-bottom:0;">
          <option value="core">Core</option>
          <option value="reserve">Reserve</option>
        </select>
        <button class="btn-sm btn-primary" style="flex:none;" onclick="addPlayer()">Add</button>
      </div>
    </div>\` : ''}

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

async function viewRules() {
  let cfg = null;
  if (state.seasonId) {
    try { cfg = await api('/seasons/' + state.seasonId + '/config'); } catch (e) {}
  }
  const pickCount = cfg ? cfg.pick_count : 8;
  const window = cfg ? cfg.rating_window : 4;
  const rScore = cfg ? cfg.reserve_score : 20;
  const aScore = cfg ? cfg.away_score : 19;
  const defaultRating = cfg ? cfg.default_rating : 15;
  const alpha = cfg && cfg.difficulty_weight !== undefined && cfg.difficulty_weight !== null ? cfg.difficulty_weight : 1;
  const winCap = cfg && cfg.win_bonus_cap !== undefined && cfg.win_bonus_cap !== null ? cfg.win_bonus_cap : 1;
  const lossCap = cfg && cfg.loss_penalty_cap !== undefined && cfg.loss_penalty_cap !== null ? cfg.loss_penalty_cap : 1;
  const maxScore = cfg && cfg.max_score !== undefined && cfg.max_score !== null ? cfg.max_score : 21;

  render(\`
    <a class="back" onclick="navigate('/')">&larr; Home</a>
    <h1>Selection Rules</h1>

    <div class="card">
      <h3>How the team is chosen</h3>
      <p class="text-sm" style="line-height:1.5;margin-bottom:8px;">
        Each week we pick <strong>\${pickCount}</strong> players from those marked available.
      </p>
      <ol class="text-sm" style="line-height:1.6;padding-left:20px;">
        <li><strong>Core players first.</strong> If a core player is available, they always play. Reserves only fill in when there aren't enough cores available.</li>
        <li><strong>Sorted by form.</strong> Within core (and within reserves), players are picked in order of rating — highest first.</li>
      </ol>
    </div>

    <div class="card">
      <h3>How the rating works</h3>
      <p class="text-sm" style="line-height:1.5;margin-bottom:8px;">
        Each player's rating is the average of their last <strong>\${window}</strong> weeks.
        Each completed fixture contributes one score per player:
      </p>
      <ul class="text-sm" style="line-height:1.6;padding-left:20px;">
        <li><strong>Played</strong> → their actual score (0–\${cfg ? cfg.max_score : 21}) <strong>+ difficulty bonus</strong> (see below)</li>
        <li><strong style="color:#7c3aed;">R</strong> (Reserve) → <strong>\${rScore}</strong> (available, not selected)</li>
        <li><strong style="color:#dc2626;">A</strong> (Away) → <strong>\${aScore}</strong> (unavailable)</li>
      </ul>
      <p class="text-sm text-muted mt-8">
        New players start with a default rating of <strong>\${defaultRating}</strong> until they have a result.
      </p>
    </div>

    <div class="card">
      <h3>Difficulty bonus &nbsp;<span class="text-sm text-muted" style="font-weight:400;">(α = \${alpha}, win cap = +\${winCap}, loss cap = −\${lossCap})</span></h3>
      <p class="text-sm" style="line-height:1.5;margin-bottom:8px;">
        Not all opponents are equal. We use the opponent's <strong>avg net chalks per game before this match</strong> as the difficulty signal (<code>opp_diff</code>).
        Each played score gets a bonus added to the raw chalks before averaging.
      </p>

      <h4 style="margin-top:12px;">Rules:</h4>
      <ol class="text-sm" style="line-height:1.7;padding-left:20px;">
        <li><strong>Raw bonus = α × opp_diff.</strong> Strong opp gives positive credit, weak opp gives a negative dock — whether you won or lost.</li>
        <li><strong>Positive cap on WINS only:</strong> if you won, the positive bonus is clamped to at most <strong>+\${winCap}</strong>. On losses, positive bonus is uncapped (only rule 4 limits it).</li>
        <li><strong>Negative cap:</strong> any negative bonus is clamped to at least <strong>−\${lossCap}</strong> (regardless of W/L).</li>
        <li><strong>Score bounds:</strong> effective score is bounded to <strong>[0, \${maxScore + winCap}]</strong> on wins (so a 21-X win can take a +\${winCap} bonus → max \${maxScore + winCap}) and <strong>[0, \${maxScore}]</strong> on losses (a loss can never beat a winning effective score).</li>
      </ol>

      <h4 style="margin-top:12px;">Examples (with current α = \${alpha}, win cap = \${winCap}, loss cap = \${lossCap}):</h4>
      <p class="text-sm text-muted mt-8">
        <em>A — win 21-X vs strong opp (raw 21, opp_diff +6):</em>
        raw_bonus = \${alpha} × 6 = \${(alpha * 6).toFixed(2)} → rule 2 caps at +\${winCap}. Win ceiling is \${maxScore + winCap}, so the +\${winCap} fits.
        Effective = <strong>\${(21 + winCap).toFixed(2)}</strong>.
      </p>
      <p class="text-sm text-muted mt-8">
        <em>B — win vs weak opp (raw 21, opp_diff −13):</em>
        raw_bonus = \${alpha} × (−13) = \${(alpha * -13).toFixed(2)} → rule 3 caps at −\${lossCap}.
        Effective = <strong>\${(21 - lossCap).toFixed(2)}</strong>.
      </p>
      <p class="text-sm text-muted mt-8">
        <em>C — loss vs strong opp (raw 10, opp_diff +6):</em>
        raw_bonus = \${alpha} × 6 = <strong>+\${(alpha * 6).toFixed(2)}</strong> (no positive cap on losses).
        Effective = <strong>\${Math.min(10 + alpha * 6, maxScore).toFixed(2)}</strong>.
      </p>
      <p class="text-sm text-muted mt-8">
        <em>D — close loss vs very strong opp (raw 20, opp_diff +10):</em>
        raw_bonus = \${alpha} × 10 = \${(alpha * 10).toFixed(2)}; rule 4 ceiling limits effective to \${maxScore} → bonus = <strong>+\${(maxScore - 20).toFixed(2)}</strong>.
        Effective = <strong>\${maxScore}</strong>.
      </p>
      <p class="text-sm text-muted mt-8">
        <em>E — loss vs weak opp (raw 5, opp_diff −10):</em>
        raw_bonus = \${alpha} × (−10) = \${(alpha * -10).toFixed(2)} → rule 3 caps at −\${lossCap}.
        Effective = <strong>\${Math.max(5 - lossCap, 0).toFixed(2)}</strong>.
      </p>
      <p class="text-sm text-muted mt-8">
        <em>F — loss vs weak opp at raw 0 (opp_diff −10):</em>
        raw_bonus → −\${lossCap}, but rule 4 floors at 0 → bonus = <strong>0</strong>.
        Effective = <strong>0</strong>.
      </p>
    </div>

    <div class="card">
      <h3>What can the captain change?</h3>
      <ul class="text-sm" style="line-height:1.6;padding-left:20px;">
        <li>Toggle availability for any upcoming fixture</li>
        <li>Run / re-run selection</li>
        <li>Enter or edit results</li>
        <li>Add / remove players, change core ↔ reserve</li>
        <li>Flip <strong style="color:#7c3aed;">R</strong> ↔ <strong style="color:#dc2626;">A</strong> on a player's timeline (after results too)</li>
        <li>Adjust all parameters in season Settings</li>
      </ul>
    </div>

    \${isCaptain() ? \`
      <div class="card">
        <p class="text-sm text-muted">Numbers above are pulled from your current season's settings. To change them, go to <a onclick="navigate('/season')">Manage</a> → Settings.</p>
      </div>
    \` : ''}
  \`);
}

async function viewSeason() {
  await loadState();
  const clubInfo = await api('/club');

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

    <div class="card">
      <h3>Club</h3>
      <label class="text-sm text-muted">Club name</label>
      <input type="text" id="club-name" value="\${esc(clubInfo.name || '')}">
      <label class="text-sm text-muted">Player PIN (read-only access)</label>
      <input type="text" id="club-player-pin" value="\${esc(clubInfo.player_pin || '')}" placeholder="e.g. 1111">
      <button class="btn-primary mt-8" onclick="saveClubInfo()">Save</button>
    </div>

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

async function saveClubInfo() {
  const name = document.getElementById('club-name').value.trim();
  const playerPin = document.getElementById('club-player-pin').value.trim();
  await api('/club', { method: 'PUT', body: { name, player_pin: playerPin } });
  state.clubName = name;
  showToast('Saved');
}

async function viewSettings(seasonId) {
  const config = await api('/seasons/' + seasonId + '/config');
  const season = state.seasons.find(s => s.id === seasonId);

  const field = (label, key, type = 'number') => \`
    <div class="config-row">
      <label>\${label}</label>
      <input type="\${type}" id="cfg-\${key}" value="\${config[key]}" \${type === 'number' ? 'min="0" step="any"' : ''}>
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
      \${field('Reserve score', 'reserve_score')}
      \${field('Away score', 'away_score')}
      <p class="text-sm text-muted mt-8">Reserve = available but not picked. Away = unavailable. These fill in gaps in the rolling average.</p>
    </div>

    <div class="card">
      <h3>Difficulty Bonus</h3>
      \${field('Difficulty weight (α)', 'difficulty_weight')}
      \${field('Win bonus cap (max + bonus when you win)', 'win_bonus_cap')}
      \${field('Loss penalty cap (max − bonus when you lose)', 'loss_penalty_cap')}
      <p class="text-sm text-muted mt-8">
        Bonus rewards playing strong opponents and penalises easy losses. Caps prevent extreme single-game swings.
        Set α = 0 to disable bonuses entirely.
      </p>
      <button class="btn-outline" onclick="computeDifficulty(\${seasonId}, false)">Compute opponent difficulties</button>
      <button class="btn-outline" onclick="computeDifficulty(\${seasonId}, true)" style="margin-left:6px;">Recompute (force)</button>
      <p class="text-sm text-muted mt-8">
        For fixtures imported via "Import results" we already have opponent player URLs.
        For older fixtures, re-run "Import results" once and we'll save the URL — then click Compute.
      </p>
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

async function importMatchResults(fixtureId) {
  const url = prompt('Paste the cgleague match URL:');
  if (!url) return;
  const fixture = await api('/fixtures/' + fixtureId);
  const config = await api('/seasons/' + fixture.season_id + '/config');
  let data;
  try {
    data = await api('/fixtures/' + fixtureId + '/import-results-preview', { method: 'POST', body: { url } });
  } catch (e) { return; }

  // The preview also saved match_url + opponent info server-side. Now populate whichever
  // input panel is visible (entry rows for upcoming, edit rows for completed).
  const entryContainer = document.getElementById('score-entry-rows');
  const editContainer = document.getElementById('results-edit');
  const buildRow = (r) => {
    if (!r.player_id) {
      return '<div class="score-row"><span class="name" style="color:#999;">' + r.name + ' (no match)</span><span class="text-sm text-muted">skipped</span></div>';
    }
    return '<div class="score-row" data-row-player="' + r.player_id + '">' +
      '<span class="name">' + r.name + '</span>' +
      '<input type="number" min="0" max="' + config.max_score + '" data-result-player="' + r.player_id + '" data-field="player_score" value="' + r.our_score + '">' +
      '<span class="vs">-</span>' +
      '<input type="number" min="0" max="' + config.max_score + '" data-result-player="' + r.player_id + '" data-field="opponent_score" value="' + r.opp_score + '">' +
      '</div>';
  };
  const rowsHtml = data.rows.map(buildRow).join('');

  if (entryContainer) {
    entryContainer.innerHTML = rowsHtml;
  } else if (editContainer) {
    // Completed fixture: replace edit rows and reveal the edit panel so user can confirm.
    const inputs = editContainer.querySelectorAll('.score-row');
    inputs.forEach(n => n.remove());
    editContainer.insertAdjacentHTML('afterbegin', rowsHtml);
    const view = document.getElementById('results-view');
    if (view) view.style.display = 'none';
    editContainer.style.display = 'block';
  }

  const unmatched = data.rows.filter(r => !r.player_id).length;
  if (unmatched > 0) showToast(unmatched + ' player(s) not matched — check names. Click Save to confirm.', true);
  else showToast('Imported ' + data.rows.length + ' results. Match URL saved. Click Save to confirm.');
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

function toggleEditResults(fixtureId) {
  const view = document.getElementById('results-view');
  const edit = document.getElementById('results-edit');
  if (view && edit) {
    const showing = edit.style.display !== 'none';
    view.style.display = showing ? '' : 'none';
    edit.style.display = showing ? 'none' : '';
  }
}

async function addPlayer() {
  const inp = document.getElementById('new-player-name');
  const name = inp.value.trim();
  if (!name) return;
  const role = document.getElementById('new-player-role').value;
  await api('/players', { method: 'POST', body: { team_id: state.teamId, name, is_reserve: role === 'reserve' } });
  inp.value = '';
  viewSquad();
}

async function toggleRA(fixtureId, playerId, isAvailable) {
  await api('/fixtures/' + fixtureId + '/availability', {
    method: 'PUT',
    body: { players: [{ player_id: playerId, is_available: isAvailable }] },
  });
  viewPlayer(playerId);
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
  const fields = ['squad_size', 'reserve_count', 'pick_count', 'max_score', 'rating_window', 'default_rating', 'reserve_score', 'away_score', 'drop_count', 'drop_duration', 'difficulty_weight', 'win_bonus_cap', 'loss_penalty_cap'];
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
  showToast('Settings saved');
}

async function computeDifficulty(seasonId, force) {
  showToast('Fetching opponent histories...');
  try {
    const r = await api('/seasons/' + seasonId + '/compute-difficulty', { method: 'POST', body: { force: !!force } });
    const parts = [];
    if (r.scraped_fixtures) parts.push(r.scraped_fixtures + ' fixture' + (r.scraped_fixtures === 1 ? '' : 's') + ' rescraped');
    parts.push(r.computed + ' opponent diff' + (r.computed === 1 ? '' : 's') + ' computed');
    if (r.priorless) parts.push(r.priorless + ' opponent' + (r.priorless === 1 ? '' : 's') + ' had no prior games');
    if (r.fixtures_missing_url && r.fixtures_missing_url.length) {
      parts.push(r.fixtures_missing_url.length + ' fixture' + (r.fixtures_missing_url.length === 1 ? '' : 's') + ' still missing match URL — re-import them');
    }
    if ((r.scrape_failures && r.scrape_failures.length) || (r.fetch_failures && r.fetch_failures.length)) {
      const fails = (r.scrape_failures || []).length + (r.fetch_failures || []).length;
      parts.push(fails + ' fetch error' + (fails === 1 ? '' : 's'));
    }
    showToast(parts.join(' · '));
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// --- Copy to clipboard ---

async function copySelection(fixtureId) {
  const fixture = await api('/fixtures/' + fixtureId);
  const team = state.teams.find(t => t.id === state.teamId);
  const teamName = team ? team.name.toUpperCase() : 'TEAM';

  const sel = fixture.selections.filter(s => s.is_selected)
    .sort((a, b) => (b.rating_at_selection || 0) - (a.rating_at_selection || 0));
  const notSel = fixture.selections.filter(s => !s.is_selected && !s.is_dropped);

  // Unavailable: active players not in selection records
  const teamPlayers = await api('/players?team_id=' + fixture.team_id);
  const ratings = await api('/ratings?season_id=' + fixture.season_id);
  const ratingMap = {};
  for (const r of ratings) ratingMap[r.player_id] = r;
  const inSel = new Set(fixture.selections.map(s => s.player_id));
  const unavailable = teamPlayers
    .filter(p => !inSel.has(p.id))
    .map(p => ({ name: p.name, rating: (ratingMap[p.id] || {}).rating }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  let text = teamName + ' vs ' + fixture.opponent + ' (' + fixture.venue + ')\\n';
  text += fmtDate(fixture.match_date) + '\\n\\n';
  text += 'SELECTED (' + sel.length + '):\\n';
  sel.forEach((s, i) => {
    text += (i + 1) + '. ' + s.name.padEnd(18) + ' - ' + (s.rating_at_selection || 0).toFixed(1) + '\\n';
  });
  if (notSel.length) {
    text += '\\nNOT SELECTED:\\n';
    notSel.forEach(s => {
      text += '- ' + s.name + ' (' + (s.rating_at_selection || 0).toFixed(1) + ')\\n';
    });
  }
  if (unavailable.length) {
    text += '\\nUNAVAILABLE:\\n';
    unavailable.forEach(u => {
      text += '- ' + u.name + ' (' + (u.rating != null ? u.rating.toFixed(1) : '-') + ')\\n';
    });
  }

  await copyText(text);
}

async function copyRatings() {
  const [ratings, config] = await Promise.all([
    api('/ratings?season_id=' + state.seasonId),
    api('/seasons/' + state.seasonId + '/config'),
  ]);
  const w = (config && config.rating_window) || 4;
  const cores = ratings.filter(r => !r.is_reserve);
  const totW = cores.reduce((s, r) => s + (r.wins || 0), 0);
  const totL = cores.reduce((s, r) => s + (r.losses || 0), 0);
  const totPF = cores.reduce((s, r) => s + (r.points_for || 0), 0);
  const totPA = cores.reduce((s, r) => s + (r.points_against || 0), 0);

  const team = state.teams && state.teams.find(t => t.id === state.teamId);
  const teamName = team ? team.name : (state.clubName || 'Ratings');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const nameWidth = Math.min(16, Math.max(...cores.map(r => r.name.length), 6));

  // Column widths auto-size to the data so 3-digit point totals don't shift
  // a row past the rest (e.g. 152-101 is 7 chars while others are 6).
  const recStrs = cores.map(r => r.games_played > 0 ? (r.wins + '-' + r.losses) : '-');
  const ptsStrs = cores.map(r => r.games_played > 0 ? (r.points_for + '-' + r.points_against) : '-');
  const recW = Math.max(3, ...recStrs.map(s => s.length));
  const ptsW = Math.max(3, ...ptsStrs.map(s => s.length));
  const numW = 2;
  const avgW = 5;
  const cellW = 4; // wide enough for 'last' label and '+1.0' bonus

  // Recents follow the season's rating_window — w columns labelled
  //   -(w-1), …, -1, last  with the newest entry on the right.
  const labels = [];
  for (let i = 0; i < w; i++) labels.push(i === w - 1 ? 'last' : '-' + (w - 1 - i));

  const padScore = e => {
    if (e === null) return ' '.repeat(cellW);
    if (e.type === 'reserve') return 'R'.padStart(cellW);
    if (e.type === 'away') return 'A'.padStart(cellW);
    return String(e.raw_score !== undefined ? e.raw_score : e.score).padStart(cellW);
  };
  const padBonus = e => {
    if (e === null) return ' '.repeat(cellW);
    if (e.type !== 'played' || e.difficulty === null || e.difficulty === undefined) return '—'.padStart(cellW);
    const b = e.bonus || 0;
    if (b === 0) return '0'.padStart(cellW);
    const sign = b > 0 ? '+' : '';
    return (sign + b.toFixed(1)).padStart(cellW);
  };
  const renderCells = (r, fmt) => {
    const entries = (r.recent_entries || []).slice().reverse();
    const pad = Math.max(0, w - entries.length);
    const items = [];
    for (let i = 0; i < pad; i++) items.push(null);
    for (const e of entries) items.push(e);
    return items.map(fmt).join(' ');
  };

  const groupHeader = labels.map(l => l.padStart(cellW)).join(' ');
  const SEP = '   bonus ';                       // between score and bonus groups
  const SEP_BODY = ' '.repeat(SEP.length);

  const header =
    ' ' + '#'.padStart(numW) + ' ' +
    'Player'.padEnd(nameWidth) + '  ' +
    'Avg+d'.padStart(avgW) + '  ' +
    'W-L'.padStart(recW) + '  ' +
    'Pts'.padStart(ptsW) + '   ' +
    groupHeader + SEP + groupHeader + '\\n';

  let body = '';
  cores.forEach((r, i) => {
    const num = String(i + 1).padStart(numW);
    const name = r.name.length > nameWidth ? r.name.slice(0, nameWidth) : r.name.padEnd(nameWidth);
    const avg = r.rating.toFixed(1).padStart(avgW);
    const rec = recStrs[i].padStart(recW);
    const pts = ptsStrs[i].padStart(ptsW);
    body += ' ' + num + ' ' + name + '  ' + avg + '  ' + rec + '  ' + pts + '   ' +
      renderCells(r, padScore) + SEP_BODY + renderCells(r, padBonus) + '\\n';
  });

  let text = '*' + teamName + ' — Ratings*\\n';
  text += '_' + today + '_\\n\\n';
  text += '\`\`\`\\n' + header + body + '\`\`\`';
  if (totW + totL > 0) {
    const diff = totPF - totPA;
    text += '\\n_Core total: ' + totW + 'W-' + totL + 'L · pts ' + totPF + '-' + totPA + ' (' + (diff >= 0 ? '+' : '') + diff + ')_';
  }

  await copyText(text);
  showToast('Copied — paste into WhatsApp');
}

// --- Helpers ---

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// Format recent scores with R/A markers
function fmtRecent(r) {
  if (!r.recent_entries || r.recent_entries.length === 0) {
    return r.recent_scores && r.recent_scores.length ? r.recent_scores.join(', ') : '-';
  }
  return r.recent_entries.map(e => {
    if (e.type === 'reserve') return '<strong style="color:#7c3aed;">R</strong>';
    if (e.type === 'away') return '<strong style="color:#dc2626;">A</strong>';
    return e.raw_score !== undefined ? e.raw_score : e.score;
  }).join(', ');
}

function fmtRecentBonuses(r) {
  if (!r.recent_entries || r.recent_entries.length === 0) return '-';
  return r.recent_entries.map(e => {
    if (e.type !== 'played') return '<span class="text-muted">—</span>';
    if (e.difficulty === null || e.difficulty === undefined) return '<span class="text-muted">—</span>';
    const b = e.bonus || 0;
    if (b === 0) return '0';
    const sign = b > 0 ? '+' : '';
    const cls = b > 0 ? 'win' : 'loss';
    return '<span class="' + cls + '">' + sign + b.toFixed(2) + '</span>';
  }).join(', ');
}

// Returns 4 <td> cells with the player's last 4 scores, in chronological order
// (oldest → newest). Pads on the left when the player has fewer than 4 entries.
function recentScoreCells(r, w) {
  w = w || 4;
  const entries = (r.recent_entries || []).slice().reverse();
  const pad = Math.max(0, w - entries.length);
  const items = [];
  for (let i = 0; i < pad; i++) items.push(null);
  for (const e of entries) items.push(e);
  return items.map((e, i) => {
    const border = i === 0 ? 'border-left:1px solid #ddd;' : '';
    if (e === null) return '<td style="' + border + '"></td>';
    let inner;
    if (e.type === 'reserve') inner = '<strong style="color:#7c3aed;">R</strong>';
    else if (e.type === 'away') inner = '<strong style="color:#dc2626;">A</strong>';
    else inner = (e.raw_score !== undefined ? e.raw_score : e.score);
    return '<td class="text-sm" style="text-align:center;' + border + '">' + inner + '</td>';
  }).join('');
}

// Labels for the recents sub-header: -(w-1) … -1, last.
function recentSubHeaders(w) {
  let out = '';
  for (let i = 0; i < w; i++) {
    const label = (i === w - 1) ? 'last' : '-' + (w - 1 - i);
    const border = i === 0 ? 'border-left:1px solid #ddd;' : '';
    out += '<th style="' + border + 'text-align:center;">' + label + '</th>';
  }
  return out;
}

// Returns 4 <td> cells with the player's last 4 difficulty bonuses, chronologically.
function recentBonusCells(r, w) {
  w = w || 4;
  const entries = (r.recent_entries || []).slice().reverse();
  const pad = Math.max(0, w - entries.length);
  const items = [];
  for (let i = 0; i < pad; i++) items.push(null);
  for (const e of entries) items.push(e);
  return items.map((e, i) => {
    const border = i === 0 ? 'border-left:1px solid #ddd;' : '';
    if (e === null) return '<td style="' + border + '"></td>';
    if (e.type !== 'played' || e.difficulty === null || e.difficulty === undefined) {
      return '<td class="text-sm text-muted" style="text-align:center;' + border + '">—</td>';
    }
    const b = e.bonus || 0;
    if (b === 0) return '<td class="text-sm text-muted" style="text-align:center;' + border + '">0</td>';
    const sign = b > 0 ? '+' : '';
    const cls = b > 0 ? 'win' : 'loss';
    return '<td class="text-sm" style="text-align:center;' + border + '"><span class="' + cls + '">' + sign + b.toFixed(2) + '</span></td>';
  }).join('');
}

function fmtDateShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function playerLink(playerId, name) {
  return '<a onclick="navigate(\\'/player/' + playerId + '\\')" style="cursor:pointer;color:inherit;text-decoration:none;border-bottom:1px dotted #999;">' + name + '</a>';
}

  </script>
</body>
</html>`;
}
