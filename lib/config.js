// Connection config loading and description.
//
// Precedence: MONGODB_URI env var > config/mongo-config.json > local default.
// The URI can hold a password, so it is never logged or rendered; use
// describeUri() for anything user-facing.

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/crud-demo'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function loadConfig({ env = process.env, configDir = path.join(__dirname, '..', 'config') } = {}) {
    if (env.MONGODB_URI) {
        return { uri: env.MONGODB_URI, source: 'env:MONGODB_URI' }
    }

    const file = path.join(configDir, 'mongo-config.json')
    if (fs.existsSync(file)) {
        let parsed
        try {
            parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
        } catch (err) {
            throw new Error(`config/mongo-config.json is not valid JSON (${err.message})`)
        }
        // "mongourl" is the original key; "uri" is accepted as well
        const uri = parsed.uri || parsed.mongourl
        if (!uri) throw new Error('config/mongo-config.json has no "mongourl" (or "uri") value')
        return { uri, source: 'config/mongo-config.json' }
    }

    return { uri: DEFAULT_URI, source: 'default' }
}

// Summarise a connection string without credentials:
// kind is 'local' (loopback), 'atlas' (mongodb+srv or *.mongodb.net) or 'custom'.
function describeUri(uri) {
    const match = /^(mongodb(?:\+srv)?):\/\/(?:[^@/]*@)?([^/?]+)(?:\/([^?]*))?/.exec(uri || '')
    if (!match) return { kind: 'custom', hosts: [], db: '', label: 'unrecognised URI' }

    const [, scheme, hostPart, db] = match
    const hosts = hostPart.split(',').map(h => h.replace(/:\d+$/, '').toLowerCase())
    let kind = 'custom'
    if (hosts.every(h => LOCAL_HOSTS.has(h))) kind = 'local'
    else if (scheme === 'mongodb+srv' || hosts.some(h => h.endsWith('.mongodb.net'))) kind = 'atlas'

    return {
        kind,
        hosts,
        db: decodeURIComponent(db || 'test'),
        label: hostPart.replace(/^.*@/, '')
    }
}

// Remove user:password from any mongodb:// URIs embedded in text
function redact(text) {
    return String(text).replace(/(mongodb(?:\+srv)?:\/\/)[^@/\s]+@/gi, '$1***@')
}

module.exports = { loadConfig, describeUri, redact, DEFAULT_URI }
