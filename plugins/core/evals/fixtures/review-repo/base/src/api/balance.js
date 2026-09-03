'use strict';

const { db } = require('./db');

async function updateBalance(userId, deltaCents) {
  return db.increment('balances', userId, deltaCents);
}

module.exports = { updateBalance };
