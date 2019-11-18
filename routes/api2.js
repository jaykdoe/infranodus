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

var Entry = require('../lib/entry')
var express = require('express')
const basicAuth = require('express-basic-auth');
var User = require('../lib/user')

exports.auth = basicAuth(User.authenticate)

exports.user = function(req, res, next) {
    User.get(req.params.id, function(err, user) {
        if (err) return next(err)
        if (!user.id) return res.send(404)
        res.json(user)
    })
}

exports.entries = function(req, res, next) {
    // This is for pagination, but not currently used
    var page = req.page

    // Define user
    res.locals.user = req.user

    // Define whose graph is seen (receiver) and who sees the graph (perceiver)
    var receiver = ''
    var perceiver = ''

    // Set that by default the one who sees can only see their own graph, if logged in
    // TODO implement viewing public data of others

    if (res.locals.user) {
        receiver = res.locals.user.uid
        perceiver = res.locals.user.uid
    }

    var contexts = []
    contexts.push(req.params.context)

    Entry.getRange(receiver, perceiver, contexts, function(err, entries) {
        if (err) return next(err)

        res.format({
            json: function() {
                res.send(entries)
            },
        })
    })
}

exports.nodes = function(req, res, next) {
    var page = req.page

    var contexts = []

    // The one who sees the statements (hello Tengo @1Q84 #Murakami)
    var receiver = ''
    // The one who made the statements (hello Fuka-Eri @1Q84 #Murakami)
    var perceiver = ''

    // TODO think of how this is bypassed when API is functional
    // Give this user a variable
    res.locals.user = req.user

    console.log(req.user)

    // Do we want to see graphs that include "near" 4-word gap scan?
    var fullview = res.locals.user.fullview
    if (fullview != 1) {
        fullview = null
    }

    // Let's define the contexts from URL if exist
    contexts.push(req.params.context)

    // And is there one to compare with also?
    if (req.query.addcontext) contexts.push(req.query.addcontext)

    // Is the user logged in? Then he is the receiver
    if (res.locals.user) {
        receiver = res.locals.user.uid
    }
    // Is there user in the URL and we know their ID already? Then the receiver will see their graph...
    if (req.params.user && res.locals.viewuser) {
        perceiver = res.locals.viewuser
    }
    // Otherwise they see their own
    else {
        if (res.locals.user) {
            perceiver = res.locals.user.uid
        }
    }

    Entry.getNodes(receiver, perceiver, contexts, fullview, function(
        err,
        graph
    ) {
        if (err) return next(err)

        // Change the result we obtained into a nice json we need

        if (req.query.gexf) {
            res.render('entries/nodes', { graph: graph })
        } else {
            res.format({
                json: function() {
                    res.send(graph)
                },
            })
        }
    })
}
