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

const MAX_RSS_FEEDS = 10
const MAX_RSS_ITEMS = 300
const DEFAULT_RSS_ITEMS = 15

const FEED_PARSER = require('feedparser-promised')
const STR = require('string')

var validate = require('../lib/middleware/validate')
var entries = require('../routes/entries')
var options = require('../options')

var max_length = options.settings.max_text_length
var max_total_length = options.settings.max_total_text_length

// GET request to the /rss page - to view options for creating a new graph from RSS feed(s)
exports.renderRSS = function(req, res) {
    // TODO: Factor this out into a common function
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }

    res.render('importrss', {
        title: 'InfraNodus: Twitter Text Network Visualization',
        context: req.query.context,
        contextlist: contextslist,
        rsspresets: options.rssPresets,
    })
}

// POST request to the /rss endpoint - to create a new graph using RSS feed(s)
exports.submitRSS = function(req, res, next) {
    /****************************************
    * Get request params and sanitize them
    ****************************************/
    var user_id = res.locals.user.uid

    // TODO: Factor this out into a common function
    // List to be used for import
    var importContext = 'imported'
    if (
        req.body.context &&
        req.body.context.length > 2 &&
        req.body.context.length < 30
    ) {
        importContext = validate
            .sanitize(req.body.context)
            .replace(/[^\w]/gi, '')
    } else {
        req.body.context = importContext
    }

    // Get the RSS Feeds to import from - but limit it to the first x URLs
    var rssSubmitted = validate.sanitize(req.body.rssinput)
    var rssRequested = rssSubmitted.split(/\s+/).slice(0, MAX_RSS_FEEDS)

    // How many statements from each RSS feed do we take max?
    var rssItemsLimit = validate.sanitize(req.body.rssitems)
    if (!rssItemsLimit || rssItemsLimit > MAX_RSS_ITEMS) {
        rssItemsLimit = DEFAULT_RSS_ITEMS
    }

    // If no date given, default to a very old date to allow all articles through
    var rssSinceDateTime = (!!req.body.rsssince ? Date.parse(req.body.rsssince) : Date.parse("1970-01-01"))

    var includeteasers = validate.sanitize(req.body.includeteasers)

    /****************************************
    * Setup variables to track progress
    ****************************************/
    var rssFeeds = 0

    var statements = []

    var addToContexts = []
    addToContexts.push(importContext)

    /********************************************************
    * Import the data - get items from each RSS Feed in turn
    ********************************************************/
    validate.getContextID(user_id, addToContexts, function(result, err) {
        if (err) {
            res.error(
                'Something went wrong when adding contexts into Neo4J database. Try to choose a different name and do not use special characters.'
            )
            res.redirect('back')
        } else {
            // What are the contexts that already exist for this user and their IDs?
            // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
            var contexts = result

            // Construct a new REQ object to add all the statements in
            var reqq = {
                body: {
                    entry: {
                        body: [],
                    },
                    context: importContext,
                },
                contextids: contexts,
                internal: 1,
                multiple: 1,
            }

            for (var item in rssRequested) {
                FEED_PARSER
                    .parse(rssRequested[item])
                    .then(items => {
                        var rssIterations = 0

                        items.forEach(itemo => {
                            if (rssIterations < rssItemsLimit && itemo.pubdate >= rssSinceDateTime) {
                                var thisheadline = STR(
                                    itemo.title
                                ).stripTags().s
                                var thisurl = STR(itemo.link).stripTags().s

                                if (includeteasers == 1) {
                                    var thisteaser =
                                        ' / ' +
                                        validate.splitStatement(
                                            ' ' +
                                                STR(itemo.description)
                                                    .stripTags()
                                                    .s.replace(
                                                        'Continue reading...',
                                                        ' '
                                                    )
                                                    .replace('&nbsp;', ' '),
                                            max_length -
                                                thisheadline.length -
                                                thisurl.length
                                        )[0] +
                                        ' '
                                } else {
                                    var thisteaser = ' '
                                }

                                statements.push(
                                    thisheadline + thisteaser + thisurl
                                )

                                rssIterations = rssIterations + 1
                            }
                        })
                    })
                    .then(done => {
                        // Did we process all the feeds submitted?
                        rssFeeds = rssFeeds + 1

                        if (rssFeeds >= rssRequested.length) {
                            // Save all feeds into the database
                            for (var key in statements) {
                                if (statements.hasOwnProperty(key)) {
                                    reqq.body.entry.body[key] =
                                        statements[key]
                                }
                            }

                            entries.submit(reqq, res)

                            // Display the next page
                            // res.message('Importing the RSS feeds... Please, reload this page in 30 seconds...');
                            // res.redirect(res.locals.user.name + '/' + importContext + '/edit');
                        }
                    })
                    .catch(error => {
                        // Even if there's an error we still "count" that one
                        // TODO what if only one element of a feed is broken? We might have this number higher than needed.
                        rssFeeds = rssFeeds + 1

                        console.error('error: ', error)
                        // res.message('Something went wrong with one of the RSS feeds... Please, reload this page in 30 seconds... If nothing appears, go back.');
                        // res.redirect(res.locals.user.name + '/' + importContext + '/edit');
                    })
            }
        }
    })
}
