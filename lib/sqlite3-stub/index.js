// Stub for sqlite3 — the Cursor SDK imports it eagerly but only uses it
// for local agent persistence. We only use cloud agents, so this is never called.
const MSG = "sqlite3 is stubbed out — only cloud agents are supported in this deployment";

class Database {
  constructor() { throw new Error(MSG); }
}

class Statement {
  constructor() { throw new Error(MSG); }
}

module.exports = { Database, Statement, OPEN_READONLY: 1, OPEN_READWRITE: 2, OPEN_CREATE: 4, verbose: () => module.exports };
