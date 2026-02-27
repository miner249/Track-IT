const API_URL = window.location.origin;

export async function fetchTodayMatches() {
  const res = await fetch(`${API_URL}/api/today`);
  return res.json();
}

export async function fetchLiveMatches() {
  const res = await fetch(`${API_URL}/api/live`);
  return res.json();
}

export async function fetchMatchDetails(id) {
  const res = await fetch(`${API_URL}/api/match/${id}`);
  return res.json();
}

export function getMatchStatusLabel(match) {
  const status     = match?.status;
  const statusTime = match?.status_time;
  const startTime  = match?.start_time;

  if (status === 'IN_PLAY' || status === 'Live') {
    if (statusTime && statusTime.toLowerCase().includes('half')) return 'HALF TIME';
    return statusTime || 'LIVE';
  }

  if (status === 'PAUSED') return 'HALF TIME';

  if (status === 'FINISHED' || status === 'Finished') return 'FT';

  if (status === 'POSTPONED')  return 'POSTPONED';
  if (status === 'CANCELLED')  return 'CANCELLED';
  if (status === 'SUSPENDED')  return 'SUSPENDED';

  // Not started yet — show kick-off time in local time
  if (status === 'TIMED' || status === 'SCHEDULED') {
    if (!startTime) return 'TBD';
    return new Date(startTime).toLocaleTimeString('en-NG', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Fallback — if we have a start time but no known status, show time
  if (!status && startTime) {
    return new Date(startTime).toLocaleTimeString('en-NG', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  return statusTime || status || 'TBD';
}