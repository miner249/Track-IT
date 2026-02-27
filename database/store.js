/**
 * database/store.js
 * In-memory store. Swap `createStore()` for the PostgreSQL adapter in production.
 * See database/postgres.schema.sql for the production schema.
 */

const { v4: uuidv4 } = require('uuid');

function createStore() {
  const bets = [];
  const eventLogs = [];

  return {
    // ──────────────────────────────────────────────────────────
    // Lifecycle
    // ──────────────────────────────────────────────────────────
    async init() {
      console.log('✅ [Store] In-memory store initialised');
    },

    // ──────────────────────────────────────────────────────────
    // Bets
    // ──────────────────────────────────────────────────────────
    async insertBet({ bookingCode, platform, selections }) {
      const bet = {
        id: uuidv4(),
        bookingCode,
        platform,
        selections,
        status: 'pending',   // pending | live | settled
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      bets.push(bet);
      return bet;
    },

    async getBets() {
      return [...bets].reverse();   // newest first
    },

    async getBetById(id) {
      return bets.find((b) => b.id === id) || null;
    },

    async updateBetStatus(id, status) {
      const bet = bets.find((b) => b.id === id);
      if (!bet) return null;
      bet.status = status;
      bet.updatedAt = new Date().toISOString();
      return bet;
    },

    // ──────────────────────────────────────────────────────────
    // Subscriptions
    // ──────────────────────────────────────────────────────────
    async getSubscriptionsByBetId(betId) {
      return eventLogs
        .filter((e) => e.event_type === 'subscription_created' && e.payload?.betId === betId)
        .map((e) => e.payload);
    },

    // ──────────────────────────────────────────────────────────
    // Event log (audit trail)
    // ──────────────────────────────────────────────────────────
    async addEventLog({ event_type, payload }) {
      const entry = {
        id: uuidv4(),
        event_type,
        payload,
        createdAt: new Date().toISOString(),
      };
      eventLogs.push(entry);
      return entry;
    },

    async getEventLogs() {
      return [...eventLogs].reverse();
    },
  };
}

module.exports = { createStore };
