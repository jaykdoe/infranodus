/**
 * InfraNodus is a lightweight interface to graph databases.
 *
 * This open source, free software is available under MIT license.
 * It is provided as is, with no guarantees and no liabilities.
 * You are very welcome to reuse this code if you keep this notice.
 *
 * Written by Dmitry Paranyushkin | Nodus Labs and hopefully you also...
 * www.noduslabs.com | info AT noduslabs DOT com
 *
 * In some parts the code from the book "Node.js in Action" is used,
 * (c) 2014 Manning Publications Co.
 *
 */


// request methods available for User objects
var User = require('../lib/user');
var passport = require('passport');


// when user accesses /login page with GET, populate login template view with data
exports.form = function(req, res){
    res.render('login', { title: 'InfraNodus: Polysingularity Thinking Tool' });
};

// when user accesses /login page with POST, authenticate the user
exports.submit = function(req, res, next){
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err) }
        if (!user) {
            req.session.uid = user.uid;

            // req.session.messages =  [info.message];
            res.error("Wrong username / password pair. Please, try again.");

            return res.redirect('/login')
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }

            var _redirect = decodeURIComponent(req.body.redirect);

            if (_redirect) {
                return res.redirect(_redirect);
            }
            else {
                return res.redirect('apps');
                // return res.redirect('/' + user.name +'/edit');
            }
        });
    })(req, res, next);

};

exports.logout = function(req, res){
    req.session.destroy(function(err) {
        if (err) throw err;
        res.redirect('/login');
    });
};
