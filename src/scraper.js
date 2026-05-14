// Scraper for cgleague.co.uk team pages

/**
 * Fetch the team page HTML, trying the given URL directly.
 * @param {string} url - full team page URL
 * @returns {Promise<string>} HTML content
 */
async function fetchTeamPage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
  return resp.text();
}

/**
 * Scrape fixtures from a team page URL.
 * @param {string} url - full URL to team page
 * @param {number} year - season year (for date parsing)
 * @returns {Promise<Array>} [{match_date, opponent, venue}]
 */
export async function scrapeFixtures(url, year) {
  const html = await fetchTeamPage(url);
  return parseFixtures(html, year || new Date().getFullYear());
}

/**
 * Scrape registered players from a team page URL.
 * @param {string} url - full URL to team page
 * @returns {Promise<Array>} [{name}]
 */
export async function scrapeRoster(url) {
  const html = await fetchTeamPage(url);
  return parseRoster(html);
}

/**
 * Scrape a single match page from cgleague.
 * Returns players in the order they appear in the table (playing order).
 * @param {string} url - full URL to match page
 * @param {string} ourTeamName - our team name (e.g. "Westlands 1")
 * @returns {Promise<{venue:'Home'|'Away', rows: Array<{name:string, our_score:number, opp_score:number}>}>}
 */
export async function scrapeMatch(url, ourTeamName) {
  const html = await fetchTeamPage(url);
  return parseMatch(html, ourTeamName);
}

/**
 * Scrape both fixtures and roster in one fetch.
 * @param {string} url - full URL to team page
 * @param {number} year - season year
 * @returns {Promise<{fixtures: Array, players: Array, division: string}>}
 */
export async function scrapeAll(url, year) {
  const html = await fetchTeamPage(url);
  return {
    fixtures: parseFixtures(html, year || new Date().getFullYear()),
    players: parseRoster(html),
    division: parseDivision(html),
  };
}

/**
 * Parse fixture rows from the team page HTML.
 * The fixture table has rows like: opponent | Home/Away | Wed 15 Apr | score | score
 */
function parseFixtures(html, year) {
  const fixtures = [];

  // Match table rows that contain fixture data
  // Pattern: look for rows with Home/Away and a date pattern like "Wed 15 Apr"
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];

    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      // Strip HTML tags and trim
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
    }

    if (cells.length < 3) continue;

    // Find the cell with Home or Away
    let venueIdx = -1;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === 'Home' || cells[i] === 'Away') {
        venueIdx = i;
        break;
      }
    }
    if (venueIdx === -1) continue;

    // Find the date cell — matches patterns like "Wed 15 Apr" or "Tue 28 Jul"
    const dateRegex = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i;
    let dateIdx = -1;
    let dateMatch = null;
    for (let i = 0; i < cells.length; i++) {
      const m = cells[i].match(dateRegex);
      if (m) {
        dateIdx = i;
        dateMatch = m;
        break;
      }
    }
    if (dateIdx === -1) continue;

    // Opponent is typically the first cell (or the cell before venue)
    const opponent = cells[venueIdx - 1] || cells[0];
    if (!opponent || opponent === 'Home' || opponent === 'Away') continue;

    const venue = cells[venueIdx];
    const day = parseInt(dateMatch[1]);
    const month = monthToNum(dateMatch[2]);
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    fixtures.push({
      match_date: isoDate,
      opponent,
      venue,
    });
  }

  return fixtures;
}

/**
 * Parse registered player names from the "Registered players" table.
 * Player names are in cells with data-customkey="Surname Firstname".
 */
function parseRoster(html) {
  const players = [];

  // Find the registered players section
  const rosterStart = html.indexOf('Registered players');
  if (rosterStart === -1) return players;

  // Find the table after this heading
  const tableStart = html.indexOf('<tbody>', rosterStart);
  const tableEnd = html.indexOf('</tbody>', tableStart);
  if (tableStart === -1 || tableEnd === -1) return players;

  const tableHtml = html.slice(tableStart, tableEnd);

  // Extract player names from cells with data-customkey matching "Surname Firstname".
  // Two formats appear in the page:
  //   <td data-customkey='Adams Derek'>Derek Adams</td>           (no stats)
  //   <td data-customkey='Davies Ann'><a href='...'>Ann Davies</a></td>  (has stats)
  // We capture the whole cell body and strip HTML tags.
  // Surnames can contain hyphens (e.g. "Forrest-Hay Guy").
  const nameRegex = /<td[^>]*data-customkey='([A-Za-z][A-Za-z-]* [A-Za-z][A-Za-z-]*(?: [A-Za-z][A-Za-z-]*)?)'[^>]*>([\s\S]*?)<\/td>/g;
  let match;
  while ((match = nameRegex.exec(tableHtml)) !== null) {
    const name = match[2].replace(/<[^>]+>/g, '').trim();
    if (name && name.length > 1) {
      players.push({ name });
    }
  }

  return players;
}

/**
 * Parse a match page. Each rink is one <tr> with 6 cells:
 *   home name | home score | home gain | away name | away score | away gain
 * Home team and away team names appear in the header row.
 * Returns rows in the order they appear (playing order).
 */
function parseMatch(html, ourTeamName) {
  // Identify which side is "us" by matching the team name in the header.
  // The header has: HOME TEAM\n<a ...>Westlands 1</a> and AWAY TEAM\n<a ...>Wolstanton Marsh</a>
  const headerMatch = html.match(/HOME TEAM[\s\S]*?>([^<]+)<\/a>[\s\S]*?AWAY TEAM[\s\S]*?>([^<]+)<\/a>/);
  if (!headerMatch) return { venue: null, rows: [] };
  const homeTeam = headerMatch[1].trim();
  const awayTeam = headerMatch[2].trim();
  const norm = s => s.trim().toLowerCase();
  let venue;
  if (norm(homeTeam) === norm(ourTeamName)) venue = 'Home';
  else if (norm(awayTeam) === norm(ourTeamName)) venue = 'Away';
  else return { venue: null, rows: [], homeTeam, awayTeam };

  // Find data rows: <tr> containing 6 <td>s where the first is a MatchPlayerName
  const rows = [];
  const trRegex = /<tr>\s*<td class="MatchPlayerName">([\s\S]*?)<\/td>\s*<td class="MatchScore">([\s\S]*?)<\/td>\s*<td class="MatchScore">[\s\S]*?<\/td>\s*<td class="MatchPlayerName">([\s\S]*?)<\/td>\s*<td class="MatchScore">([\s\S]*?)<\/td>\s*<td class="MatchScore">[\s\S]*?<\/td>\s*<\/tr>/g;
  let m;
  while ((m = trRegex.exec(html)) !== null) {
    const homeName = stripTags(m[1]).replace(/ /g, ' ').trim();
    const homeScore = parseInt(stripTags(m[2])) || 0;
    const awayName = stripTags(m[3]).replace(/ /g, ' ').trim();
    const awayScore = parseInt(stripTags(m[4])) || 0;
    const ourName = venue === 'Home' ? homeName : awayName;
    const ourScore = venue === 'Home' ? homeScore : awayScore;
    const oppScore = venue === 'Home' ? awayScore : homeScore;
    if (ourName) rows.push({ name: ourName, our_score: ourScore, opp_score: oppScore });
  }
  return { venue, rows, homeTeam, awayTeam };
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

/**
 * Parse the division from the page heading.
 * Format: "Division 2 - Season 2026"
 */
function parseDivision(html) {
  const match = html.match(/Division\s+(\d+)\s*-\s*Season\s+(\d+)/i);
  if (match) return `Division ${match[1]}`;
  return '';
}

function monthToNum(m) {
  const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  return months[m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()] || 1;
}
