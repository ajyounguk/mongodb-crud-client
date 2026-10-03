// Run one repository call and package the outcome for the response panel.
// Never throws: errors become { status, error } with the real HTTP status.

const crypto = require('node:crypto')
const { toErrorResult } = require('./errors')

async function runAction(action, okStatus, fn) {
    const started = process.hrtime.bigint()
    const base = { action, requestId: crypto.randomUUID(), at: new Date().toISOString() }
    let outcome
    try {
        outcome = { status: okStatus, data: await fn() }
    } catch (err) {
        outcome = toErrorResult(err)
    }
    const durationMs = Number((process.hrtime.bigint() - started) / 1000000n)
    return { ...base, ...outcome, ok: outcome.status < 400, durationMs }
}

module.exports = { runAction }
