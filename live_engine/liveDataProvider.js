/**
 * live_engine/liveDataProvider.js
 *
 * Thin adapter that turns liveTracker.js functions into the snapshot
 * interface that server.js and liveBetEngine.js expect.
 *
 * fetchLiveSnapshot()     → { matches, source, fetchedAt }
 * fetchScheduleSnapshot() → { matches, source, fetchedAt }
 */

const { getLiveMatches, findMatch, getMatchStats } = require('../live_engine/liveTracker');

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function stamp(matches, source) {
  return {
    matches: matches || [],
    source:  source  || 'none',
    fetchedAt: new Date().toISOString(),
    count: (matches || []).length,
  };
}

// ──────────────────────────────────────────────────────────────────
// Live snapshot  (used by GET /live)
// ──────────────────────────────────────────────────────────────────

async function fetchLiveSnapshot() {
  const { matches, source } = await getLiveMatches();
  return stamp(matches, source);
}

// ──────────────────────────────────────────────────────────────────
// Schedule snapshot  (used by GET /schedule)
// Flashscore/Football-Data don't expose a combined schedule endpoint
// in liveTracker, so we fall back to Football-Data's today fixture list.
// ──────────────────────────────────────────────────────────────────

async function fetchScheduleSnapshot() {
  const fetch = require('node-fetch');
  const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  if (!FOOTBALL_DATA_API_KEY) {
    console.warn('⚠️  [Schedule] FOOTBALL_DATA_API_KEY not set – returning empty schedule');
    return stamp([], 'none');
  }

  try {
    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${tomorrowStr}`;
    console.log(`📡 [Schedule] GET ${url}`);

    const response = await fetch(url, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
    });

    if (response.status === 429) {
      console.warn('⚠️  [Schedule] Football-Data rate limit hit');
      return stamp([], 'rate-limited');
    }

    if (!response.ok) {
      console.error(`❌ [Schedule] Football-Data HTTP ${response.status}`);
      return stamp([], 'error');
    }

    const data = await response.json();
    const matches = (data.matches || []).map((m) => ({
      eventId:   m.id,
      home:      m.homeTeam?.name  || m.homeTeam?.shortName  || 'Unknown',
      away:      m.awayTeam?.name  || m.awayTeam?.shortName  || 'Unknown',
      league:    m.competition?.name || 'Unknown',
      status:    m.status,
      startTime: m.utcDate,
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      source:    'football-data',
    }));

    console.log(`✅ [Schedule] ${matches.length} fixtures from Football-Data`);
    return stamp(matches, 'football-data');

  } catch (error) {
    console.error('❌ [Schedule] Error:', error.message);
    return stamp([], 'error');
  }
}

// ──────────────────────────────────────────────────────────────────
// Re-export lower-level helpers for liveBetEngine
// ──────────────────────────────────────────────────────────────────

module.exports = {
  fetchLiveSnapshot,
  fetchScheduleSnapshot,
  findMatch,
  getMatchStats,
};
