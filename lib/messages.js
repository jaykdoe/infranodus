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

// this will queue messages to the user in a session variable

var express = require('express')

// .response object is a prototype Express uses for the response objects

var res = express.response

// provides a way to add messages to a session variable from any Express request

res.message = function(msg, type) {
    type = type || 'info'
    var sess = this.req.session
    sess.messages = sess.messages || []
    sess.messages.push({ type: type, string: msg })
}

// add messages of the time Error to the messages queue

res.error = function(msg) {
    return this.message(msg, 'error')
}

// middleware to expose those messages to the templates for output

module.exports = function(req, res, next) {
    // define a template variable to store session's messages

    res.locals.messages = req.session.messages || []

    // create a method to remove messages from the queue to avoid building them up

    res.locals.removeMessages = function() {
        req.session.messages = []
    }

    // pass on to the next function
    next()
}
