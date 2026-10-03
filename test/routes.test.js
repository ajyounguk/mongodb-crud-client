const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const mongoose = require('mongoose')

const { fakePeople, makeApp, ID } = require('./helpers')
const { NotFoundError, BadRequestError } = require('../lib/errors')

const alice = { _id: ID, firstname: 'Alice', surname: 'Example', telephone: '07700 900123' }

// Follow a 303 from a POST and return the rendered page
async function postAndFollow(app, path, form) {
    const post = await request(app).post(path).type('form').send(form)
    assert.equal(post.status, 303)
    assert.match(post.headers.location, /^\/\?view=\w+(&id=[0-9a-f]{24})?&result=[0-9a-f-]{36}$/)
    const page = await request(app).get(post.headers.location)
    assert.equal(page.status, 200)
    return { post, page }
}

function serverSelectionError() {
    const err = new Error('connect ECONNREFUSED 127.0.0.1:27017')
    err.name = 'MongooseServerSelectionError'
    return err
}

describe('GET /', () => {
    it('renders the create panel by default with sidebar and badge', async () => {
        const { app } = makeApp()
        const res = await request(app).get('/')
        assert.equal(res.status, 200)
        assert.match(res.text, /<h2>Create person<\/h2>/)
        assert.match(res.text, /class="sidebar"/)
        assert.match(res.text, /env-badge env-local/)
        assert.match(res.text, /127\.0\.0\.1:27017 \/ crud-demo/)
        assert.match(res.text, /Run an operation to see the response here/)
    })

    for (const view of ['create', 'update', 'delete', 'admin']) {
        it(`renders the ${view} panel`, async () => {
            const { app } = makeApp()
            const res = await request(app).get(`/?view=${view}`)
            assert.equal(res.status, 200)
            assert.match(res.text, new RegExp(`aria-current="page">\\s*<span class="nav-label">`))
        })
    }

    it('falls back to create for an unknown view', async () => {
        const { app } = makeApp()
        const res = await request(app).get('/?view=../../etc/passwd')
        assert.equal(res.status, 200)
        assert.match(res.text, /<h2>Create person<\/h2>/)
    })

    it('redirects view=list to /person', async () => {
        const { app } = makeApp()
        const res = await request(app).get('/?view=list')
        assert.equal(res.status, 303)
        assert.equal(res.headers.location, '/person')
    })

    it('pre-fills the update form from ?id', async () => {
        const { app } = makeApp({ people: fakePeople([alice]) })
        const res = await request(app).get(`/?view=update&id=${ID}`)
        assert.match(res.text, new RegExp(`name="mongoid" value="${ID}"`))
        assert.match(res.text, /name="firstname" value="Alice"/)
        assert.match(res.text, /name="surname" value="Example"/)
        assert.match(res.text, /name="telephone" value="07700 900123"/)
    })

    it('pre-fills the delete form from ?id and shows who will be deleted', async () => {
        const { app } = makeApp({ people: fakePeople([alice]) })
        const res = await request(app).get(`/?view=delete&id=${ID}`)
        assert.match(res.text, new RegExp(`id="delete-mongoid" name="mongoid" value="${ID}"`))
        assert.match(res.text, /<strong>Alice Example<\/strong>/)
        assert.match(res.text, /data-confirm=/)
        assert.match(res.text, /btn btn-danger/)
    })

    it('shows the lookup error when the pre-fill id is unknown', async () => {
        const people = fakePeople()
        people.fail.get = new NotFoundError(`person ${ID} not found`)
        const { app } = makeApp({ people })
        const res = await request(app).get(`/?view=update&id=${ID}`)
        assert.equal(res.status, 200)
        assert.match(res.text, /status-err">404</)
        assert.match(res.text, /name="firstname" value=""/)
    })

    it('shows 404 for a pre-fill id that is not in the collection', async () => {
        const { app } = makeApp({ people: fakePeople([alice]) })
        const res = await request(app).get('/?view=delete&id=64b7f0c2a1b2c3d4e5f6ffff')
        assert.match(res.text, /status-err">404</)
        assert.match(res.text, /NotFoundError/)
    })

    it('ignores an unknown or already-used result id', async () => {
        const { app } = makeApp()
        const res = await request(app).get('/?view=create&result=00000000-0000-0000-0000-000000000000')
        assert.match(res.text, /Run an operation to see the response here/)
    })

    it('shows the env badge colour for Atlas and custom hosts', async () => {
        let res = await request(makeApp({ db: { kind: 'atlas', label: 'cluster0.example.mongodb.net', db: 'prod', hosts: [] } }).app).get('/')
        assert.match(res.text, /env-badge env-atlas/)
        assert.match(res.text, /Atlas/)
        res = await request(makeApp({ db: { kind: 'custom', label: 'db.example.com:27017', db: 'x', hosts: [] }, dbState: () => 'disconnected' }).app).get('/')
        assert.match(res.text, /env-badge env-custom/)
        assert.match(res.text, /state-disconnected/)
    })
})

describe('GET /person (list)', () => {
    it('lists people with edit/delete links and a next-page link', async () => {
        const { app, people } = makeApp({ people: fakePeople([alice]) })
        const res = await request(app).get('/person?limit=5')
        assert.equal(res.status, 200)
        assert.match(res.text, /Alice Example/)
        assert.match(res.text, new RegExp(`href="/\\?view=update&amp;id=${ID}"`))
        assert.match(res.text, new RegExp(`href="/person\\?after=${ID}&amp;limit=5">Next page`))
        assert.match(res.text, /1 in collection/)
        assert.deepEqual(people.calls[0], ['list', { after: undefined, limit: '5' }])
    })

    it('passes the after cursor through and hides Next on the last page', async () => {
        const { app, people } = makeApp({ people: fakePeople([alice]) })
        const res = await request(app).get(`/person?after=${ID}`)
        assert.equal(res.status, 200)
        assert.equal(people.calls[0][1].after, ID)
        assert.doesNotMatch(res.text, /Next page/)
    })

    it('shows an empty state', async () => {
        const { app } = makeApp()
        const res = await request(app).get('/person')
        assert.match(res.text, /No people found/)
    })

    it('returns 400 for a bad cursor', async () => {
        const people = fakePeople()
        people.fail.list = new BadRequestError("'zzz' is not a valid MongoDB ObjectId")
        const { app } = makeApp({ people })
        const res = await request(app).get('/person?after=zzz')
        assert.equal(res.status, 400)
        assert.match(res.text, /BadRequestError/)
    })

    it('returns 503 with the error name when MongoDB is unreachable', async () => {
        const people = fakePeople()
        people.fail.list = serverSelectionError()
        const { app } = makeApp({ people })
        const res = await request(app).get('/person')
        assert.equal(res.status, 503)
        assert.match(res.text, /status-err">503</)
        assert.match(res.text, /MongooseServerSelectionError/)
        assert.match(res.text, /Couldn't load the list/)
    })
})

describe('POST /person (create)', () => {
    it('creates, 303-redirects and shows 201 with the new document', async () => {
        const { app, people } = makeApp()
        const { page } = await postAndFollow(app, '/person', { firstname: 'Bob', surname: 'Example', telephone: '07700 900456' })
        assert.deepEqual(people.calls[0], ['create', { firstname: 'Bob', surname: 'Example', telephone: '07700 900456' }])
        assert.match(page.text, /status-ok">201</)
        assert.match(page.text, /&#34;firstname&#34;: &#34;Bob&#34;/)
        assert.match(page.text, /Request ID <code>[0-9a-f-]{36}<\/code>/)
    })

    it('shows a validation error as 400 with field details', async () => {
        const people = fakePeople()
        const err = new mongoose.Error.ValidationError()
        err.addError('firstname', new mongoose.Error.ValidatorError({ path: 'firstname', message: 'Path `firstname` is required.' }))
        people.fail.create = err
        const { app } = makeApp({ people })
        const { page } = await postAndFollow(app, '/person', { surname: 'x', telephone: '1' })
        assert.match(page.text, /status-err">400</)
        assert.match(page.text, /&#34;fields&#34;/)
        assert.match(page.text, /is required/)
    })

    it('shows the result only once (post/redirect/get)', async () => {
        const { app } = makeApp()
        const { post } = await postAndFollow(app, '/person', { firstname: 'A', surname: 'B', telephone: '123' })
        const again = await request(app).get(post.headers.location)
        assert.match(again.text, /Run an operation to see the response here/)
    })
})

describe('POST /person/update', () => {
    it('updates and shows before and after', async () => {
        const { app, people } = makeApp({ people: fakePeople([alice]) })
        const { page } = await postAndFollow(app, '/person/update', { mongoid: ID, firstname: 'Alicia', surname: 'Example', telephone: '07700 900123' })
        assert.equal(people.calls[0][0], 'update')
        assert.equal(people.calls[0][1], ID)
        assert.match(page.text, /status-ok">200</)
        assert.match(page.text, /&#34;before&#34;/)
        assert.match(page.text, /&#34;Alicia&#34;/)
        assert.match(page.text, /<h2>Update person<\/h2>/)
        // the form shows the saved state after the redirect
        assert.match(page.text, /id="update-firstname" name="firstname" value="Alicia"/)
    })

    it('shows 404 when the person does not exist', async () => {
        const people = fakePeople()
        people.fail.update = new NotFoundError('person x not found')
        const { app } = makeApp({ people })
        const { page } = await postAndFollow(app, '/person/update', { mongoid: ID, firstname: 'a', surname: 'b', telephone: '1' })
        assert.match(page.text, /status-err">404</)
    })

    it('shows 400 for an invalid id instead of crashing', async () => {
        const people = fakePeople()
        people.fail.update = new BadRequestError("'nope' is not a valid MongoDB ObjectId")
        const { app } = makeApp({ people })
        const { page } = await postAndFollow(app, '/person/update', { mongoid: 'nope' })
        assert.match(page.text, /status-err">400</)
    })

    it('handles an empty body', async () => {
        const people = fakePeople()
        people.fail.update = new BadRequestError("'undefined' is not a valid MongoDB ObjectId")
        const { app } = makeApp({ people })
        const post = await request(app).post('/person/update')
        assert.equal(post.status, 303)
    })
})

describe('POST /person/delete', () => {
    it('deletes and labels the action as delete', async () => {
        const { app, people } = makeApp({ people: fakePeople([alice]) })
        const { page } = await postAndFollow(app, '/person/delete', { mongoid: ID })
        assert.deepEqual(people.calls[0], ['remove', ID])
        assert.match(page.text, /status-ok">200<\/span>\s*<span class="muted">delete</)
        assert.equal(people.rows.size, 0)
    })

    it('shows 404 for a missing person', async () => {
        const people = fakePeople()
        people.fail.remove = new NotFoundError('person x not found')
        const { app } = makeApp({ people })
        const { page } = await postAndFollow(app, '/person/delete', { mongoid: ID })
        assert.match(page.text, /status-err">404</)
    })

    it('shows 503 when the database is down', async () => {
        const people = fakePeople()
        people.fail.remove = serverSelectionError()
        const { app } = makeApp({ people })
        const { page } = await postAndFollow(app, '/person/delete', { mongoid: ID })
        assert.match(page.text, /status-err">503</)
    })
})

describe('POST /person/setup and /person/purge', () => {
    it('seeds and shows 201', async () => {
        const { app } = makeApp()
        const { post, page } = await postAndFollow(app, '/person/setup', {})
        assert.match(post.headers.location, /view=admin/)
        assert.match(page.text, /status-ok">201</)
        assert.match(page.text, /&#34;inserted&#34;: 9/)
    })

    it('purges and shows the deleted count', async () => {
        const { app } = makeApp({ people: fakePeople([alice]) })
        const { page } = await postAndFollow(app, '/person/purge', {})
        assert.match(page.text, /&#34;deleted&#34;: 1/)
    })

    it('maps an auth failure on purge to 403', async () => {
        const people = fakePeople()
        people.fail.purge = Object.assign(new Error('not authorized on crud-demo to execute command'), { name: 'MongoServerError', code: 13, codeName: 'Unauthorized' })
        const { app } = makeApp({ people })
        const { page } = await postAndFollow(app, '/person/purge', {})
        assert.match(page.text, /status-err">403</)
        assert.match(page.text, /Unauthorized/)
    })

    it('no longer accepts GET for setup or purge', async () => {
        const { app, people } = makeApp()
        assert.equal((await request(app).get('/person/setup')).status, 404)
        assert.equal((await request(app).get('/person/purge')).status, 404)
        assert.equal(people.calls.length, 0)
    })
})

describe('security', () => {
    it('escapes data in the list, forms and response panel (XSS)', async () => {
        const evil = { _id: ID, firstname: '<script>alert(1)</script>', surname: '"><img src=x onerror=alert(2)>', telephone: '1' }
        const { app } = makeApp({ people: fakePeople([evil]) })
        for (const path of ['/person', `/?view=update&id=${ID}`, `/?view=delete&id=${ID}`]) {
            const res = await request(app).get(path)
            assert.doesNotMatch(res.text, /<script>alert/, path)
            assert.doesNotMatch(res.text, /<img src=x/, path)
            assert.match(res.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/, path)
        }
        const { page } = await postAndFollow(app, '/person', { firstname: '</pre><script>alert(3)</script>', surname: 's', telephone: '1' })
        assert.doesNotMatch(page.text, /<script>alert\(3\)/)
    })

    it('sets security headers, including Referrer-Policy: same-origin', async () => {
        const { app } = makeApp()
        const res = await request(app).get('/')
        // no-referrer would make browsers send "Origin: null" and break every form
        assert.equal(res.headers['referrer-policy'], 'same-origin')
        assert.match(res.headers['content-security-policy'], /default-src 'self'/)
        assert.equal(res.headers['x-content-type-options'], 'nosniff')
        assert.equal(res.headers['x-frame-options'], 'DENY')
        assert.equal(res.headers['x-powered-by'], undefined)
    })

    it('rejects a cross-origin POST', async () => {
        const { app, people } = makeApp()
        const res = await request(app).post('/person/purge').set('Origin', 'https://evil.example.com')
        assert.equal(res.status, 403)
        assert.equal(people.calls.length, 0)
    })

    it('rejects Origin: null', async () => {
        const { app, people } = makeApp()
        const res = await request(app).post('/person/delete').set('Origin', 'null').type('form').send({ mongoid: ID })
        assert.equal(res.status, 403)
        assert.equal(people.calls.length, 0)
    })

    it('rejects a cross-origin Referer when Origin is absent', async () => {
        const { app } = makeApp()
        const res = await request(app).post('/person/purge').set('Referer', 'https://evil.example.com/page')
        assert.equal(res.status, 403)
    })

    it('accepts a same-origin POST', async () => {
        const { app } = makeApp()
        const agent = request(app)
        const res = await agent.post('/person/setup').set('Host', 'localhost:3000').set('Origin', 'http://localhost:3000')
        assert.equal(res.status, 303)
    })

    it('does not echo credentials from error messages', async () => {
        const people = fakePeople()
        people.fail.list = Object.assign(new Error('failed to connect to mongodb://admin:hunter2@db.example.com:27017/x'), { name: 'MongoNetworkError' })
        const { app } = makeApp({ people })
        const res = await request(app).get('/person')
        assert.equal(res.status, 503)
        assert.doesNotMatch(res.text, /hunter2/)
        assert.match(res.text, /mongodb:\/\/\*\*\*@db\.example\.com/)
    })

    it('returns 404 for unknown routes and serves static assets', async () => {
        const { app } = makeApp()
        assert.equal((await request(app).get('/nope')).status, 404)
        const css = await request(app).get('/assets/styles.css')
        assert.equal(css.status, 200)
        assert.match(css.headers['content-type'], /text\/css/)
    })
})
