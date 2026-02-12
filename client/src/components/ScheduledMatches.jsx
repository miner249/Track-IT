import { useState, useEffect } from 'react';
import '../styles/ScheduledMatches.css';

const API_URL = window.location.origin;

function ScheduledMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'live', 'finished'

  useEffect(() => {
    fetchScheduledMatches();
    const interval = setInterval(fetchScheduledMatches, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  async function fetchScheduledMatches() {
    try {
      const res = await fetch(`${API_URL}/api/today-matches`);
      const data = await res.json();

      if (data.success) {
        setMatches(data.matches || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch matches');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching scheduled matches:', err);
      setError('Network error');
      setLoading(false);
    }
  }

  const filteredMatches = matches.filter(match => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return match.status === 'Upcoming' || match.status === 'TIMED';
    if (filter === 'live') return match.status === 'Live' || match.status === 'IN_PLAY' || match.status === 'PAUSED';
    if (filter === 'finished') return match.status === 'Finished' || match.status === 'FINISHED';
    return true;
  });

  const formatTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getFilterCounts = () => ({
    all: matches.length,
    upcoming: matches.filter(m => m.status === 'Upcoming' || m.status === 'TIMED').length,
    live: matches.filter(m => m.status === 'Live' || m.status === 'IN_PLAY' || m.status === 'PAUSED').length,
    finished: matches.filter(m => m.status === 'Finished' || m.status === 'FINISHED').length,
  });

  const counts = getFilterCounts();

  if (loading) {
    return (
      <section className="section">
        <div className="card-static">
          <h2 className="section-title">📅 Today's Matches</h2>
          <p className="empty-text">Loading matches...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section">
        <div className="card-static">
          <h2 className="section-title">📅 Today's Matches</h2>
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <p className="empty-text">
              {error}<br />
              <button onClick={fetchScheduledMatches} className="btn btn-primary" style={{ marginTop: '16px' }}>
                Retry
              </button>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">📅 Today's Matches</h2>
        <span className="badge badge-pending">{filteredMatches.length} matches</span>
      </div>

      <div className="filters-container">
        <button 
          className={`filter-btn ${filter === 'all' ? 'filter-btn-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({counts.all})
        </button>
        <button 
          className={`filter-btn ${filter === 'upcoming' ? 'filter-btn-active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming ({counts.upcoming})
        </button>
        <button 
          className={`filter-btn ${filter === 'live' ? 'filter-btn-active' : ''}`}
          onClick={() => setFilter('live')}
        >
          🔴 Live ({counts.live})
        </button>
        <button 
          className={`filter-btn ${filter === 'finished' ? 'filter-btn-active' : ''}`}
          onClick={() => setFilter('finished')}
        >
          Finished ({counts.finished})
        </button>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="empty-state card-static">
          <div className="empty-icon">⚽</div>
          <p className="empty-text">No matches found for this filter</p>
        </div>
      ) : (
        <div className="matches-container">
          {filteredMatches.map((match, index) => {
            const isLive = match.status === 'Live' || match.status === 'IN_PLAY';
            const isUpcoming = match.status === 'Upcoming' || match.status === 'TIMED';
            const isFinished = match.status === 'Finished' || match.status === 'FINISHED';
            
            return (
              <div key={index} className={`schedule-match-card card ${isLive ? 'match-live' : ''}`}>
                <div className="schedule-match-header">
                  <span className="schedule-league">{match.league}</span>
                  <span className={`badge ${isLive ? 'badge-live' : isUpcoming ? 'badge-pending' : 'badge-win'}`}>
                    {match.status}
                  </span>
                </div>

                <div className="schedule-teams">
                  <div className="schedule-team-row">
                    <span className="schedule-team-name">{match.home}</span>
                    <span className="schedule-score text-win">
                      {match.homeScore ?? '-'}
                    </span>
                  </div>
                  <div className="schedule-team-row">
                    <span className="schedule-team-name">{match.away}</span>
                    <span className="schedule-score text-win">
                      {match.awayScore ?? '-'}
                    </span>
                  </div>
                </div>

                <div className="schedule-match-time">
                  🕐 {isUpcoming 
                    ? `Starts at ${formatTime(match.startTime)}` 
                    : isLive
                    ? 'In Progress'
                    : 'Full Time'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ScheduledMatches;
