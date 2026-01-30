const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // IMPORTANT: Allows frontend to connect

// Environment variable for port
const PORT = process.env.PORT || 3000;

// Initialize SQLite Database
const db = new sqlite3.Database('./bets.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        
        // Create bets table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS bets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bet_code TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            } else {
                console.log('Bets table ready');
            }
        });
    }
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Hey, I built this API. Hope it works!' });
});

// GET all bets
app.get('/bets', (req, res) => {
    db.all('SELECT * FROM bets ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching bets:', err);
            return res.status(500).json({ error: 'Failed to fetch bets' });
        }
        res.json({ bets: rows });
    });
});

// POST new bet (track bet)
app.post('/track-bet', (req, res) => {
    const { betCode } = req.body;
    
    if (!betCode || !betCode.trim()) {
        return res.status(400).json({ 
            success: false, 
            error: 'Bet code is required' 
        });
    }
    
    db.run(
        'INSERT INTO bets (bet_code) VALUES (?)', 
        [betCode.trim()], 
        function(err) {
            if (err) {
                console.error('Error saving bet:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to save bet' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Bet tracked successfully!',
                betId: this.lastID 
            });
        }
    );
});

// DELETE a bet (optional - for later)
app.delete('/bets/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM bets WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting bet:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to delete bet' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Bet deleted successfully',
            deletedId: id 
        });
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});