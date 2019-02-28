var User = require('../user')

module.exports = function(req, res, next) {
    // This is probably for API
    if (req.remoteUser) {
        res.locals.user = req.remoteUser
    }

    // This is defined in login route
    var uid = req.session.uid

    if (!uid) return next()
    User.get(uid, function(err, user) {
        if (err) return next(err)
        req.user = res.locals.user = user
        next()
    })
}
