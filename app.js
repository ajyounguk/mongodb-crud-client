// MongoDB CRUD client
//
// createApp() builds the Express app around an injectable people repository,
// so tests can run it against a fake or an in-memory MongoDB. The server only
// connects and listens when this file is run directly.

const path = require('node:path')
const express = require('express')
const mongoose = require('mongoose')

const { loadConfig, describeUri, redact } = require('./lib/config')
const { createPeopleRepo } = require('./lib/people')
const { createResultStore } = require('./lib/results')
const { securityHeaders, sameOrigin } = require('./lib/security')
const personController = require('./controllers/personController')
const setupController = require('./controllers/setupController')

const STATE_NAMES = ['disconnected', 'connected', 'connecting', 'disconnecting']

function createApp({
    people = createPeopleRepo(),
    db = describeUri(loadConfig().uri),
    dbState = () => STATE_NAMES[mongoose.connection.readyState] || 'unknown',
    results = createResultStore()
} = {}) {
    const app = express()

    app.disable('x-powered-by')
    app.set('views', path.join(__dirname, 'views'))
    app.set('view engine', 'ejs')

    app.use(securityHeaders)
    app.use('/assets', express.static(path.join(__dirname, 'public')))
    app.use(express.urlencoded({ extended: false, limit: '10kb' }))
    app.use(sameOrigin)

    // shown in the header badge on every page
    app.use((req, res, next) => {
        res.locals.db = db
        res.locals.dbState = dbState()
        next()
    })

    app.use(personController({ people, results }))
    app.use(setupController({ people, results }))

    app.use((req, res) => {
        res.status(404).type('text/plain').send('Not found')
    })

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        console.error('unhandled error:', redact(err.stack || err))
        const status = err.status || err.statusCode || 500
        res.status(status).type('text/plain').send(status === 500 ? 'Internal server error' : err.message)
    })

    return app
}

// Connect with retry: the app stays up (showing 503s) while MongoDB is down
function connectWithRetry(uri, { delayMs = 5000 } = {}) {
    mongoose.set('bufferCommands', false) // fail fast instead of hanging requests
    mongoose.set('strictQuery', true)
    mongoose.set('sanitizeFilter', true)

    const attempt = () => mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
        .then(() => console.log('connected to MongoDB'))
        .catch(err => {
            console.error(`MongoDB connection failed (${err.name}: ${redact(err.message)}); retrying in ${delayMs / 1000}s`)
            setTimeout(attempt, delayMs).unref()
        })
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'))
    return attempt()
}

if (require.main === module) {
    const { uri, source } = loadConfig()
    const db = describeUri(uri)
    const host = process.env.HOST || '127.0.0.1'
    const port = Number(process.env.PORT) || 3000

    connectWithRetry(uri)
    const app = createApp({ db })
    const server = app.listen(port, host, () => {
        console.log(`MongoDB CRUD client on http://${host}:${port}`)
        console.log(`database: ${db.label}/${db.db} (${db.kind}, from ${source})`)
    })

    const shutdown = () => {
        server.close()
        mongoose.disconnect().finally(() => process.exit(0))
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
}

module.exports = { createApp, connectWithRetry }
