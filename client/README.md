# ⚡ TRACK IT

> A modern SportyBet betting tracker with real-time match updates



---

## 🎯 What It Does

Track your SportyBet bets, monitor live matches in real-time, and view today's football schedule—all in one clean interface.

---

## ⚡ Quick Start

```bash
# Install
npm install

# Run
npm run dev

# Build
npm run build
```

---

## 🎨 Features

✅ **Track Bets** - Add SportyBet share codes and monitor your slips  
🔴 **Live Updates** - Real-time scores for your tracked bets  
📅 **Match Schedule** - View today's fixtures and results  
📱 **Mobile Ready** - Responsive design that works everywhere  

---

## 📁 File Structure

```
src/
├── components/
│   ├── Navbar.jsx
│   ├── MyLiveBets.jsx
│   └── ScheduledMatches.jsx
├── styles/
│   ├── design.css        # Design system
│   └── *.css             # Component styles
├── App.jsx
└── main.jsx
```

---

## 🔌 API Endpoints Required

Your backend needs:

```
GET    /bets              # All tracked bets
POST   /track-bet         # Add new bet
GET    /bets/:id          # Bet details
DELETE /bets/:id          # Remove bet
GET    /api/live-matches           # Live matches
GET    /api/tracked-live-matches   # User's live bets
GET    /api/today-matches          # Today's schedule
```

---

## 🎨 Design

- **Colors**: White (#FFFFFF), Royal Blue (#0052CC), Green (#16A34A)
- **Font**: Inter
- **Style**: Clean, modern, minimal

---

## 📱 Mobile First

Optimized for all screen sizes with responsive breakpoints at 768px and 480px.

---

## 🚀 Tech Stack

React 18 • Vite • Vanilla CSS • REST API

---

## 📄 License

MIT © 2024

---

## 🤝 Contributing

PRs welcome! Fork, create a feature branch, and submit.

---

⭐ **Star this repo if you find it useful!**