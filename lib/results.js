// Short-lived store for POST results, so a POST can 303-redirect to a GET
// that shows the outcome (post/redirect/get). Each result is read once.

const crypto = require('node:crypto')

function createResultStore({ max = 200, ttlMs = 10 * 60 * 1000, now = Date.now } = {}) {
    const results = new Map()

    function prune() {
        const cutoff = now() - ttlMs
        for (const [id, entry] of results) {
            if (entry.at < cutoff || results.size > max) results.delete(id)
            else break // Map keeps insertion order, so the rest are newer
        }
    }

    return {
        put(result) {
            prune()
            const id = crypto.randomUUID()
            results.set(id, { at: now(), result })
            return id
        },
        take(id) {
            const entry = results.get(id)
            if (!entry) return null
            results.delete(id)
            return now() - entry.at > ttlMs ? null : entry.result
        },
        get size() {
            return results.size
        }
    }
}

module.exports = { createResultStore }
