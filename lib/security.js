// Security headers and a same-origin check for state-changing requests.

function securityHeaders(req, res, next) {
    res.set({
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        // same-origin, not no-referrer: no-referrer makes browsers send
        // "Origin: null" on form POSTs and the origin check rejects them
        'Referrer-Policy': 'same-origin'
    })
    next()
}

// Reject cross-site POSTs (CSRF). Browsers send Origin on form POSTs; when it
// is absent (curl, some older clients) fall back to Referer. Requests with
// neither are allowed, since a browser-driven CSRF always carries one.
function sameOrigin(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()

    const source = req.get('origin') || req.get('referer')
    if (source === undefined) return next()

    let host = null
    try {
        host = new URL(source).host
    } catch {
        // "null" or garbage
    }
    if (host && host === req.get('host')) return next()

    res.status(403).type('text/plain').send('Cross-origin request rejected')
}

module.exports = { securityHeaders, sameOrigin }
