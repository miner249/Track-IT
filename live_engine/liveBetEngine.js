/**
 * live_engine/liveBetEngine.js
 *
 * Polls live data every POLL_INTERVAL ms, correlates tracked bets with
 * live matches, and emits `live:update` events on the realtime bus so
 * the SSE /events endpoint can push them to connected clients.
 */

const POLL_INTERVAL = parseInt(process.env.LIVE_POLL_INTERVAL_MS) || 60_000; // 1 min default

class LiveBetEngine {
  /**
   * @param {{ realtime: EventEmitter, store: object, dataProvider: object, notifications: object }} opts
   */
  constructor({ realtime, store, dataProvider, notifications }) {
    this.realtime      = realtime;
    this.store         = store;
    this.dataProvider  = dataProvider;
    this.notifications = notifications;

    this._cachedLive   = { matches: [], source: 'none', fetchedAt: null };
    this._timer        = null;
    this._running      = false;
  }

  // ──────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────

  /** Called once during bootstrap to begin the polling loop. */
  start() {
    if (this._running) return;
    this._running = true;
    console.log(`🚀 [LiveBetEngine] Starting – polling every ${POLL_INTERVAL / 1000}s`);
    this._tick();   // immediate first tick
    this._timer = setInterval(() => this._tick(), POLL_INTERVAL);
  }

  /** Stop polling (useful for tests / graceful shutdown). */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
    console.log('🛑 [LiveBetEngine] Stopped');
  }

  /** Returns the last successful live snapshot (for fast cache responses). */
  getCachedLive() {
    return this._cachedLive;
  }

  // ──────────────────────────────────────────────────────────────
  // Internal polling logic
  // ──────────────────────────────────────────────────────────────

  async _tick() {
    try {
      console.log('🔄 [LiveBetEngine] Polling live data...');

      const snapshot = await this.dataProvider.fetchLiveSnapshot();
      this._cachedLive = snapshot;

      if (!snapshot.matches.length) {
        console.log('ℹ️  [LiveBetEngine] No live matches right now');
        return;
      }

      console.log(`✅ [LiveBetEngine] ${snapshot.matches.length} live match(es) from ${snapshot.source}`);

      // Emit full live snapshot to all SSE listeners
      this.realtime.emit('live:update', snapshot);

      // Correlate against tracked bets
      await this._correlateBets(snapshot.matches);

    } catch (error) {
      console.error('❌ [LiveBetEngine] Tick error:', error.message);
    }
  }

  /**
   * For each tracked bet that has live selections, try to find a matching
   * live match and attach the current score / status.
   */
  async _correlateBets(liveMatches) {
    const bets = await this.store.getBets();
    if (!bets.length) return;

    const normalize = (s = '') => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const bet of bets) {
      if (bet.status === 'settled') continue;

      const enrichedSelections = bet.selections.map((sel) => {
        const matchedLive = liveMatches.find((m) => {
          const mHome = normalize(m.home);
          const mAway = normalize(m.away);
          const sHome = normalize(sel.home_team);
          const sAway = normalize(sel.away_team);

          return (
            (mHome === sHome && mAway === sAway) ||
            (mHome.includes(sHome) && mAway.includes(sAway)) ||
            (sHome.includes(mHome) && sAway.includes(mAway))
          );
        });

        if (!matchedLive) return sel;

        return {
          ...sel,
          live: {
            homeScore: matchedLive.homeScore,
            awayScore: matchedLive.awayScore,
            status:    matchedLive.status,
            eventId:   matchedLive.eventId,
            source:    matchedLive.source,
          },
        };
      });

      const hasLive = enrichedSelections.some((s) => s.live);
      if (!hasLive) continue;

      // Emit per-bet update so clients tracking a specific bet get notified
      const update = { ...bet, selections: enrichedSelections };
      this.realtime.emit('bet:live-update', update);

      // Optionally notify subscribers
      try {
        const subs = await this.store.getSubscriptionsByBetId(bet.id);
        for (const sub of subs) {
          await this.notifications.send({
            channel: sub.channel,
            target:  sub.target,
            subject: `TrackIT – Live update for bet ${bet.id.slice(0, 8)}`,
            message: this._formatUpdateMessage(update),
          });
        }
      } catch (notifError) {
        console.warn(`⚠️  [LiveBetEngine] Notification error for bet ${bet.id}:`, notifError.message);
      }
    }
  }

  _formatUpdateMessage(bet) {
    const lines = bet.selections
      .filter((s) => s.live)
      .map((s) => `  ${s.home_team} vs ${s.away_team}: ${s.live.homeScore ?? '?'}-${s.live.awayScore ?? '?'} (${s.live.status})`);

    return [`Bet ID: ${bet.id}`, 'Live scores:', ...lines].join('\n');
  }
}

module.exports = LiveBetEngine;
