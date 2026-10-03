// Repository tests against a throwaway mongod (mongodb-memory-server),
// bound to 127.0.0.1 on a random port and deleted afterwards.

const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const request = require('supertest')

const { createPeopleRepo, SEED_PEOPLE } = require('../lib/people')
const { createApp } = require('../app')
const Person = require('../models/personModel')

let mongod
const people = createPeopleRepo(Person)

before(async () => {
    mongod = await MongoMemoryServer.create()
    mongoose.set('bufferCommands', false)
    mongoose.set('sanitizeFilter', true)
    await mongoose.connect(mongod.getUri('crud-test'))
    await Person.init()
})

after(async () => {
    await mongoose.disconnect()
    await mongod.stop()
})

beforeEach(() => Person.deleteMany({}))

const bob = { firstname: 'Bob', surname: 'Example', telephone: '07700 900456' }

describe('people repository', () => {
    it('creates and reads a person, without __v', async () => {
        const created = await people.create(bob)
        assert.equal(created.firstname, 'Bob')
        assert.equal(created.__v, undefined)
        const got = await people.get(String(created._id))
        assert.equal(got.telephone, '07700 900456')
    })

    it('keeps leading zeros and trims input', async () => {
        const created = await people.create({ firstname: '  Ann ', surname: 'Lee', telephone: '0123 456' })
        assert.equal(created.firstname, 'Ann')
        assert.equal(created.telephone, '0123 456')
    })

    it('rejects missing and invalid fields', async () => {
        await assert.rejects(people.create({ firstname: 'a' }), { name: 'ValidationError' })
        await assert.rejects(people.create({ ...bob, telephone: 'call me' }), { name: 'ValidationError' })
    })

    it('ignores unknown fields and operator objects', async () => {
        const created = await people.create({ ...bob, admin: true, _id: 'x' })
        assert.equal(created.admin, undefined)
        assert.notEqual(String(created._id), 'x')
        const injected = await people.create({ firstname: { $gt: '' }, surname: 's', telephone: '123' })
        assert.equal(injected.firstname, '[object Object]')
    })

    it('paginates with a keyset cursor', async () => {
        await people.seed()
        const first = await people.list({ limit: 4 })
        assert.equal(first.items.length, 4)
        assert.equal(first.total, 9)
        assert.ok(first.next)

        const second = await people.list({ after: first.next, limit: 4 })
        const third = await people.list({ after: second.next, limit: 4 })
        assert.equal(second.items.length, 4)
        assert.equal(third.items.length, 1)
        assert.equal(third.next, null)

        const names = [...first.items, ...second.items, ...third.items].map(p => p.firstname)
        assert.deepEqual(names, SEED_PEOPLE.map(p => p.firstname))
    })

    it('clamps the page size', async () => {
        await people.seed()
        assert.equal((await people.list({ limit: 'abc' })).limit, 10)
        assert.equal((await people.list({ limit: 0 })).limit, 10)
        assert.equal((await people.list({ limit: 1000 })).limit, 100)
        assert.equal((await people.list({ limit: -5 })).items.length, 1)
    })

    it('rejects a bad cursor', async () => {
        await assert.rejects(people.list({ after: 'nope' }), { name: 'BadRequestError' })
    })

    it('updates and returns before and after', async () => {
        const created = await people.create(bob)
        const { before, after } = await people.update(String(created._id), { firstname: 'Robert', surname: 'Example', telephone: '123' })
        assert.equal(before.firstname, 'Bob')
        assert.equal(after.firstname, 'Robert')
    })

    it('validates on update', async () => {
        const created = await people.create(bob)
        await assert.rejects(people.update(String(created._id), { telephone: 'letters' }), { name: 'ValidationError' })
    })

    it('returns NotFound / BadRequest for update and delete', async () => {
        const missing = new mongoose.Types.ObjectId().toString()
        await assert.rejects(people.update(missing, bob), { name: 'NotFoundError' })
        await assert.rejects(people.remove(missing), { name: 'NotFoundError' })
        await assert.rejects(people.get(missing), { name: 'NotFoundError' })
        await assert.rejects(people.remove('nope'), { name: 'BadRequestError' })
        await assert.rejects(people.remove({ $ne: null }), { name: 'BadRequestError' })
    })

    it('deletes a person', async () => {
        const created = await people.create(bob)
        const removed = await people.remove(String(created._id))
        assert.equal(removed.firstname, 'Bob')
        assert.equal(await Person.countDocuments(), 0)
    })

    it('seeds and purges', async () => {
        const seeded = await people.seed()
        assert.equal(seeded.inserted, 9)
        assert.deepEqual(await people.purge(), { deleted: 9 })
        assert.deepEqual(await people.purge(), { deleted: 0 })
    })
})

describe('app against a real mongod', () => {
    it('runs create -> list -> update -> delete end to end', async () => {
        const app = createApp({ people, db: { kind: 'local', label: '127.0.0.1', db: 'crud-test', hosts: [] }, dbState: () => 'connected' })

        let res = await request(app).post('/person').type('form').send(bob)
        assert.equal(res.status, 303)
        res = await request(app).get(res.headers.location)
        assert.match(res.text, /status-ok">201</)

        res = await request(app).get('/person')
        const id = /class="mono">([0-9a-f]{24})</.exec(res.text)[1]

        res = await request(app).post('/person/update').type('form').send({ mongoid: id, ...bob, firstname: 'Robert' })
        res = await request(app).get(res.headers.location)
        assert.match(res.text, /&#34;Robert&#34;/)

        res = await request(app).post('/person/delete').type('form').send({ mongoid: id })
        res = await request(app).get(res.headers.location)
        assert.match(res.text, /status-ok">200</)
        assert.equal(await Person.countDocuments(), 0)
    })
})
