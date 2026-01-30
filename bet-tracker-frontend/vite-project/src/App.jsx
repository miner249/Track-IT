import { useState, useEffect } from 'react';

function App() {
  const [betCode, setBetCode] = useState('');
  const [message, setMessage] = useState('');
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load bets when app starts
  useEffect(() => {
    fetchBets();
  }, []);

  // Fetch all bets from backend
  const fetchBets = async () => {
    try {
      const response = await fetch('http://localhost:3000/bets');
      const data = await response.json();
      setBets(data.bets || []);
    } catch (error) {
      console.error('Error fetching bets:', error);
      setMessage('⚠️ Could not load bets');
    }
  };

  // Submit new bet
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!betCode.trim()) {
      setMessage('⚠️ Please enter a bet code');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/track-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betCode: betCode.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Bet tracked: ${betCode}`);
        setBetCode(''); // Clear input
        fetchBets(); // Refresh the list
      } else {
        setMessage(`❌ ${data.error || 'Error tracking bet'}`);
      }
      
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Could not connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // Delete a bet
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bet?')) return;

    try {
      const response = await fetch(`http://localhost:3000/bets/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Bet deleted');
        fetchBets(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting bet:', error);
      setMessage('❌ Could not delete bet');
    }
  };

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '600px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center' }}>⚽ Bet Tracker</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>
        Track your bets in real-time
      </p>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text"
            placeholder="Enter bet code (e.g., ABC123)"
            value={betCode}
            onChange={(e) => setBetCode(e.target.value)}
            disabled={loading}
            style={{ 
              padding: '12px', 
              flex: 1,
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
          <button 
            type="submit"
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '...' : 'Track'}
          </button>
        </div>
      </form>

      {/* Message */}
      {message && (
        <p style={{ 
          padding: '12px', 
          backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee', 
          color: message.includes('✅') ? '#2e7d32' : '#c62828',
          borderRadius: '6px',
          marginBottom: '20px',
          fontWeight: '500'
        }}>
          {message}
        </p>
      )}

      {/* Bets List */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          📋 Tracked Bets ({bets.length})
        </h2>
        
        {bets.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
            No bets tracked yet. Add one above! 👆
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {bets.map(bet => (
              <li 
                key={bet.id} 
                style={{ 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  marginBottom: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '18px', color: '#333' }}>
                    {bet.bet_code}
                  </strong>
                  <br />
                  <small style={{ color: '#666' }}>
                    Added: {new Date(bet.created_at).toLocaleString()}
                  </small>
                </div>
                <button
                  onClick={() => handleDelete(bet.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;