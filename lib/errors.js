// Map Mongoose / MongoDB driver errors to an HTTP status and a safe summary.

const mongoose = require('mongoose')
const { redact } = require('./config')

class NotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'NotFoundError'
    }
}

class BadRequestError extends Error {
    constructor(message) {
        super(message)
        this.name = 'BadRequestError'
    }
}

const UNAVAILABLE = new Set([
    'MongooseServerSelectionError',
    'MongoServerSelectionError',
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoNotConnectedError',
    'MongoTopologyClosedError'
])

function statusFor(err) {
    if (err instanceof NotFoundError) return 404
    if (err instanceof BadRequestError) return 400
    if (err instanceof mongoose.Error.ValidationError) return 400
    if (err instanceof mongoose.Error.CastError) return 400
    if (UNAVAILABLE.has(err.name)) return 503
    // bufferCommands is off, so a query before connect fails fast with this
    if (err instanceof mongoose.Error && /before initial connection is complete/.test(err.message)) return 503
    if (err.code === 11000) return 409 // duplicate key
    if (err.code === 18) return 401 // AuthenticationFailed
    if (err.code === 13) return 403 // Unauthorized (missing role)
    return 500
}

function toErrorResult(err) {
    const error = {
        name: err.name || 'Error',
        message: redact(err.message || String(err))
    }
    if (err.code !== undefined) error.code = err.code
    if (err.codeName) error.codeName = err.codeName
    if (err instanceof mongoose.Error.ValidationError) {
        error.fields = Object.fromEntries(
            Object.entries(err.errors).map(([field, e]) => [field, e.message])
        )
    }
    return { status: statusFor(err), error }
}

module.exports = { NotFoundError, BadRequestError, statusFor, toErrorResult }
