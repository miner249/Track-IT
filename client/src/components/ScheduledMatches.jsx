import { useState, useEffect } from 'react';
import MatchCard from './MatchCard';
import { fetchLiveMatches, fetchTodayMatches } from '../lib/api';
import '../styles/ScheduledMatches.css';

function groupByLeague(matches) {
  return matches.reduce((groups, match) => {
    const league = match.league || 'Unknown League';
    if (!groups[league]) groups[league] = [];
    groups[league].push(match);
    return groups;
  }, {});
}

function ScheduledMatches({ onOpenMatch }) {
  const [allMatches, setAllMatches]   = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [filter, setFilter]           = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Initial load + polling every 60 seconds for all tabs
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Extra faster polling for live tab — every 30 seconds
  useEffect(() => {
    if (filter !== 'live') return;
    const interval = setInterval(fetchLiveOnly, 30_000);
    return () => clearInterval(interval);
  }, [filter]);

  async function loadData() {
    try {
      setLoading(prev => prev); // don't flash loading on refresh
      const [todayData, liveData] = await Promise.all([
        fetchTodayMatches(),
        fetchLiveMatches(),
      ]);

      if (todayData.success) {
        setAllMatches(todayData.matches || []);
      }

      if (liveData.success) {
        setLiveMatches(
          (liveData.matches || []).filter(
            m => m?.status === 'IN_PLAY' || m?.status === 'PAUSED' || m?.status === 'Live'
          )
        );
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  }

  async function fetchLiveOnly() {
    try {
      const liveData = await fetchLiveMatches();
      if (liveData.success) {
        setLiveMatches(
          (liveData.matches || []).filter(
            m => m?.status === 'IN_PLAY' || m?.status === 'PAUSED' || m?.status === 'Live'
          )
        );
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredMatches =
    filter === 'all'      ? allMatches :
    filter === 'live'     ? liveMatches :
    filter === 'finished' ? allMatches.filter(m => m.status === 'FINISHED') :
    [];

  const groupedMatches = groupByLeague(filteredMatches);
  const leagueNames    = Object.keys(groupedMatches).sort();

  const liveCount     = liveMatches.length;
  const finishedCount = allMatches.filter(m => m.status === 'FINISHED').length;

  if (loading) {
    return (
      <section className="section">
        <div className="card-static">
          <h2 className="section-title">📅 Today Matches</h2>
          <div className="loading-container">
            <div className="loading-spinner" />
            <p className="empty-text">Loading matches...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section">
        <div className="card-static">
          <h2 className="section-title">📅 Today Matches</h2>
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <p className="empty-text">{error}</p>
            <button className="btn btn-secondary" onClick={loadData}>
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">📅 Today Matches</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-pending">{filteredMatches.length} matches</span>
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="filters-container">
        <button
          className={`filter-btn ${filter === 'all' ? 'filter-btn-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
          <span className="filter-count">{allMatches.length}</span>
        </button>

        <button
          className={`filter-btn ${filter === 'live' ? 'filter-btn-active' : ''}`}
          onClick={() => setFilter('live')}
        >
          🔴 Live
          {liveCount > 0 && (
            <span className="filter-count filter-count-live">{liveCount}</span>
          )}
        </button>

        <button
          className={`filter-btn ${filter === 'finished' ? 'filter-btn-active' : ''}`}
          onClick={() => setFilter('finished')}
        >
          Finished
          {finishedCount > 0 && (
            <span className="filter-count">{finishedCount}</span>
          )}
        </button>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="empty-state card-static">
          <div className="empty-icon">⚽</div>
          <p className="empty-text">
            {filter === 'live'     ? 'No live matches right now' :
             filter === 'finished' ? 'No finished matches yet today' :
             'No matches found'}
          </p>
        </div>
      ) : (
        <div className="matches-container">
          {leagueNames.map(league => (
            <div key={league} className="league-group">
              <div className="league-header">
                <span className="league-name">🏆 {league}</span>
                <span className="league-count">{groupedMatches[league].length}</span>
              </div>
              {groupedMatches[league].map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => onOpenMatch(match.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ScheduledMatches;