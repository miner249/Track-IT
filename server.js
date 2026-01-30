const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./sportybet.db', (err) => {
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

// Route to track a new bet
app.post('/track-bet', async (req, res) => {
  const { shareCode } = req.body;

  if (!shareCode) {
    return res.json({ success: false, error: 'Share code is required' });
  }

  console.log(`\n🔍 Attempting to track bet: ${shareCode}`);
  
  const timestamp = Date.now();
  const apiUrl = `https://www.sportybet.com/api/ng/orders/share/${shareCode}?_t=${timestamp}`;

  try {
    console.log(`📡 Calling Sportybet API...`);
    
    // Fetch data from Sportybet API with more headers
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.sportybet.com/',
        'Origin': 'https://www.sportybet.com',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      },
      timeout: 15000 // 15 second timeout
    });

    console.log(`✅ Response received! Status: ${response.status}`);
    console.log(`📦 Response code: ${response.data?.code}`);

    const data = response.data;

    // Log the full response for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Full API Response:', JSON.stringify(data, null, 2));
    }

    // Check if response is valid
    if (!data) {
      console.log('❌ No data in response');
      return res.json({ 
        success: false,
        error: 'No data received from Sportybet API'
      });
    }

    if (data.code !== 0) {
      console.log(`❌ Invalid response code: ${data.code}`);
      console.log(`Message: ${data.msg || 'No message'}`);
      
      return res.json({ 
        success: false,
        error: data.msg || 'Invalid share code or bet not found. The bet may be expired or deleted.'
      });
    }

    if (!data.data) {
      console.log('❌ No bet data in response');
      return res.json({ 
        success: false,
        error: 'Bet data not found. The share code may be invalid.'
      });
    }

    const betData = data.data;
    console.log(`✅ Bet found! Odds: ${betData.totalOdds || betData.odds}, Stake: ${betData.stake}`);

    // Save to database
    const betInsert = `
      INSERT OR REPLACE INTO bets (share_code, total_odds, stake, potential_win, currency, raw_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      betInsert,
      [
        shareCode,
        betData.totalOdds || betData.odds,
        betData.stake,
        betData.maxWinAmount || betData.potentialWin,
        betData.currencyCode || 'NGN',
        JSON.stringify(betData)
      ],
      function(err) {
        if (err) {
          console.error('❌ Error inserting bet:', err);
          return res.json({ success: false, error: 'Database error' });
        }

        const betId = this.lastID;
        console.log(`💾 Bet saved with ID: ${betId}`);

        // Parse and save matches
        const outcomes = betData.outcomes || [];
        
        if (outcomes.length === 0) {
          console.log('⚠️ No outcomes/matches found in bet');
          return res.json({
            success: true,
            message: 'Bet tracked successfully (no matches)',
            betId
          });
        }

        console.log(`📋 Processing ${outcomes.length} matches...`);
        let processedMatches = 0;

        outcomes.forEach((outcome, index) => {
          const matchInsert = `
            INSERT INTO matches (
              bet_id, match_id, home_team, away_team, league, 
              match_time, selection, odds, market_name, outcome
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(
            matchInsert,
            [
              betId,
              outcome.eventId || outcome.matchId,
              outcome.homeName || outcome.homeTeam,
              outcome.awayName || outcome.awayTeam,
              outcome.sportName || outcome.league,
              outcome.matchTime || outcome.startTime,
              outcome.outcomeAlias || outcome.selection,
              outcome.odds,
              outcome.marketName,
              outcome.outcome || 'pending'
            ],
            (err) => {
              if (err) {
                console.error(`❌ Error inserting match ${index + 1}:`, err);
              } else {
                console.log(`✅ Match ${index + 1} saved`);
              }

              processedMatches++;

              // Send response after all matches are processed
              if (processedMatches === outcomes.length) {
                console.log(`🎉 All matches processed successfully!\n`);
                res.json({
                  success: true,
                  message: 'Bet tracked successfully',
                  betId,
                  matchCount: outcomes.length
                });
              }
            }
          );
        });
      }
    );

  } catch (error) {
    console.error('❌ Error fetching Sportybet data:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      return res.json({ 
        success: false,
        error: `Sportybet API error (${error.response.status}). The share code may be invalid or expired.`
      });
    } else if (error.request) {
      console.error('No response received from Sportybet');
      return res.json({ 
        success: false,
        error: 'Could not reach Sportybet API. Please try again later.'
      });
    } else {
      console.error('Request setup error:', error.message);
      return res.json({ 
        success: false,
        error: 'Failed to fetch bet data. Please check the share code and try again.'
      });
    }
  }
});

// Route to get all bets
app.get('/bets', (req, res) => {
  db.all('SELECT * FROM bets ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.json({ success: false, error: err.message, bets: [] });
    }
    res.json({ success: true, bets: rows });
  });
});

// Route to get a specific bet with matches
app.get('/bets/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM bets WHERE id = ?', [id], (err, bet) => {
    if (err) {
      return res.json({ success: false, error: err.message });
    }
    if (!bet) {
      return res.json({ success: false, error: 'Bet not found' });
    }

    db.all('SELECT * FROM matches WHERE bet_id = ?', [id], (err, matches) => {
      if (err) {
        return res.json({ success: false, error: err.message });
      }
      res.json({ success: true, bet: { ...bet, matches } });
    });
  });
});

// Route to delete a bet
app.delete('/bets/:id', (req, res) => {
  const { id } = req.params;

  // First delete associated matches
  db.run('DELETE FROM matches WHERE bet_id = ?', [id], (err) => {
    if (err) {
      return res.json({ success: false, error: 'Error deleting matches' });
    }

    // Then delete the bet
    db.run('DELETE FROM bets WHERE id = ?', [id], function(err) {
      if (err) {
        return res.json({ success: false, error: 'Error deleting bet' });
      }
      
      if (this.changes === 0) {
        return res.json({ success: false, error: 'Bet not found' });
      }

      res.json({ success: true, message: 'Bet deleted successfully' });
    });
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sportybet Tracker API is running' });
});

// Serve static files from the React app (AFTER all API routes)
const buildPath = path.join(__dirname, 'dist'); // Change to 'build' if using Create React App
app.use(express.static(buildPath));

// The "catchall" handler: for any request that doesn't match API routes,
// send back the React app's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Database: sportybet.db`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});