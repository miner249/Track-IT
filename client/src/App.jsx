import { useState, useEffect } from 'react';
import LiveMatchTracker from './LiveMatchTracker';

const API_URL = window.location.origin;

// ─── STYLES ───────────────────────────────────────────────
const styles = {
  app: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f1f5f9',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderBottom: '1px solid #1e293b',
    padding: '20px 16px',
    textAlign: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  headerSub: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: '14px',
  },
  container: {
    maxWidth: '720px',
    width: '100%',
    margin: '0 auto',
    padding: '20px 16px',
    boxSizing: 'border-box',
  },

  // Input
  inputCard: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
    marginBottom: '20px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    width: '100%',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '14px 16px',
    fontSize: '16px',
    background: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '10px',
    color: '#f1f5f9',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: '#4ade80',
  },
  trackBtn: {
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    color: '#0f172a',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s, transform 0.1s',
    flexShrink: 0,
  },
  trackBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  // Message
  message: {
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  messageSuccess: {
    background: '#166534',
    color: '#bbf7d0',
    border: '1px solid #15803d',
  },
  messageError: {
    background: '#7f1d1d',
    color: '#fecaca',
    border: '1px solid #991b1b',
  },
  messageLoading: {
    background: '#1e3a5f',
    color: '#bae6fd',
    border: '1px solid #1d4ed8',
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '14px 8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '800',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // Section
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#e2e8f0',
    margin: 0,
  },
  betCount: {
    background: '#334155',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
  },

  // Bet Card
  betCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '10px',
    transition: 'border-color 0.2s',
    cursor: 'pointer',
  },
  betCardHover: {
    borderColor: '#4ade80',
  },
  betCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    gap: '8px',
  },
  betCode: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: '0.5px',
    minWidth: 0,
    wordBreak: 'break-all',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  statusPending: {
    background: '#1e3a5f',
    color: '#38bdf8',
  },
  betInfo: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  betInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '70px',
  },
  betInfoLabel: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  betInfoValue: {
    fontSize: '15px',
    fontWeight: '700',
  },
  betActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  btnView: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '600',
    background: '#334155',
    color: '#e2e8f0',
    border: '1px solid #475569',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnDelete: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '600',
    background: 'transparent',
    color: '#f87171',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  betTime: {
    fontSize: '12px',
    color: '#475569',
    marginTop: '8px',
  },

  // Detail Modal
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: '#1e293b',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '24px 16px',
    border: '1px solid #334155',
    borderBottom: 'none',
    boxSizing: 'border-box',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '8px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    color: '#f1f5f9',
    minWidth: 0,
    wordBreak: 'break-all',
  },
  modalClose: {
    background: '#334155',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    minWidth: '32px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '20px',
  },
  modalStatCard: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '14px 10px',
    textAlign: 'center',
    border: '1px solid #334155',
  },

  // Match Card in Detail
  matchCard: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '10px',
  },
  matchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '8px',
    flexWrap: 'wrap',
  },
  matchTeams: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#f1f5f9',
    minWidth: 0,
    wordBreak: 'break-word',
  },
  matchOddsBadge: {
    background: '#166534',
    color: '#4ade80',
    fontSize: '14px',
    fontWeight: '800',
    padding: '4px 12px',
    borderRadius: '8px',
    flexShrink: 0,
  },
  matchMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  matchMetaItem: {
    fontSize: '13px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  matchMetaHighlight: {
    color: '#94a3b8',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#475569',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
};

// ─── APP ──────────────────────────────────────────────────
function App() {
  const [shareCode, setShareCode] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBet, setSelectedBet] = useState(null);
  const [hoveredBet, setHoveredBet] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 480);

  // Listen for resize to toggle mobile layout
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetchBets();
  }, []);

  // Auto-dismiss message
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchBets = async () => {
    try {
      const res = await fetch(`${API_URL}/bets`);
      const data = await res.json();
      setBets(data.bets || []);
    } catch (err) {
      console.error('Error fetching bets:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shareCode.trim()) {
      setMessage({ text: '⚠️ Please enter a share code', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage({ text: '🔄 Tracking bet...', type: 'loading' });

    try {
      const res = await fetch(`${API_URL}/track-bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode: shareCode.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ text: `✅ Bet tracked successfully!`, type: 'success' });
        setShareCode('');
        fetchBets();
      } else {
        setMessage({ text: `❌ ${data.error || 'Failed to track bet'}`, type: 'error' });
      }
    } catch {
      setMessage({ text: '❌ Network error. Check your connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewBet = async (id, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`${API_URL}/bets/${id}`);
      const data = await res.json();
      if (data.success) setSelectedBet(data.bet);
    } catch {
      setMessage({ text: '❌ Could not load bet details', type: 'error' });
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this bet?')) return;
    try {
      const res = await fetch(`${API_URL}/bets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: '✅ Bet deleted', type: 'success' });
        setSelectedBet(null);
        fetchBets();
      }
    } catch {
      setMessage({ text: '❌ Could not delete bet', type: 'error' });
    }
  };

  const fmt = (n) => `₦${parseFloat(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const getMsgStyle = () => {
    if (message.type === 'success') return { ...styles.message, ...styles.messageSuccess };
    if (message.type === 'error') return { ...styles.message, ...styles.messageError };
    return { ...styles.message, ...styles.messageLoading };
  };

  // Responsive grid columns: 1 col on mobile, 3 on desktop
  const statsGridStyle = {
    ...styles.statsGrid,
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
  };

  const modalStatsStyle = {
    ...styles.modalStatsRow,
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
  };

  // ── RENDER ──
  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>⚡ TrackIt</h1>
        <p style={styles.headerSub}>Real-time bet tracking</p>
      </div>

      <div style={styles.container}>
        {/* Live Match Tracker */}
        <LiveMatchTracker bets={bets} />

        {/* Input */}
        <div style={styles.inputCard}>
          <form onSubmit={handleSubmit}>
            <div style={styles.inputRow}>
              <input
                type="text"
                placeholder="Enter SportyBet share code..."
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={loading}
                style={{
                  ...styles.input,
                  ...(inputFocused ? styles.inputFocus : {}),
                  ...(loading ? { opacity: 0.5 } : {}),
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.trackBtn,
                  ...(loading ? styles.trackBtnDisabled : {}),
                }}
              >
                {loading ? '🔄 ...' : '+ Track'}
              </button>
            </div>
          </form>
        </div>

        {/* Message */}
        {message.text && <div style={getMsgStyle()}>{message.text}</div>}

        {/* Stats */}
        <div style={statsGridStyle}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#38bdf8' }}>{bets.length}</div>
            <div style={styles.statLabel}>Total Bets</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#4ade80' }}>
              {bets.reduce((sum, b) => sum + (parseFloat(b.stake) || 0), 0) > 0
                ? fmt(bets.reduce((sum, b) => sum + (parseFloat(b.stake) || 0), 0))
                : '₦0.00'}
            </div>
            <div style={styles.statLabel}>Total Staked</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#fb923c' }}>
              {bets.reduce((sum, b) => sum + (parseFloat(b.potential_win) || 0), 0) > 0
                ? fmt(bets.reduce((sum, b) => sum + (parseFloat(b.potential_win) || 0), 0))
                : '₦0.00'}
            </div>
            <div style={styles.statLabel}>Potential Win</div>
          </div>
        </div>

        {/* Bets List */}
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>📋 My Bets</h2>
          <span style={styles.betCount}>{bets.length} tracked</span>
        </div>

        {bets.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎯</div>
            <p style={styles.emptyText}>No bets tracked yet.<br />Enter a share code above to get started!</p>
          </div>
        ) : (
          bets.map((bet) => (
            <div
              key={bet.id}
              style={{
                ...styles.betCard,
                ...(hoveredBet === bet.id ? styles.betCardHover : {}),
              }}
              onMouseEnter={() => setHoveredBet(bet.id)}
              onMouseLeave={() => setHoveredBet(null)}
              onClick={(e) => handleViewBet(bet.id, e)}
            >
              <div style={styles.betCardTop}>
                <span style={styles.betCode}>{bet.share_code}</span>
                <span style={{ ...styles.statusBadge, ...styles.statusPending }}>Pending</span>
              </div>

              <div style={styles.betInfo}>
                <div style={styles.betInfoItem}>
                  <span style={styles.betInfoLabel}>Odds</span>
                  <span style={{ ...styles.betInfoValue, color: '#4ade80' }}>{bet.total_odds}x</span>
                </div>
                <div style={styles.betInfoItem}>
                  <span style={styles.betInfoLabel}>Stake</span>
                  <span style={{ ...styles.betInfoValue, color: '#f1f5f9' }}>{fmt(bet.stake)}</span>
                </div>
                <div style={styles.betInfoItem}>
                  <span style={styles.betInfoLabel}>Potential Win</span>
                  <span style={{ ...styles.betInfoValue, color: '#fb923c' }}>{fmt(bet.potential_win)}</span>
                </div>
              </div>

              <div style={styles.betActions}>
                <button style={styles.btnView} onClick={(e) => handleViewBet(bet.id, e)}>View</button>
                <button style={styles.btnDelete} onClick={(e) => handleDelete(bet.id, e)}>Delete</button>
              </div>

              <div style={styles.betTime}>
                🕐 {new Date(bet.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedBet && (
        <div style={styles.modalOverlay} onClick={() => setSelectedBet(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>📋 {selectedBet.share_code}</h2>
              <button style={styles.modalClose} onClick={() => setSelectedBet(null)}>✕</button>
            </div>

            {/* Modal Stats */}
            <div style={modalStatsStyle}>
              <div style={styles.modalStatCard}>
                <div style={{ ...styles.statValue, color: '#4ade80', fontSize: '20px' }}>{selectedBet.total_odds}x</div>
                <div style={styles.statLabel}>Total Odds</div>
              </div>
              <div style={styles.modalStatCard}>
                <div style={{ ...styles.statValue, color: '#f1f5f9', fontSize: '20px' }}>{fmt(selectedBet.stake)}</div>
                <div style={styles.statLabel}>Stake</div>
              </div>
              <div style={styles.modalStatCard}>
                <div style={{ ...styles.statValue, color: '#fb923c', fontSize: '20px' }}>{fmt(selectedBet.potential_win)}</div>
                <div style={styles.statLabel}>Potential Win</div>
              </div>
            </div>

            {/* Matches */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>
                ⚽ Matches ({selectedBet.matches?.length || 0})
              </h3>

              {selectedBet.matches?.length > 0 ? (
                selectedBet.matches.map((m, i) => (
                  <div key={i} style={styles.matchCard}>
                    <div style={styles.matchHeader}>
                      <span style={styles.matchTeams}>{m.home_team} <span style={{ color: '#475569' }}>vs</span> {m.away_team}</span>
                      <span style={styles.matchOddsBadge}>{m.odds}</span>
                    </div>
                    <div style={styles.matchMeta}>
                      <span style={styles.matchMetaItem}>🏆 <span style={styles.matchMetaHighlight}>{m.league}</span></span>
                      <span style={styles.matchMetaItem}>📊 {m.market_name}: <span style={styles.matchMetaHighlight}>{m.selection}</span></span>
                      <span style={styles.matchMetaItem}>🕐 {m.match_time ? new Date(m.match_time).toLocaleString() : 'TBD'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#475569', padding: '20px' }}>No matches found</p>
              )}
            </div>

            {/* Modal Delete */}
            <button
              onClick={(e) => handleDelete(selectedBet.id, e)}
              style={{
                ...styles.btnDelete,
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                marginTop: '8px',
              }}
            >
              🗑️ Delete this bet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;