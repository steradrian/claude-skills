'use strict';

const { db } = require('./db');

async function recordAudit(row) {
  return db.insert('audit_log', row);
}

module.exports = { recordAudit };
