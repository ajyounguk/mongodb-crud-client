const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

const { toErrorResult, NotFoundError, BadRequestError } = require('../lib/errors')
const { createResultStore } = require('../lib/results')
const { runAction } = require('../lib/run')

const named = (name, props = {}) => Object.assign(new Error('boom'), { name }, props)

describe('toErrorResult', () => {
    const cases = [
        [new NotFoundError('x'), 404],
        [new BadRequestError('x'), 400],
        [new mongoose.Error.ValidationError(), 400],
        [new mongoose.Error.CastError('ObjectId', 'zz', '_id'), 400],
        [named('MongooseServerSelectionError'), 503],
        [named('MongoNetworkError'), 503],
        [named('MongoNotConnectedError'), 503],
        [new mongoose.Error('Cannot call `people.find()` before initial connection is complete if `bufferCommands = false`.'), 503],
        [named('MongoServerError', { code: 11000, codeName: 'DuplicateKey' }), 409],
        [named('MongoServerError', { code: 18, codeName: 'AuthenticationFailed' }), 401],
        [named('MongoServerError', { code: 13, codeName: 'Unauthorized' }), 403],
        [new Error('anything else'), 500]
    ]
    for (const [err, status] of cases) {
        it(`maps ${err.name}${err.code ? ` (${err.code})` : ''} to ${status}`, () => {
            assert.equal(toErrorResult(err).status, status)
        })
    }

    it('includes name, message, code and codeName', () => {
        const { error } = toErrorResult(named('MongoServerError', { code: 13, codeName: 'Unauthorized' }))
        assert.deepEqual(error, { name: 'MongoServerError', message: 'boom', code: 13, codeName: 'Unauthorized' })
    })
})

describe('runAction', () => {
    it('packages success with timing and a request id', async () => {
        const r = await runAction('create', 201, async () => ({ a: 1 }))
        assert.equal(r.status, 201)
        assert.equal(r.ok, true)
        assert.deepEqual(r.data, { a: 1 })
        assert.match(r.requestId, /^[0-9a-f-]{36}$/)
        assert.equal(typeof r.durationMs, 'number')
    })

    it('packages failure without throwing', async () => {
        const r = await runAction('read', 200, async () => { throw new NotFoundError('gone') })
        assert.equal(r.status, 404)
        assert.equal(r.ok, false)
        assert.equal(r.error.message, 'gone')
    })
})

describe('result store', () => {
    it('returns a result once', () => {
        const store = createResultStore()
        const id = store.put({ x: 1 })
        assert.deepEqual(store.take(id), { x: 1 })
        assert.equal(store.take(id), null)
    })

    it('expires old results and caps its size', () => {
        let t = 0
        const store = createResultStore({ max: 3, ttlMs: 100, now: () => t })
        const old = store.put(1)
        t = 200
        assert.equal(store.take(old), null)
        for (let i = 0; i < 10; i++) store.put(i)
        assert.ok(store.size <= 4)
    })
})
