const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Disable caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Initialize SQLite Database
const db = new sqlite3.Database('./trackit.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Create tables
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      share_code TEXT UNIQUE,
      total_odds REAL,
      stake REAL,
      potential_win REAL,
      currency TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      raw_data TEXT
    )
  `, (err) => {
    if (err) console.error('Error creating bets table:', err);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bet_id INTEGER,
      match_id TEXT,
      home_team TEXT,
      away_team TEXT,
      league TEXT,
      match_time DATETIME,
      selection TEXT,
      odds REAL,
      market_name TEXT,
      outcome TEXT,
      FOREIGN KEY (bet_id) REFERENCES bets(id)
    )
  `, (err) => {
    if (err) console.error('Error creating matches table:', err);
  });
}

// Track bet endpoint - fetches from Sportybet AND saves to DB
app.post('/track-bet', async (req, res) => {
  const { shareCode } = req.body;

  if (!shareCode) {
    return res.json({ success: false, error: 'Share code is required' });
  }

  console.log(`\n🔍 [SERVER] Fetching bet: ${shareCode}`);

  try {
    const timestamp = Date.now();
    const sportyUrl = `https://www.sportybet.com/api/ng/orders/share/${shareCode.trim()}?_t=${timestamp}`;

    console.log(`📡 [SERVER] Calling: ${sportyUrl}`);

    const sportyResponse = await fetch(sportyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.sportybet.com/',
        'Origin': 'https://www.sportybet.com'
      }
    });

    if (!sportyResponse.ok) {
      return res.json({ success: false, error: `Failed to fetch bet (Status: ${sportyResponse.status})` });
    }

    const sportyData = await sportyResponse.json();

    // Check for error code if it exists
    if (sportyData.code !== undefined && sportyData.code !== 0) {
      return res.json({ success: false, error: sportyData.msg || 'Invalid share code' });
    }

    // Data is either in sportyData.data or sportyData itself
    const betData = sportyData.data || sportyData;

    if (!betData) {
      return res.json({ success: false, error: 'No bet data found' });
    }

    // --- EXTRACT BET INFO FROM ticket ---
    const ticket = betData.ticket || {};
    const outcomes = betData.outcomes || [];

    console.log(`🎫 [SERVER] Ticket:`, JSON.stringify(ticket));
    console.log(`🎯 [SERVER] Outcomes count: ${outcomes.length}`);
    if (outcomes.length > 0) {
      console.log(`🎯 [SERVER] First outcome sample:`, JSON.stringify(outcomes[0]));
    }

    const totalOdds = ticket.totalOdds || ticket.odds || 0;
    const stake = ticket.stake || ticket.stakeAmount || 0;
    const potentialWin = ticket.maxWinAmount || ticket.potentialWin || ticket.winAmount || 0;

    console.log(`💰 [SERVER] Odds: ${totalOdds} | Stake: ${stake} | Win: ${potentialWin}`);

    // --- SAVE BET ---
    db.run(
      `INSERT OR REPLACE INTO bets (share_code, total_odds, stake, potential_win, currency, raw_data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [shareCode.trim(), totalOdds, stake, potentialWin, 'NGN', JSON.stringify(betData)],
      function(err) {
        if (err) {
          console.error('❌ [SERVER] Error inserting bet:', err);
          return res.json({ success: false, error: 'Database error saving bet' });
        }

        const betId = this.lastID;
        console.log(`✅ [SERVER] Bet saved, ID: ${betId}`);

        // --- SAVE MATCHES ---
        if (outcomes.length === 0) {
          return res.json({ success: true, message: 'Bet tracked (no matches)', betId });
        }

        let processed = 0;

        outcomes.forEach((outcome) => {
          // Each outcome has: event {}, market {}, odds, outcomeAlias, etc.
          const event = outcome.event || {};
          const market = outcome.market || {};

          db.run(
            `INSERT INTO matches (bet_id, match_id, home_team, away_team, league, match_time, selection, odds, market_name, outcome)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              betId,
              event.id || outcome.eventId || 'N/A',
              event.homeName || 'Unknown',
              event.awayName || 'Unknown',
              event.leagueName || event.sportName || 'Unknown League',
              event.matchTime || event.startTime || null,
              outcome.outcomeAlias || outcome.selectionName || 'N/A',
              outcome.odds || 0,
              market.name || market.marketName || 'N/A',
              outcome.status || 'pending'
            ],
            (err) => {
              if (err) console.error(`❌ [SERVER] Error inserting match:`, err);
              processed++;

              if (processed === outcomes.length) {
                console.log(`🎉 [SERVER] Done! ${outcomes.length} match(es) saved\n`);
                res.json({ success: true, message: 'Bet tracked successfully', betId, matchCount: outcomes.length });
              }
            }
          );
        });
      }
    );

  } catch (error) {
    console.error('❌ [SERVER] Error:', error);
    return res.json({ success: false, error: error.message || 'Server error' });
  }
});

// Get all bets
app.get('/bets', (req, res) => {
  db.all('SELECT * FROM bets ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.json({ success: false, error: err.message, bets: [] });
    res.json({ success: true, bets: rows });
  });
});

// Get a specific bet with its matches
app.get('/bets/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM bets WHERE id = ?', [id], (err, bet) => {
    if (err) return res.json({ success: false, error: err.message });
    if (!bet) return res.json({ success: false, error: 'Bet not found' });

    db.all('SELECT * FROM matches WHERE bet_id = ?', [id], (err, matches) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, bet: { ...bet, matches } });
    });
  });
});

// Delete a bet and its matches
app.delete('/bets/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM matches WHERE bet_id = ?', [id], (err) => {
    if (err) return res.json({ success: false, error: 'Error deleting matches' });

    db.run('DELETE FROM bets WHERE id = ?', [id], function(err) {
      if (err) return res.json({ success: false, error: 'Error deleting bet' });
      if (this.changes === 0) return res.json({ success: false, error: 'Bet not found' });
      res.json({ success: true, message: 'Bet deleted successfully' });
    });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Track It API is running' });
});

// Serve React frontend
const buildPath = path.join(__dirname, 'client', 'dist');

if (fs.existsSync(buildPath)) {
  console.log('✅ Found client build directory');
  app.use(express.static(buildPath));

  app.use((req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.warn('⚠️  Client build directory not found at:', buildPath);

  app.use((req, res) => {
    res.json({ error: 'Frontend not built. Run: npm run build', buildPath });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Track It running on http://localhost:${PORT}`);
  console.log(`📊 Database: trackit.db`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close(() => process.exit(0));
});