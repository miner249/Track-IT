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

// Track bet endpoint
app.post('/track-bet', async (req, res) => {
  const { shareCode } = req.body;

  if (!shareCode) {
    return res.json({ success: false, error: 'Share code is required' });
  }

  console.log(`\n🔍 [SERVER] Fetching bet: ${shareCode}`);

  try {
    const timestamp = Date.now();
    const sportyUrl = `https://www.sportybet.com/api/ng/orders/share/${shareCode.trim()}?_t=${timestamp}`;

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

    if (sportyData.code !== undefined && sportyData.code !== 0) {
      return res.json({ success: false, error: sportyData.msg || 'Invalid share code' });
    }

    const betData = sportyData.data || sportyData;

    if (!betData) {
      return res.json({ success: false, error: 'No bet data found' });
    }

    // Log the TOP-LEVEL keys to find where stake/totalOdds/win might be
    console.log(`📦 [SERVER] Top-level keys:`, Object.keys(betData));
    console.log(`📦 [SERVER] ticket keys:`, Object.keys(betData.ticket || {}));

    const ticket = betData.ticket || {};
    const outcomes = betData.outcomes || [];

    // --- EXTRACT ODDS FROM EACH OUTCOME ---
    // Each outcome has: markets[0].outcomes[0].odds  (the selected outcome's odds)
    // ticket.selections tells us which outcomeId was picked per match
    // We multiply all odds together to get totalOdds
    let totalOdds = 1;
    const parsedMatches = [];

    outcomes.forEach((outcome, index) => {
      // Find the selected outcomeId from ticket.selections
      const selection = ticket.selections ? ticket.selections[index] : null;
      const selectedOutcomeId = selection ? selection.outcomeId : null;

      // Find the matching market and outcome odds
      let matchOdds = 0;
      let marketName = 'N/A';
      let selectionName = 'N/A';

      if (outcome.markets && outcome.markets.length > 0) {
        const market = outcome.markets[0];
        marketName = market.desc || market.name || 'N/A';

        if (market.outcomes && market.outcomes.length > 0) {
          // Find the outcome that matches the selected outcomeId
          const selectedOutcome = market.outcomes.find(o => o.id === selectedOutcomeId) || market.outcomes[0];
          matchOdds = parseFloat(selectedOutcome.odds) || 0;
          selectionName = selectedOutcome.desc || selectedOutcome.name || 'N/A';
        }
      }

      totalOdds *= matchOdds;

      // League: sport.category.tournament.name
      const league = outcome.sport?.category?.tournament?.name || 'Unknown';

      parsedMatches.push({
        match_id: outcome.eventId || 'N/A',
        home_team: outcome.homeTeamName || 'Unknown',
        away_team: outcome.awayTeamName || 'Unknown',
        league: league,
        match_time: outcome.estimateStartTime ? new Date(outcome.estimateStartTime).toISOString() : null,
        selection: selectionName,
        odds: matchOdds,
        market_name: marketName,
        status: outcome.matchStatus || 'pending'
      });
    });

    // Round totalOdds to 2 decimal places
    totalOdds = Math.round(totalOdds * 100) / 100;

    // Stake and potential win — check if they exist anywhere in the response
    // If not, we set stake to 0 and calculate potential win from totalOdds
    const stake = betData.stake || ticket.stake || betData.stakeAmount || 0;
    const potentialWin = betData.maxWinAmount || ticket.maxWinAmount || (stake * totalOdds) || 0;

    console.log(`💰 [SERVER] Total Odds: ${totalOdds} | Stake: ${stake} | Potential Win: ${potentialWin}`);
    console.log(`⚽ [SERVER] Matches:`, JSON.stringify(parsedMatches, null, 2));

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

        if (parsedMatches.length === 0) {
          return res.json({ success: true, message: 'Bet tracked (no matches)', betId });
        }

        // --- SAVE MATCHES ---
        let processed = 0;

        parsedMatches.forEach((match) => {
          db.run(
            `INSERT INTO matches (bet_id, match_id, home_team, away_team, league, match_time, selection, odds, market_name, outcome)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              betId,
              match.match_id,
              match.home_team,
              match.away_team,
              match.league,
              match.match_time,
              match.selection,
              match.odds,
              match.market_name,
              match.status
            ],
            (err) => {
              if (err) console.error(`❌ [SERVER] Error inserting match:`, err);
              processed++;

              if (processed === parsedMatches.length) {
                console.log(`🎉 [SERVER] Done! ${parsedMatches.length} match(es) saved\n`);
                res.json({ success: true, message: 'Bet tracked successfully', betId, matchCount: parsedMatches.length });
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