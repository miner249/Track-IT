import { useState, useEffect } from 'react';
import '../styles/MyLiveBets.css';

const API_URL = window.location.origin;

function MyLiveBets() {
  const [liveBets, setLiveBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveBets();
    const interval = setInterval(fetchLiveBets, 40000); // Update every 40s
    return () => clearInterval(interval);
  }, []);

  async function fetchLiveBets() {
    try {
      const res = await fetch(`${API_URL}/api/tracked-live-matches`);
      const data = await res.json();
      
      if (data.success) {
        setLiveBets(data.matches || []);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching live bets:', err);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="section">
        <div className="card-static">
          <h2 className="section-title">🎯 My Live Bets</h2>
          <p className="empty-text">Checking for live matches...</p>
        </div>
      </section>
    );
  }

  if (liveBets.length === 0) {
    return (
      <section className="section">
        <div className="card-static">
          <h2 className="section-title">🎯 My Live Bets</h2>
          <div className="empty-state">
            <div className="empty-icon">⚽</div>
            <p className="empty-text">
              None of your tracked bets are currently live.<br />
              <small style={{ color: 'var(--color-text-muted)' }}>
                We'll show them here when matches start!
              </small>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">🎯 My Live Bets</h2>
        <span className="badge badge-live">{liveBets.length} live</span>
      </div>

      <div className="live-bets-container">
        {liveBets.map((bet, index) => (
          <div key={index} className="live-bet-card card">
            <div className="live-bet-header">
              <span className="live-bet-code">Code: {bet.shareCode}</span>
              <span className="badge badge-live">🔴 LIVE</span>
            </div>

            <div className="live-match-info">
              <div className="live-teams">
                <span className="live-team">{bet.match.home}</span>
                <span className="live-score">
                  {bet.match.homeScore} - {bet.match.awayScore}
                </span>
                <span className="live-team">{bet.match.away}</span>
              </div>

              <div className="live-details">
                <span className="live-league">🏆 {bet.match.league}</span>
                <span className="live-status text-win">{bet.match.status}</span>
              </div>

              <div className="live-selection">
                <span className="selection-label">Your bet:</span>
                <span className="selection-value">
                  {bet.marketName}: {bet.selection}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MyLiveBets;
