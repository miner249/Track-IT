const fetch = require('node-fetch');
const BaseParser = require('./baseParser');

class SportyBetParser extends BaseParser {
  constructor() {
    super('SportyBet');
  }

  async fetchTicket(bookingCode) {
    const timestamp = Date.now();
    const url = `https://www.sportybet.com/api/ng/orders/share/${bookingCode}?_t=${timestamp}`;

    const response = await fetch(url, {
      headers: {
        Accept:          'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer:         'https://www.sportybet.com/',
        Origin:          'https://www.sportybet.com',
      },
    });

    if (!response.ok) {
      throw new Error(`SportyBet request failed: ${response.status}`);
    }

    const payload = await response.json();
    if (payload.code !== undefined && payload.code !== 0) {
      throw new Error(payload.msg || 'Invalid SportyBet booking code');
    }

    return payload.data || payload;
  }

  mapTicket(data = {}) {
    const outcomes   = data.outcomes  || [];
    const ticket     = data.ticket    || {};
    const selections = ticket.selections || [];

    let totalOdds = 1;

    const matches = outcomes.map((outcome, idx) => {
      const selectedOutcomeId    = selections[idx]?.outcomeId;
      const market               = outcome.markets?.[0] || {};
      const selectedMarketOutcome =
        market.outcomes?.find((item) => item.id === selectedOutcomeId) ||
        market.outcomes?.[0] || {};

      const odds = parseFloat(selectedMarketOutcome.odds) || 0;
      totalOdds *= odds;

      return this.normalizeSelection({
        match_id:    outcome.eventId,
        home_team:   outcome.homeTeamName,
        away_team:   outcome.awayTeamName,
        league:      outcome.sport?.category?.tournament?.name || 'Unknown',
        market_type: market.desc || market.name,
        market_name: market.desc || market.name,
        selection:   selectedMarketOutcome.desc || selectedMarketOutcome.name,
        odds,
        start_time:  outcome.estimateStartTime
          ? new Date(outcome.estimateStartTime).toISOString()
          : null,
        status:      outcome.matchStatus || 'pending',
      });
    });

    totalOdds = Math.round(totalOdds * 100) / 100;

    const stake        = parseFloat(data.stake || ticket.stake || data.stakeAmount || 0);
    const potentialWin = parseFloat(data.maxWinAmount || ticket.maxWinAmount || (stake * totalOdds) || 0);

    return {
      selections: matches,
      matches,
      totalOdds,
      stake,
      potentialWin,
      currency: 'NGN',
    };
  }

  async parse(bookingCode) {
    const data = await this.fetchTicket(bookingCode);
    return this.mapTicket(data);
  }
}

module.exports = SportyBetParser;