/**
 * live_engine/liveDataProvider.js
 */

const fetch = require('node-fetch');
const { getLiveMatches, findMatch, getMatchStats } = require('../live_engine/liveTracker');

// ──────────────────────────────────────────────────────────────
// Server-side cache — shared across ALL users
// ──────────────────────────────────────────────────────────────
const cache = {
  live: {
    data:      null,
    fetchedAt: 0,
    ttl:       30_000,   // 30 seconds — live data changes fast
  },
  schedule: {
    data:      null,
    fetchedAt: 0,
    ttl:       60_000,   // 60 seconds — schedule changes slowly
  },
};

function isCacheValid(entry) {
  return entry.data !== null && (Date.now() - entry.fetchedAt) < entry.ttl;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function stamp(matches, source) {
  return {
    matches:   matches || [],
    source:    source  || 'none',
    fetchedAt: new Date().toISOString(),
    count:     (matches || []).length,
  };
}

// ──────────────────────────────────────────────────────────────
// Live snapshot  (Apify → Football-Data fallback)
// ──────────────────────────────────────────────────────────────
async function fetchLiveSnapshot() {
  // Return cache if still valid — same data for all users
  if (isCacheValid(cache.live)) {
    console.log(`💾 [Cache] Live — serving cached data (${Math.round((Date.now() - cache.live.fetchedAt) / 1000)}s old)`);
    return cache.live.data;
  }

  console.log('🔄 [Live] Cache expired — fetching fresh data...');

  const { matches, source } = await getLiveMatches();

  const normalized = (matches || []).map(m => ({
    id:          m.eventId    || m.id,
    home_team:   m.home_team  || m.home  || 'Unknown',
    away_team:   m.away_team  || m.away  || 'Unknown',
    league:      m.league     || 'Unknown',
    status:      m.status,
    status_time: m.status_time || m.status,
    home_score:  m.homeScore  ?? m.home_score ?? null,
    away_score:  m.awayScore  ?? m.away_score ?? null,
    start_time:  m.startTime  || m.start_time || null,
    history:     m.history    || [],
    stats:       m.stats      || {},
    source:      m.source     || source,
  }));

  const result = stamp(normalized, source);

  // Store in cache — all users will get this until TTL expires
  cache.live.data      = result;
  cache.live.fetchedAt = Date.now();

  console.log(`✅ [Live] Cached ${normalized.length} matches for ${cache.live.ttl / 1000}s`);
  return result;
}

// ──────────────────────────────────────────────────────────────
// Schedule snapshot  (Football-Data)
// ──────────────────────────────────────────────────────────────
async function fetchScheduleSnapshot() {
  // Return cache if still valid
  if (isCacheValid(cache.schedule)) {
    console.log(`💾 [Cache] Schedule — serving cached data (${Math.round((Date.now() - cache.schedule.fetchedAt) / 1000)}s old)`);
    return cache.schedule.data;
  }

  console.log('🔄 [Schedule] Cache expired — fetching fresh data...');

  const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  if (!FOOTBALL_DATA_API_KEY) {
    console.warn('⚠️  [Schedule] FOOTBALL_DATA_API_KEY not set');
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
      console.warn('⚠️  [Schedule] Rate limit hit — extending cache TTL');
      // If we have stale data, keep serving it rather than returning empty
      if (cache.schedule.data) {
        cache.schedule.fetchedAt = Date.now(); // reset timer to avoid hammering
        return cache.schedule.data;
      }
      return stamp([], 'rate-limited');
    }

    if (!response.ok) {
      console.error(`❌ [Schedule] HTTP ${response.status}`);
      if (cache.schedule.data) return cache.schedule.data; // serve stale on error
      return stamp([], 'error');
    }

    const data = await response.json();

    const matches = (data.matches || []).map(m => ({
      id:          m.id,
      home_team:   m.homeTeam?.name    || m.homeTeam?.shortName  || 'Unknown',
      away_team:   m.awayTeam?.name    || m.awayTeam?.shortName  || 'Unknown',
      league:      m.competition?.name || 'Unknown',
      status:      m.status,
      status_time: m.minute ? `${m.minute}'` : null,
      start_time:  m.utcDate,
      home_score:  m.score?.fullTime?.home  ?? m.score?.halfTime?.home  ?? null,
      away_score:  m.score?.fullTime?.away  ?? m.score?.halfTime?.away  ?? null,
      source:      'football-data',
    }));

    const result = stamp(matches, 'football-data');

    // Store in cache
    cache.schedule.data      = result;
    cache.schedule.fetchedAt = Date.now();

    console.log(`✅ [Schedule] Cached ${matches.length} fixtures for ${cache.schedule.ttl / 1000}s`);
    return result;

  } catch (error) {
    console.error('❌ [Schedule] Error:', error.message);
    if (cache.schedule.data) return cache.schedule.data; // serve stale on error
    return stamp([], 'error');
  }
}

// ──────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────
module.exports = {
  fetchLiveSnapshot,
  fetchScheduleSnapshot,
  findMatch,
  getMatchStats,
};