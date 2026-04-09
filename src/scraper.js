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

  // Extract player names from cells with data-customkey containing name patterns
  // Format: <td class='B05' data-customkey='Adams Derek'>\nDerek Adams\n</td>
  // Name key can contain hyphens (e.g. 'Forrest-Hay Guy')
  const nameRegex = /<td[^>]*data-customkey='([A-Za-z-]+ [A-Za-z-]+[^']*)'[^>]*>\s*\n?\s*([^<]+)/g;
  let match;
  while ((match = nameRegex.exec(tableHtml)) !== null) {
    const name = match[2].trim();
    if (name && name.length > 1) {
      players.push({ name });
    }
  }

  return players;
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
