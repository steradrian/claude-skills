'use strict';

// Stand-in persistence layer. Every method returns a promise, as the real one does.
const db = {
  async increment(table, key, delta) {
    return { table, key, delta };
  },
  async insert(table, row) {
    return { table, row };
  },
};

module.exports = { db };
