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

var User = require('../lib/user')

const CSVParse = require('csv-parse')

var Twit = require('twit')
var FlowdockText = require('flowdock-text')

var validate = require('../lib/middleware/validate')
var entries = require('../routes/entries')

var async = require('async')
var Evernote = require('evernote')

var S = require('string')

var config = require('../config.json')

var Imap = require('imap'),
    inspect = require('util').inspect

var Instruments = require('../lib/tools/instruments.js')

var mimelib = require('mimelib')

var phantom = require('phantom')

var rp = require('request-promise')
var cheerio = require('cheerio')

var extractor = require('unfluff')

var fs = require('fs')

var gexf = require('gexf');

const feedparser = require('feedparser-promised')

var options = require('../options')

var max_length = options.settings.max_text_length
var max_total_length = options.settings.max_total_text_length

const https = require('https');

// This is for PDF reader
global.navigator = {
    userAgent: 'node',
}

window.navigator = {
    userAgent: 'node',
}

var pdfreader = require('pdfreader')

// Lemmatizer module initialization
const Morphy = require('phpmorphy').default

const lemmerEng = new Morphy('en', {
    //  nojo:                false,
    storage: Morphy.STORAGE_MEM,
    predict_by_suffix: true,
    predict_by_db: true,
    graminfo_as_text: true,
    use_ancodes_cache: false,
    resolve_ancodes: Morphy.RESOLVE_ANCODES_AS_TEXT,
})

const lemmerRus = new Morphy('ru', {
    //  nojo:                false,
    storage: Morphy.STORAGE_MEM,
    predict_by_suffix: true,
    predict_by_db: true,
    graminfo_as_text: true,
    use_ancodes_cache: false,
    resolve_ancodes: Morphy.RESOLVE_ANCODES_AS_TEXT,
})

// Keeping them here as they are useful libs for future use

//var iconv = require('iconv-lite'); // converting encodings
//var cheerio = require('cheerio'); // for content extraction  from html pages
//var validator = require('validator'); // to validate encodings, emails, numbers

var T = new Twit({
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    access_token: config.twitter.access_token,
    access_token_secret: config.twitter.access_token_secret,
})

// GET request to the /settings page (view settings)

exports.render = function(req, res) {
    var contextslist = []

    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }

    res.render('import', {
        title: 'Import Data to InfraNodus',
        evernote: '',
        contextlist: contextslist,
        context: req.query.context,
        notebooks: '',
        fornode: req.query.fornode,
    })
}

// GET request to the /google page (view settings)

exports.renderGoogle = function(req, res) {
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('google', {
        title: 'Google the Google',
        evernote: '',
        context: req.query.context,
        notebooks: '',
        contextlist: contextslist,
        fornode: req.query.fornode,
    })
}

exports.renderYouTube = function(req, res) {
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('youtube', {
        title: 'Analyze YouTube video with subtitles',
        evernote: '',
        context: req.query.context,
        notebooks: '',
        contextlist: contextslist,
        fornode: req.query.fornode,
    })
}

exports.renderFiles = function(req, res) {
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('importfiles', {
        title: 'Import a PDF, TXT or CSV file',
        evernote: '',
        context: req.query.context,
        notebooks: '',
        contextlist: contextslist,
        fornode: req.query.fornode,
    })
}

exports.renderApps = function(req, res) {
    // Did we get a list of all the contexts for this user / entries list?
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('apps', {
        title: 'InfraNodus: Visualize any Text as a Network',
        evernote: '',
        context: req.query.context,
        notebooks: '',
        contextlist: contextslist,
        fornode: req.query.fornode,
    })
}

exports.renderTwitter = function(req, res) {
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('twitter', {
        title: 'InfraNodus: Twitter Text Network Visualization',
        evernote: '',
        context: req.query.context,
        contextlist: contextslist,
        notebooks: '',
        fornode: req.query.fornode,
    })
}

exports.renderURL = function(req, res) {
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('importurl', {
        title: 'InfraNodus: Twitter Text Network Visualization',
        evernote: '',
        context: req.query.context,
        contextlist: contextslist,
        notebooks: '',
        fornode: req.query.fornode,
    })
}

exports.renderRSS = function(req, res) {
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('importrss', {
        title: 'InfraNodus: Twitter Text Network Visualization',
        evernote: '',
        context: req.query.context,
        contextlist: contextslist,
        notebooks: '',
        rsspresets: options.rssPresets,
        fornode: req.query.fornode,
    })
}

exports.renderEvernote = function(req, res) {
    var contextslist = []

    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }

    if (req.session.oauthAccessToken) {
        var client = new Evernote.Client({
            token: req.session.oauthAccessToken,
            sandbox: config.evernote.SANDBOX,
        })

        var noteStore = client.getNoteStore()

        noteStore
            .listNotebooks()
            .then(function(notebooks) {
                //var notebookid = notebooks[1].guid

                var notebooks_names = []

                for (var t = 0; t < notebooks.length; t++) {
                    notebooks_names.push(notebooks[t].name)
                }
                res.render('evernote', {
                    title: 'Import Data to InfraNodus',
                    context: '',
                    fornode: '',
                    notebooks: notebooks_names,
                    contextlist: contextslist,
                    evernote: req.session.oauthAccessToken,
                })
            })
            .catch(function(err) {
                console.log('Evernote connect error:')
                req.session.error = JSON.stringify(err)
                console.log(req.session.error)
                res.redirect('/')
            })

        /*     notebooknotes = noteStore.getNotebook(req.session.oauthAccessToken, "e14d8c18-133f-4bc0-b32a-36ebe6ffd405", function(err, notebook) {

        console.log(notebook);

    });*/
    } else {
        res.render('evernote', {
            title: 'Import Data to InfraNodus',
            evernote: '',
            contextlist: contextslist,
            context: req.query.context,
            notebooks: '',
            fornode: req.query.fornode,
        })
    }
}

// POST request to the settings page (change settings)

exports.submit = function(req, res, next) {
    var user_id = res.locals.user.uid

    var user_name = res.locals.user.name

    // What will we analyze?
    var service = req.body.source

    // What will we be extracting
    var extract = req.body.extract

    var searchString = ''

    // What is the search string
    if (service == 'twitter' && (!req.body.search || req.body.search == '')) {
        res.error('Please, enter the @username or a #hashtag')
        res.redirect('back')
    } else {
        searchString = req.body.search
    }

    // How many recent posts
    var limit = 301
    if (req.body.limit && req.body.limit < limit) {
        limit = req.body.limit
    }

    // How many connections to import from gkg
    var graphconnections = 20

    if (req.body.limitgkg && req.body.limitgkg < graphconnections) {
        graphconnections = req.body.limitgkg
    }

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

    // Add a link to the URL after import?

    var append_url = ''

    if (req.body.hide_always) {
        append_url = '?hide_always=1'
    } else if (req.body.hide_when_small) {
        append_url = '?hide_when_small=1'
    }

    if (req.body.go_next_add) {
        append_url = append_url + '&go_next_add=' + req.body.go_next_add
    }

    var walknext = '';
    if (req.body.walknext) {
        walknext = req.body.walknext;
    }

    // We extract only hashtags or hashtags and morphemes
    // TODO reset res.locals after that parameter change

    if (req.body.settings == 'hashtags') {
        res.locals.user.hashnodes = '2'
    } else if (req.body.settings == 'morphemes') {
        res.locals.user.hashnodes = '1'
    }

    var twitterRequest = []

    if (service == 'twitter' && extract == 'user') {
        twitterRequest = {
            type: 'statuses/user_timeline',
            params: {
                screen_name: searchString.substr(1),
                count: limit,
            },
        }
    } else if (service == 'twitter' && extract == 'hashtag') {
        twitterRequest = {
            type: 'search/tweets',
            params: {
                q: searchString,
                count: limit,
            },
        }
    } else if (service == 'twitter' && extract == 'tophashtag') {
        twitterRequest = {
            type: 'search/tweets',
            params: {
                q: searchString,
                lang: 'en',
                result_type: 'mixed',
                count: limit,
            },
        }
    } else if (service == 'twitter' && extract == 'timeline') {
        twitterRequest = {
            type: 'friends/ids',
            params: {
                screen_name: searchString.substr(1),
                count: limit,
            },
        }
    } else if (service == 'twitter' && extract == 'lists') {
        var listname = req.body.listname
        twitterRequest = {
            type: 'lists/statuses',
            params: {
                slug: listname,
                owner_screen_name: searchString.substr(1),
                count: limit,
            },
        }
    }

    console.log('Import parameters submitted: ')
    console.log(searchString)
    console.log(importContext)
    console.log(service)
    console.log(extract)
    console.log(twitterRequest)

    if (searchString && service == 'twitter') {
        // Finding tweets of the @user
        if (twitterRequest.type == 'friends/ids') {
            var tweets = []
            var moreTwitterRequests = []

            var errors = 0

            async.waterfall(
                [
                    function(callback) {
                        T.get(
                            twitterRequest.type,
                            twitterRequest.params,
                            function(err, data, response) {
                                if (err) {
                                    console.log(err)
                                    res.error(err)
                                    res.redirect('back')
                                } else {
                                    console.log(data)
                                    var result = data['ids']
                                    for (var i = 0; i < result.length; i++) {
                                        var statement = result[i]
                                        // Get 3 most recent statements from each friend of a user
                                        moreTwitterRequests[i] = {
                                            type: 'statuses/user_timeline',
                                            params: {
                                                user_id: statement,
                                                count: 3,
                                            },
                                        }
                                    }

                                    callback(null, moreTwitterRequests)
                                }
                            }
                        )
                    },
                    function(moreTwitterRequests, callback) {
                        var count = 0
                        for (var j = 0; j < moreTwitterRequests.length; j++) {
                            T.get(
                                moreTwitterRequests[j].type,
                                moreTwitterRequests[j].params,
                                function(err, data, response) {
                                    if (err) {
                                        // TODO do something about those errors that the program just doesn't stall here when Twitter rate is exceeded
                                        console.log(err)
                                        errors = errors + 1
                                        callback(err, null)
                                    } else {
                                        var result = data

                                        for (
                                            var k = 0;
                                            k < result.length;
                                            k++
                                        ) {
                                            var tweetobject = []
                                            tweetobject['created_at'] =
                                                result[k].created_at
                                            tweetobject['text'] = result[k].text
                                            tweets.push(tweetobject)
                                        }
                                        count = count + 1
                                        if (
                                            count == moreTwitterRequests.length
                                        ) {
                                            callback(null, tweets)
                                        }
                                    }
                                }
                            )
                        }
                    },
                ],
                function(err, tweets) {
                    if (err) {
                        console.log(err)
                        res.error(JSON.stringify(err))

                        if (errors == 1) {
                            res.redirect('back')
                        }
                    } else {
                        function sortFunction(a, b) {
                            var dateA = new Date(a.created_at).getTime()
                            var dateB = new Date(b.created_at).getTime()
                            return dateA < dateB ? 1 : -1
                        }

                        tweets.sort(sortFunction)
                        tweets = tweets.splice(0, 100)

                        var statements = []
                        var default_context = importContext

                        var addToContexts = []
                        addToContexts.push(default_context)

                        for (key in tweets) {
                            var statement = tweets[key].text

                            // This clears the Tweet from the mention, but now as we use @mentions as nodes to connect to everything, we don't need it anymore

                            /*   var mentions = FlowdockText.extractMentions(statement);
                        for (index in mentions) {
                            statement = statement.replace(mentions[index], 'user_' + mentions[index].substr(1) + ' (http://twitter.com/' + mentions[index].substr(1) + ')');
                        }*/

                            // This clears Twitter-specific stopwords we don't need

                            statement = statement.replace(/rt /gi, ' ')

                            statements.push(statement)
                        }

                        validate.getContextID(user_id, addToContexts, function(
                            result,
                            err
                        ) {
                            if (err) {
                                res.error(
                                    'Something went wrong when adding new Tweets into Neo4J database. Try changing the import category name or open an issue on GitHub.'
                                )
                                res.redirect('back')
                            } else {
                                console.log('so the statements we got are')
                                console.log(statements)
                                console.log('and default context')
                                console.log(default_context)
                                // What are the contexts that already exist for this user and their IDs?
                                // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                                var contexts = result

                                console.log('extracted contexts')
                                console.log(contexts)

                                // Create default statement object that has an empty body, default context, and all the context IDs for the user
                                // context: default_context is where all the statements are added anyway
                                // contextids: contexts are the IDs of all the contexts that will be used in those statements

                                var req = {
                                    body: {
                                        entry: {
                                            body: [],
                                        },
                                        context: default_context,
                                    },

                                    contextids: contexts,
                                    internal: 1,
                                    multiple: 1,
                                }

                                for (var key in statements) {
                                    if (statements.hasOwnProperty(key)) {
                                        req.body.entry.body[key] =
                                            statements[key]
                                    }
                                }

                                entries.submit(req, res)

                                // Move on to the next one

                                //  res.redirect(res.locals.user.name + '/' + default_context + '/edit');
                            }
                        })
                    }
                }
            )
        }
        // Finding tweets with a certain hashtag or a timeline of a @user
        else {
            T.get(twitterRequest.type, twitterRequest.params, function(
                err,
                data,
                response
            ) {
                if (err) {
                    console.log(err)
                    res.error(JSON.stringify(err))
                    res.redirect('back')
                } else {
                    var statements = []

                    var default_context = importContext

                    var addToContexts = []
                    addToContexts.push(default_context)

                    var searchquery = twitterRequest.params.q

                    var result = data

                    // For hashtag surrounding search remove the actual hashtag from all tweets
                    if (twitterRequest.type == 'search/tweets') {
                        result = data['statuses']
                    }

                    // Show only @mentions in the graph?
                    var onlymentions = ''
                    if (req.body.onlymentions) {
                        onlymentions = req.body.onlymentions
                    }

                    // Show only @mentions in the graph?
                    var excludementions = ''
                    if (req.body.excludementions) {
                        excludementions = req.body.excludementions
                    }

                    console.log('total results: ' + data.length)

                    for (key in result) {
                        if (
                            result[key].lang == 'en' ||
                            result[key].lang == 'ru'
                        ) {
                            if (
                                result[key].text &&
                                result[key].text != undefined &&
                                result[key].text != 'null'
                            ) {
                                var statement = result[key].text
                                /*    var mentions = FlowdockText.extractMentions(statement);
                          for (index in mentions) {
                              statement = statement.replace(mentions[index], 'user_' + mentions[index].substr(1) + ' (http://twitter.com/' + mentions[index].substr(1) + ')');
                          }*/
                                /* if (twitterRequest.type == 'search/tweets') {
                              if (searchquery.charAt(0) == '#') {
                                  statement = statement.toLowerCase().replace(twitterRequest.params.q.toLowerCase(),'_#'+searchquery.substr(1).toLowerCase());
                              }
                              else {
                                  statement = statement.toLowerCase().replace(twitterRequest.params.q.toLowerCase(),'_'+searchquery.substr(1).toLowerCase());
                              }
                          }*/

                                statement = statement.replace(/rt /gi, ' ')

                                if (req.body.showtwitters) {
                                    statement =
                                        '@' +
                                        result[key].user.screen_name +
                                        ' ' +
                                        statement
                                }

                                if (req.body.excludesearchterm) {
                                    var searchPattern = new RegExp(
                                        '(' + searchquery + ')',
                                        'ig'
                                    )
                                    statement = statement.replace(
                                        searchPattern,
                                        ' '
                                    )

                                    if (
                                        twitterRequest.type == 'lists/statuses'
                                    ) {
                                        statement = statement.replace(
                                            /listname/gi,
                                            ' '
                                        )
                                    }
                                }

                                statements.push(statement)
                            }
                        }
                    }

                    validate.getContextID(user_id, addToContexts, function(
                        result,
                        err
                    ) {
                        if (err) {
                            res.error(
                                'Something went wrong when adding new Twitter lists into Neo4J database. Try changing the Twitter import folder name or open an issue on GitHub.'
                            )
                            res.redirect('back')
                        } else {
                            console.log('so the statements we got are')
                            console.log(statements)
                            console.log('and default context')
                            console.log(default_context)
                            // What are the contexts that already exist for this user and their IDs?
                            // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                            var contexts = result

                            console.log('extracted contexts')
                            console.log(contexts)

                            // Create default statement object that has an empty body, default context, and all the context IDs for the user
                            // context: default_context is where all the statements are added anyway
                            // contextids: contexts are the IDs of all the contexts that will be used in those statements

                            var req = {
                                body: {
                                    entry: {
                                        body: [],
                                    },
                                    context: default_context,
                                },

                                contextids: contexts,
                                onlymentions: onlymentions,
                                excludementions: excludementions,
                                internal: 1,
                                multiple: 1,
                            }

                            for (var key in statements) {
                                if (statements.hasOwnProperty(key)) {
                                    req.body.entry.body[key] = statements[key]
                                }
                            }

                            entries.submit(req, res)

                            // Move on to the next one

                            //  res.redirect(res.locals.user.name + '/' + default_context + '/edit');
                        }
                    })
                }
            })
        }
    } else if (service == 'evernote') {
        var userInfo = req.session.oauthAccessToken
        var offset = 0
        var count = limit

        console.log('logged into Evernote')

        var client = new Evernote.Client({
            token: req.session.oauthAccessToken,
            sandbox: config.evernote.SANDBOX,
        })

        console.log(req.session.oauthAccessToken)

        var noteStore = client.getNoteStore()
        var noteFilter = new Evernote.NoteStore.NoteFilter()
        var notesMetadataResultSpec = new Evernote.NoteStore.NotesMetadataResultSpec()

        var statements = []

        var default_context = importContext

        // Which notebooks to import - this is for checkboxes
        // var notebooksToImport = req.body.notebooks;

        // And this is for radio option
        var notebooksToImport = []

        if (req.body.notebooks) {
            notebooksToImport.push(req.body.notebooks)
        }
        console.log('notebooks to import:')
        console.log(notebooksToImport)

        noteStore
            .listNotebooks()
            .then(function(linkedNotebooks) {
                //var notebookid = notebooks[1].guid

                // This below will be needed if we want to add filter notebooks functionality
                //noteFilter.notebookGuid = notebookid;

                // Let's create an array of notebook names to their IDs

                var notebooks_db = []

                var notebooksList = []

                var onenotebookid = []

                for (var t = 0; t < linkedNotebooks.length; t++) {
                    // Check if the notebook is in the list of the notebooks to import
                    if (
                        notebooksToImport.indexOf(linkedNotebooks[t].name) > -1
                    ) {
                        notebooks_db[linkedNotebooks[t].guid] =
                            linkedNotebooks[t].name
                        notebooksList.push(linkedNotebooks[t].name)
                        onenotebookid = linkedNotebooks[t].guid
                    }
                }

                // This is for checkboxes to filter which notebook we import
                // TODO add a possibility to also filter by a word noteFilter.words = ['one', 'two', 'three'];

                if (notebooksList.length == 1) {
                    noteFilter.notebookGuid = onenotebookid
                }

                var evspec = new Evernote.NoteStore.NotesMetadataResultSpec({
                    includeNotebookGuid: true,
                })

                if (notebooksToImport.length > 0) {
                    noteStore
                        .findNotesMetadata(noteFilter, offset, count, evspec)
                        .then(function(noteList) {
                            var notebook_name = []

                            for (var i = 0; i < noteList.notes.length; i++) {
                                notebook_name[i] =
                                    noteList.notes[i].notebookGuid
                            }

                            async.waterfall(
                                [
                                    function(callback) {
                                        var addToContexts = []

                                        // Here we create dummy statements in order to create the new contexts and get the IDs for them from our Neo4J DB

                                        // This could be a setting if we create a context for each Evernote notebook

                                        // for (var m = 0; m < notebooksList.length; m++) {
                                        //     addToContexts.push(S(notebooksList[m]).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,""));
                                        // }

                                        addToContexts.push(default_context)

                                        validate.getContextID(
                                            user_id,
                                            addToContexts,
                                            function(result, err) {
                                                if (err) {
                                                    res.error(
                                                        'Something went wrong when adding Evernote folders into Neo4J database. Try changing the name of your Evernote folder or open an issue on GitHub.'
                                                    )
                                                    res.redirect('back')
                                                } else {
                                                    // What are the contexts that already exist for this user and their IDs?
                                                    // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                                                    var contexts = result

                                                    callback(null, contexts)
                                                }
                                            }
                                        )
                                    },
                                    function(contexts, callback) {
                                        callback(null, contexts)
                                    },
                                ],
                                function(err, contexts) {
                                    if (err) {
                                        console.log(err)
                                    } else {
                                        var req = {
                                            body: {
                                                entry: {
                                                    body: [],
                                                },
                                                context: '',
                                            },

                                            contextids: contexts,
                                            internal: 1,
                                            multiple: 1,
                                        }

                                        var evernotes = []

                                        // If there's a few contexts (notebooks) then we redirect the user to the general view
                                        // Otherwise — if ther'es only one — to the contextToFilter

                                        if (contexts.length == 1) {
                                            req.body.context = contexts[0].name
                                        }

                                        // req.contextids = selcontexts
                                        // req.body.entry.body = body

                                        if (noteList.notes.length > 0) {
                                            for (
                                                var i = 0;
                                                i < noteList.notes.length;
                                                i++
                                            ) {
                                                var notebook_id =
                                                    noteList.notes[i]
                                                        .notebookGuid

                                                var notebook_name =
                                                    notebooks_db[notebook_id]

                                                var note_id =
                                                    noteList.notes[i].guid

                                                if (
                                                    notebooksList.indexOf(
                                                        notebook_name
                                                    ) > -1
                                                ) {
                                                    getStatement(
                                                        notebook_id,
                                                        note_id,
                                                        contexts
                                                    )
                                                }
                                            }
                                        } else {
                                            res.error(
                                                'This notebook is empty, maybe select another one?'
                                            )
                                            res.redirect('back')
                                        }

                                        function getStatement(
                                            notebook_id,
                                            note_id,
                                            contexts
                                        ) {
                                            noteStore
                                                .getNoteContent(note_id)
                                                .then(function(result) {
                                                    // Normalize note, get rid of tags, etc.

                                                    var sendstring = result
                                                        .replace(
                                                            /<(?:br|\/div|\/p)>/g,
                                                            '\n'
                                                        )
                                                        .replace(/<.*?>/g, '')

                                                    sendstring = sendstring.replace(
                                                        /&quot;/g,
                                                        ''
                                                    )

                                                    // // Create container for contexts to push
                                                    //
                                                    // var selcontexts = [];
                                                    //
                                                    // // Create contained for intemediary context
                                                    //
                                                    // var selcontexts2 = [];
                                                    //
                                                    // // What's the notebook name? This will be our context
                                                    // var currentcontext = S(notebooks_db[notebook_id]).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                                                    // currentcontext = currentcontext.replace(/[^\w]/gi, '');
                                                    //
                                                    // // Now let's find the right ID for that notebook in our database
                                                    // for (var i = 0; i < contexts.length; i++) {
                                                    //     if (contexts[i].name == currentcontext) {
                                                    //         selcontexts2['uid'] = contexts[i].uid;
                                                    //         selcontexts2['name'] = contexts[i].name;
                                                    //         selcontexts.push(selcontexts2);
                                                    //     }
                                                    // }
                                                    //
                                                    // req.contextids = selcontexts;

                                                    evernotes.push(sendstring)

                                                    if (
                                                        noteList.notes.length ==
                                                        evernotes.length
                                                    ) {
                                                        req.body.entry.body = evernotes

                                                        entries.submit(req, res)
                                                    }
                                                })
                                                .catch(function(err) {
                                                    req.session.error = JSON.stringify(
                                                        err
                                                    )
                                                    console.log(
                                                        req.session.error
                                                    )
                                                    res.redirect('/import')
                                                })
                                        }

                                        //     // Move on to the next one
                                        // res.error('Importing content... Please, reload this page in a few seconds...');
                                        // res.redirect(res.locals.user.name + '/edit');
                                    }
                                }
                            )
                        })
                        .catch(function(err) {
                            req.session.error = JSON.stringify(err)
                            console.log(req.session.error)
                            res.redirect('/import')
                        })
                } else {
                    console.log('returning back')
                    res.error(
                        'You did not select any notebooks, please, try again'
                    )
                    res.redirect('back')
                }
            })
            .catch(function(err) {
                req.session.error = JSON.stringify(err)
                console.log('evernote went wrong')
                console.log(err)
                console.log(req.session.error)
                res.redirect('/import')
            })
    } else if (service == 'email') {
        var email = ''
        var encoding = ''
        var sencoding = ''
        var statements = []

        var imap = new Imap({
            user: req.body.email,
            password: req.body.password,
            host: req.body.host,
            port: req.body.port,
            tls: req.body.tls,
        })

        function openInbox(cb) {
            imap.openBox('Notes', true, cb)
        }

        imap.once('ready', function() {
            openInbox(function(err, box) {
                if (err) {
                    throw err
                    res.error(err)
                    res.redirect('back')
                }

                // How many last messages do we fetch?
                var nummes = box.messages.total - limit

                var f = imap.seq.fetch(box.messages.total + ':' + nummes, {
                    bodies: ['HEADER.FIELDS (DATE)', 'TEXT'],
                    struct: true,
                })
                f.on('message', function(msg, seqno) {
                    // console.log('Message #%d', seqno);
                    var prefix = '(#' + seqno + ') '
                    msg.on('body', function(stream, info) {
                        if (info.which === 'TEXT') {
                            // console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
                        }
                        var buffer = '',
                            count = 0
                        stream.on('data', function(chunk) {
                            count += chunk.length
                            buffer += chunk.toString('utf8')
                            if (info.which === 'TEXT') {
                                // console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
                            }
                        })

                        stream.once('end', function() {
                            // If the message contains text, save it to email variable

                            if (info.which !== 'TEXT') {
                                console.log(
                                    prefix + 'Parsed header: %s',
                                    inspect(Imap.parseHeader(buffer))
                                )
                            } else {
                                email = buffer
                            }
                        })
                    })
                    msg.once('attributes', function(attrs) {
                        // Get the charset of the message obtained

                        var charset = attrs.struct[0].params.charset
                        var enc = attrs.struct[0].encoding

                        // Is the main encoding base64 - prioritize
                        if (enc == 'BASE64') {
                            encoding = 'base64'
                        }
                        // Another one – then it'll be that one
                        else {
                            encoding = charset
                            sencoding = enc
                        }
                    })
                    msg.once('end', function() {
                        // The statement is empty
                        var statement = ''

                        // If it's base64 convert it to utf8

                        if (encoding == 'base64') {
                            statement = new Buffer(email, 'base64').toString(
                                'utf8'
                            )
                        }

                        // otherwise it might have weird characters, so convert it accordingly
                        else if (sencoding == 'QUOTED-PRINTABLE') {
                            statement = mimelib.decodeQuotedPrintable(email)
                        }
                        // otherwise it must be utf-8 for real, so keep it that way
                        else {
                            statement = email
                        }

                        // replace all html with spaces and <br> with \n

                        statement = Instruments.cleanHtml(statement)

                        // add the cleaned statement to array

                        statements.push(statement)

                        // console.log(prefix + 'Body [%s] Finished', inspect(info.which));
                    })
                })
                f.once('error', function(err) {
                    console.log('Fetch error: ' + err)
                })
                f.once('end', function() {
                    // console.log('Done fetching all messages!');

                    var default_context = importContext

                    var addToContext = []

                    addToContext.push(default_context)

                    validate.getContextID(user_id, addToContext, function(
                        result,
                        err
                    ) {
                        if (err) {
                            res.error(
                                'Something went wrong when adding new notes into Neo4J database. Try changing the import list name or open an issue on GitHub.'
                            )
                            res.redirect('back')
                        } else {
                            // What are the contexts that already exist for this user and their IDs?
                            // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement

                            var contexts = result

                            // Create default statement object that has an empty body, default context, and all the context IDs for the user
                            // context: default_context is where all the statements are added anyway
                            // contextids: contexts are the IDs of all the contexts that will be used in those statements

                            var req = {
                                body: {
                                    entry: {
                                        body: [],
                                    },
                                    context: default_context,
                                },

                                contextids: contexts,
                                internal: 1,
                                multiple: 1,
                            }

                            for (var key in statements) {
                                if (statements.hasOwnProperty(key)) {
                                    req.body.entry.body[key] = statements[key]
                                }
                            }

                            entries.submit(req, res)

                            // Move on to the next one

                            //  res.redirect(res.locals.user.name + '/' + default_context + '/edit');
                        }
                    })
                    imap.end()
                })
            })
        })

        imap.once('error', function(err) {
            console.log(err)
            res.error('Error connecting to email: ' + JSON.stringify(err))
            res.redirect('back')
        })

        imap.once('end', function() {
            console.log('Connection ended')
        })

        imap.connect()
    }

    // gkg
    else if (service == 'gkg') {
        var default_context = importContext

        var addToContext = []

        addToContext.push(default_context)

        var searchQuery = searchString

        validate.getContextID(user_id, addToContext, function(result, err) {
            if (err) {
                res.error(
                    'Something went wrong when adding new notes into Neo4J database. Try changing the import list name or open an issue on GitHub.'
                )
                res.redirect('back')
            } else {
                // What are the contexts that already exist for this user and their IDs?
                // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement

                var contexts = result

                // Create default statement object that has an empty body, default context, and all the context IDs for the user
                // context: default_context is where all the statements are added anyway
                // contextids: contexts are the IDs of all the contexts that will be used in those statements

                var req = {
                    body: {
                        entry: {
                            body: '',
                        },
                        context: default_context,
                    },

                    contextids: contexts,
                    internal: 1,
                }

                submitRelations(req, res, searchQuery)
            }
        })

        function submitRelations(req, res, searchQuery) {
            phantom.create(function(ph) {
                ph.createPage(function(page) {
                    page.set(
                        'settings.userAgent',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1'
                    )
                    page.open('http://www.google.com/ncr', function(status) {
                        console.log('opened google NCR ', status)

                        if (status == 'fail') {
                            res.error(
                                'Something went wrong getting the results you need.'
                            )
                            res.redirect('back')
                        }

                        page.evaluate(
                            function() {
                                return document.title
                            },
                            function(result) {
                                console.log('Page title is ' + result)
                                page.open(
                                    'https://www.google.com/search?gws_rd=ssl&site=&source=hp&q=' +
                                        searchQuery,
                                    function(status) {
                                        console.log(
                                            'opened google Search Results ',
                                            status
                                        )
                                        if (status == 'fail') {
                                            res.error(
                                                'Something went wrong opening search results. Maybe try again?'
                                            )
                                            res.redirect('back')
                                        }
                                        setTimeout(function() {
                                            page.evaluate(
                                                function() {
                                                    return document.body
                                                        .innerHTML
                                                },
                                                function(result) {
                                                    // Get the first search results page but only from also search for... sentence
                                                    setTimeout(function() {
                                                        var truncresult = result.substr(
                                                            result.indexOf(
                                                                'also search for'
                                                            )
                                                        )

                                                        // Load result in Cheerio
                                                        var $ = cheerio.load(
                                                            truncresult
                                                        )

                                                        // Get the link to more results
                                                        var expandedurl = $(
                                                            '._Yqb'
                                                        ).attr('href')

                                                        // Open that link

                                                        page.open(
                                                            'https://www.google.com' +
                                                                expandedurl,
                                                            function(status) {
                                                                console.log(
                                                                    'opened connections page ',
                                                                    status
                                                                )
                                                                if (
                                                                    status ==
                                                                    'fail'
                                                                ) {
                                                                    res.error(
                                                                        'Something went wrong importing connections. Maybe try again?'
                                                                    )
                                                                    res.redirect(
                                                                        'back'
                                                                    )
                                                                }
                                                                page.evaluate(
                                                                    function() {
                                                                        return document
                                                                            .body
                                                                            .innerHTML
                                                                    },
                                                                    function(
                                                                        result
                                                                    ) {
                                                                        var $ = cheerio.load(
                                                                            result
                                                                        )

                                                                        searchQuery = searchQuery.replace(
                                                                            /\./g,
                                                                            ''
                                                                        )

                                                                        searchQuery = searchQuery.replace(
                                                                            /\,/g,
                                                                            ''
                                                                        )

                                                                        if (
                                                                            $(
                                                                                '.kltat'
                                                                            )
                                                                                .length <
                                                                            graphconnections
                                                                        ) {
                                                                            graphconnections = $(
                                                                                '.kltat'
                                                                            )
                                                                                .length
                                                                        }

                                                                        $(
                                                                            '.kltat'
                                                                        ).each(
                                                                            function(
                                                                                index
                                                                            ) {
                                                                                var link = $(
                                                                                    this
                                                                                )
                                                                                var text = link.text()

                                                                                text = text.replace(
                                                                                    /\./g,
                                                                                    ''
                                                                                )

                                                                                text = text.replace(
                                                                                    /\,/g,
                                                                                    ''
                                                                                )

                                                                                var statement =
                                                                                    'people who search for #' +
                                                                                    searchQuery.replace(
                                                                                        / /g,
                                                                                        '_'
                                                                                    ) +
                                                                                    ' also search for #' +
                                                                                    text.replace(
                                                                                        / /g,
                                                                                        '_'
                                                                                    )

                                                                                req.body.entry.body = statement

                                                                                entries.submit(
                                                                                    req,
                                                                                    res
                                                                                )

                                                                                if (
                                                                                    index ==
                                                                                    graphconnections -
                                                                                        1
                                                                                ) {
                                                                                    ph.exit()
                                                                                    res.error(
                                                                                        'Importing connections... Reload this page in a few seconds.'
                                                                                    )
                                                                                    res.redirect(
                                                                                        res
                                                                                            .locals
                                                                                            .user
                                                                                            .name +
                                                                                            '/' +
                                                                                            default_context +
                                                                                            '/edit'
                                                                                    )
                                                                                    return false
                                                                                }
                                                                            }
                                                                        )
                                                                    }
                                                                )
                                                            }
                                                        )
                                                    }, 1000)
                                                },
                                                1000
                                            )
                                        })

                                        // end of eval
                                    }
                                )
                            }
                        )
                    })
                })
            })
        }
    } else if (service == 'file') {

        console.log('filetype')
        console.log(req.files)

        console.log(req.files.uploadedFile.type)

        var filetype = req.files.uploadedFile.type

        var process_type = 'classes'

        if (req.files.uploadedFile.size > max_total_length) {
            res.error(
                'Sorry, this file exceeds the maximum of ' +
                    max_total_length +
                    ' bytes. You can contact us directly to process longer files.'
            )
            res.redirect('back')
        }

        var contextmentions = req.body.contextmentions

        var removeduplicates = req.body.removeduplicates

        // Is the file uploaded and is it a text / html one?
        if (
            req.files &&
            req.files.uploadedFile.size < max_total_length &&
            (filetype == 'text/html' ||
                filetype == 'text/plain' ||
                filetype == 'application/pdf' ||
                filetype == 'application/octet-stream' ||
                filetype == 'text/csv')
        ) {
            // Import parameters

            // Which field tells InfraNodus which column has the different "contexts"
            var titlefield = ''

            if (req.body.titlefield && req.body.titlefield.length > 0) {
                if (req.files.uploadedFile.type == 'text/csv') {
                    titlefield = req.body.titlefield
                } else {
                    titlefield = '.' + req.body.titlefield
                }
            }

            // Which field tells InfraNodus which data to import
            var processfield = ''

            if (req.body.processfield) {
                if (req.files.uploadedFile.type == 'text/csv') {
                    processfield = req.body.processfield
                } else {
                    processfield = '.' + req.body.processfield
                }
            }

            var filecontents = ''

            var requestedContext = ''

            if (req.body.context.length > 0) {
                requestedContext = importContext
            } else {
                if (filetype == 'text/csv' && titlefield.length > 0) {
                    // Do nothing
                } else {
                    res.error(
                        'Please, specify which graph / context you want to save the text in.'
                    )
                    res.redirect('back')
                }
            }

            requestedContext = processContext(requestedContext)

            // Read that file

            fs.readFile(req.files.uploadedFile.path, function(err, data) {
                if (err) throw err

                // It's not a PDF right? Then convert to string UTF8 encoding
                if (filetype != 'application/pdf') {
                    filecontents = data.toString('utf8')
                } else {
                    filecontents = data
                }

                var filedata = []

                var parsedata = {}

                // Are we dealing with a CSV file? Parse it as JSON
                if (filetype == 'text/csv') {
                    var delimiter
                    if (req.body.delimiter && req.body.delimiter.length == 1) {
                        delimiter = req.body.delimiter
                    } else {
                        delimtier = ';'
                    }
                    CSVParse(filecontents, {
                        trim: true,
                        columns: true,
                        skip_empty_lines: true,
                        skip_lines_with_error: true,
                        delimiter: delimiter,
                    })
                        // Use the readable stream api
                        .on('readable', function() {
                            let record
                            while ((record = this.read())) {
                                filedata.push(record)
                            }
                        })
                        // When we are done, test that the parsed output matched what expected
                        .on('error', function(err) {
                            console.error(err.message)
                            res.error(err.message)
                            res.redirect('back')
                        })
                        .on('end', function() {
                            // Do we have any limits as to which columns we are adding?
                            var processfields = []
                            if (processfield && processfield.length > 0) {
                                processfields = processfield.split(',')
                            }

                            // Iterate through results

                            for (var key in filedata) {
                                var statements = ''

                                // Now for each column in results
                                for (var column in filedata[key]) {
                                    if (processfields.length > 0) {
                                        for (var field in processfields) {
                                            if (
                                                column == processfields[field]
                                            ) {
                                                statements +=
                                                    filedata[key][column] + ' '
                                            }
                                        }
                                        if (
                                            contextmentions &&
                                            titlefield &&
                                            titlefield.length > 0
                                        ) {
                                            if (column == titlefield) {
                                                statements +=
                                                    '@' +
                                                    processContext(
                                                        titlefield +
                                                            '_' +
                                                            filedata[key][
                                                                column
                                                            ]
                                                    ) +
                                                    ' '
                                            }
                                        }
                                    } else {
                                        if (
                                            titlefield &&
                                            titlefield.length > 0
                                        ) {
                                            if (contextmentions) {
                                                if (column == titlefield) {
                                                    statements +=
                                                        '@' +
                                                        processContext(
                                                            titlefield +
                                                                '_' +
                                                                filedata[key][
                                                                    column
                                                                ]
                                                        ) +
                                                        ' '
                                                }
                                            } else {
                                                if (column != titlefield) {
                                                    statements +=
                                                        filedata[key][column] +
                                                        ' '
                                                }
                                            }
                                        } else {
                                            statements +=
                                                filedata[key][column] + ' '
                                        }
                                    }
                                }

                                // Do we have a context field setting? Create an array in parsedata with it
                                if (titlefield && titlefield.length > 0) {
                                    if (!contextmentions) {
                                        if (filedata[key][titlefield]) {
                                            var proccon = processContext(
                                                titlefield +
                                                    '_' +
                                                    filedata[key][titlefield]
                                            )
                                            if (!parsedata[proccon]) {
                                                parsedata[proccon] = []
                                            }
                                            parsedata[proccon].push(statements)
                                        }
                                    }
                                }

                                if (requestedContext.length > 0) {
                                    if (!parsedata[requestedContext]) {
                                        parsedata[requestedContext] = []
                                    }
                                    if (removeduplicates) {
                                        if (
                                            parsedata[requestedContext].indexOf(
                                                statements
                                            ) == -1
                                        ) {
                                            parsedata[requestedContext].push(
                                                statements
                                            )
                                        }
                                    } else {
                                        parsedata[requestedContext].push(
                                            statements
                                        )
                                    }
                                }
                            }

                            // console.log(parsedata);

                            processFile(
                                titlefield,
                                processfield,
                                filecontents,
                                parsedata,
                                filetype
                            )
                        })
                } else if (filetype == 'application/octet-stream') {
                    if (req.files.uploadedFile.name.indexOf('.gexf') >= 0) {
                        let gexf_graph = gexf.parse(filecontents);
                        let gexf_edges = gexf_graph.edges;
                        let gexf_nodes = gexf_graph.nodes;
                        let gexf_statements = [];
                        for (let i = 0; i < gexf_edges.length; i++) {
                            for (let j = 0; j < gexf_nodes.length; j++) {
                                if (gexf_nodes[j].id == gexf_edges[i].source) {
                                    if (!gexf_statements[i]) gexf_statements[i] = ' ';
                                    gexf_statements[i] += ' #' + S(gexf_nodes[j].label.toLowerCase()).underscore();
                                }
                                if (gexf_nodes[j].id == gexf_edges[i].target) {
                                    if (!gexf_statements[i]) gexf_statements[i] = ' ';
                                    gexf_statements[i] += ' #' + S(gexf_nodes[j].label.toLowerCase()).underscore();
                                }
                            }
                            if (gexf_edges[i].weight > 1) {
                                for (let k = 0; k < gexf_edges[i].weight; k++) {
                                    gexf_statements[i] += '\n\n ' + gexf_statements[i];
                                }
                            }
                        }

                        //console.log(gexf_statements);


                        var currentcontext = processContext(importContext)

                        parsedata[currentcontext] = [];

                        parsedata[currentcontext].push(gexf_statements.join('\n\n'));

                        processFile(
                            titlefield,
                            processfield,
                            filecontents,
                            parsedata,
                            filetype
                        )
                    }
                } else if (filetype == 'text/html') {
                    // Load DIVs in the file contents
                    var $ = cheerio.load(filecontents)

                    // Is there any DIVs with the class .title in that file? This is how we check if it's an Amazon file
                    if (titlefield && $(titlefield) && $(titlefield).length) {
                        $(titlefield).each(function(index) {
                            // Get the Amazon book names
                            // TODO or any classnames
                            var bookname = $(this).text()

                            // Translate the book name into the context name
                            var currentcontext = processContext(bookname)

                            if (!parsedata[currentcontext]) {
                                parsedata[currentcontext] = []
                            }
                        })
                    }

                    processFile(
                        titlefield,
                        processfield,
                        filecontents,
                        parsedata,
                        filetype
                    )
                } else {
                    var currentcontext = processContext(importContext)

                    if (!parsedata[currentcontext]) {
                        parsedata[currentcontext] = []
                    }

                    processFile(
                        titlefield,
                        processfield,
                        filecontents,
                        parsedata,
                        filetype
                    )
                }

                function processFile(
                    titlefield,
                    processfield,
                    filecontents,
                    parsedata,
                    filetype
                ) {
                    // Now step by step...
                    async.waterfall(
                        [
                            function(callback) {
                                // First, let's extract the ID of every context (if they exist, if not, create)

                                var addToContexts = []

                                for (var key in parsedata) {
                                    addToContexts.push(key)
                                }

                                validate.getContextID(
                                    user_id,
                                    addToContexts,
                                    function(result, err) {
                                        if (err) {
                                            res.error(
                                                'Something went wrong when adding contexts into Neo4J database. Could be a problem with the file.'
                                            )
                                            res.redirect('back')
                                        } else {
                                            // What are the contexts that already exist for this user and their IDs?
                                            // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                                            var contexts = result

                                            console.log(
                                                'Extracted contexts from DB with IDs'
                                            )
                                            console.log(contexts)

                                            callback(null, contexts)
                                        }
                                    }
                                )
                            },
                            function(contexts, callback) {
                                // Do import fields exist?
                                if (
                                    filetype == 'text/plain' ||
                                    filetype == 'application/pdf' ||
                                    filetype == 'text/csv' ||
                                    filetype == 'application/octet-stream' ||
                                    filetype == 'text/html'
                                ) {
                                    callback(null, contexts)
                                } else {
                                    err =
                                        'Sorry, but InfraNodus does not recognize this kind of content yet. Add a feature request on our GitHub and we will look into it.'
                                    callback(err)
                                }
                            },
                        ],
                        function(err, contexts) {
                            var something_added = 0

                            if (err) {
                                console.log(err)
                                res.error(err)
                                res.redirect('back')
                            } else {
                                // Separate Amazon highlights file into blocks by the books

                                if (filetype == 'text/html') {
                                    console.log('Processing file by classes')

                                    // Which classes we use to split the statements?
                                    // TODO add some other splitters
                                    var books = filecontents.split(
                                        'bookMain yourHighlightsHeader'
                                    )

                                    var numHighlights = 0

                                    for (var i = 0; i < books.length; i++) {
                                        var current_book = books[i]
                                        var $$ = cheerio.load(current_book)

                                        // Get the name of the book
                                        var bookname = ''

                                        if (
                                            titlefield &&
                                            $$(titlefield).length
                                        ) {
                                            bookname = $$(titlefield)
                                                .first()
                                                .text()
                                        } else {
                                            bookname = importContext
                                        }

                                        // Convert it to the context name
                                        // TODO this repeats the function above from validate.ContextID so make sure not to change it if the above is not changed also
                                        var currentcontext = processContext(
                                            bookname
                                        )

                                        $$(processfield).each(function(index) {
                                            // Get the book names
                                            var highlight = $(this).text()

                                            // Check the corresponding context ID for the book name
                                            var addingcontexts = []

                                            for (
                                                var j = 0;
                                                j < contexts.length;
                                                j++
                                            ) {
                                                if (
                                                    contexts[j].name ==
                                                    currentcontext
                                                ) {
                                                    addingcontexts.push(
                                                        contexts[j]
                                                    )
                                                }
                                            }

                                            // Only add a statement if it's below the max limit
                                            if (numHighlights < limit) {
                                                saveHighlight(
                                                    highlight,
                                                    addingcontexts
                                                )
                                            }

                                            numHighlights++
                                        })
                                    }
                                }
                                // if it's a book
                                else if (
                                    filetype == 'text/plain' ||
                                    filetype == 'application/pdf'
                                ) {
                                    if (filetype == 'application/pdf') {
                                        //PDF processing special case
                                        var PDFtextfull = ''

                                        something_added += 1

                                        // Parse PDF
                                        new pdfreader.PdfReader().parseBuffer(
                                            filecontents,
                                            function(err, item) {
                                                if (err) callback(err)
                                                else if (!item) {
                                                    if (
                                                        PDFtextfull.length > 0
                                                    ) {
                                                        saveFileAtOnce(
                                                            PDFtextfull,
                                                            contexts
                                                        )
                                                        callback()
                                                    } else {
                                                        res.error(
                                                            'Sorry, we could not extract text from this file. Try another convertor and then simply copy/paste it into InfraNodus.'
                                                        )
                                                        res.redirect('back')
                                                    }
                                                } else if (item.text) {
                                                    PDFtextfull +=
                                                        item.text + ' \r\n'
                                                }
                                            }
                                        )
                                    }

                                    // Standard text file
                                    else {
                                        if (filecontents.length > 0) {
                                            saveFileAtOnce(
                                                filecontents,
                                                contexts
                                            )
                                            something_added += 1
                                        } else {
                                            res.error(
                                                'Sorry, we could not extract any text from this file. Try to simply copy/paste it into InfraNodus.'
                                            )
                                            res.redirect('back')
                                        }
                                    }
                                }  else if (filetype == 'application/octet-stream') {
                                    for (var graphname in parsedata) {
                                        if (parsedata[graphname].length > 0) {

                                            var addingstatements = ''

                                            // Check the corresponding context ID for the book name
                                            var addingcontexts = []

                                            for (
                                                var j = 0;
                                                j < contexts.length;
                                                j++
                                            ) {
                                                if (contexts[j].name == graphname) {
                                                    addingcontexts.push(
                                                        contexts[j]
                                                    )
                                                }
                                            }

                                            // Put together all statements from that context into one graph
                                            for (var st in parsedata[graphname]) {
                                                if (
                                                    parsedata[graphname][st]
                                                        .length > 0
                                                ) {
                                                    addingstatements +=
                                                        parsedata[graphname][st] +
                                                        '\n\n'
                                                }
                                            }

                                            if (addingstatements.length > 0) {
                                                saveFileAtOnce(
                                                    addingstatements,
                                                    addingcontexts
                                                )
                                                something_added += 1
                                            }

                                        }
                                    }
                                }
                                else if (filetype == 'text/csv') {
                                    for (var graph in parsedata) {
                                        if (parsedata[graph].length > 0) {
                                            var addingstatements = ''

                                            // Check the corresponding context ID for the book name
                                            var addingcontexts = []

                                            for (
                                                var j = 0;
                                                j < contexts.length;
                                                j++
                                            ) {
                                                if (contexts[j].name == graph) {
                                                    addingcontexts.push(
                                                        contexts[j]
                                                    )
                                                }
                                            }

                                            // Put together all statements from that context into one graph
                                            for (var st in parsedata[graph]) {
                                                if (
                                                    parsedata[graph][st]
                                                        .length > 0
                                                ) {
                                                    addingstatements +=
                                                        parsedata[graph][st] +
                                                        '\n\n'
                                                }
                                            }

                                            if (addingstatements.length > 0) {
                                                saveFileAtOnce(
                                                    addingstatements,
                                                    addingcontexts
                                                )
                                                something_added += 1
                                            }
                                        }
                                    }
                                    if (something_added == 0) {
                                        res.error(
                                            'Sorry, we could not extract data from this file. Try to choose another delimiter or select a specific column.'
                                        )
                                        res.redirect('back')
                                    }
                                }

                                if (something_added > 0) {
                                    // Move on to the next one
                                    res.error(
                                        'Importing the content... Please, reload this page in 30 seconds...'
                                    )

                                    if (requestedContext.length > 0) {
                                        res.redirect(
                                            res.locals.user.name +
                                                '/' +
                                                requestedContext +
                                                '/edit'
                                        )
                                    } else {
                                        res.redirect(
                                            res.locals.user.name + '/edit'
                                        )
                                    }
                                }
                            }
                        }
                    )
                }
            })
        }

        // Did not recognive the filetype
        else {
            if (req.files.uploadedFile.size < max_total_length) {
                res.error(
                    'Sorry, but InfraNodus does not recognize this kind of content yet. Add a feature request on GitHub and we will look into it.'
                )
                res.redirect('back')
            }
        }

        // delete file
        fs.unlink(req.files.uploadedFile.path, function(err) {
            if (err) throw err
            console.log('successfully deleted ' + req.files.path)
        })

        function saveFileAtOnce(fullfiletext, contexts) {
            // and finally create an object to send this entry with the right context

            var req = {
                body: {
                    entry: {
                        body: fullfiletext,
                    },
                    context: '',
                },

                contextids: contexts,
            }

            entries.submit(req, res)
        }
    } else if (service == 'url') {
        // TODO fix savehighlight function for multiple items
        // TODO do the same above in the file upload

        var numHighlights = 0

        //console.log(req.body);

        var processfield = validate.sanitize(req.body.processfield)
        var processheadline = validate.sanitize(req.body.processheadline)
        var processteaser = validate.sanitize(req.body.processteaser)
        var processurl = validate.sanitize(req.body.processurl)

        var default_context = importContext

        var statements = []

        if (!processheadline) {
            processheadline = ''
        }
        if (!processteaser) {
            processteaser = ''
        }
        if (!processurl) {
            processurl = ''
        }

        var addToContexts = []

        addToContexts.push(importContext)

        var urloptions = {
            uri: req.body.url,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1',
            },
            transform: function(body) {
                return cheerio.load(body)
            },
        }

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

                var atLeastOne = 0

                rp(urloptions)
                    .then(function($) {
                        if (
                            processfield.length == 0 ||
                            $(processfield).length == 0
                        ) {
                            var extracteddata = extractor($.html())

                            var thisurl = req.body.url

                            saveHighlight(
                                extracteddata.text.substr(0, max_total_length) +
                                    ' ' +
                                    thisurl,
                                contexts
                            )

                            res.message(
                                'Importing the content automatically... Please, reload this page in 30 seconds...'
                            )
                            res.redirect(
                                res.locals.user.name +
                                    '/' +
                                    importContext +
                                    '/edit'
                            )
                        } else {
                            $(processfield).each(function(index) {
                                if (processurl.length > 0) {
                                    var thisurl = $(this)
                                        .find(processurl)
                                        .attr('href')
                                } else {
                                    var thisurl = ''
                                }

                                if (processheadline.length > 0) {
                                    var thisheadline = $(this)
                                        .find(processheadline)
                                        .text()
                                } else {
                                    var thisheadline = ''
                                }

                                if (processteaser.length > 0) {
                                    var thisteaser = $(this)
                                        .find(processteaser)
                                        .text()
                                } else {
                                    var thisteaser = ''
                                }

                                var thisprocessurl = processurl

                                if (
                                    thisurl === undefined ||
                                    !thisurl ||
                                    thisurl == 'undefined' ||
                                    thisurl == undefined
                                ) {
                                    thisprocessurl = processurl + ' a'
                                    thisurl = $(this)
                                        .find(thisprocessurl)
                                        .attr('href')
                                }

                                if (
                                    (thisheadline.length > 0 ||
                                        thisteaser.length > 0) &&
                                    atLeastOne <= limit
                                ) {
                                    statements.push(
                                        thisheadline +
                                            ' ' +
                                            validate.splitStatement(
                                                thisteaser,
                                                max_length -
                                                    thisheadline.length -
                                                    thisurl.length
                                            )[0] +
                                            ' ' +
                                            thisurl
                                    )

                                    atLeastOne = atLeastOne + 1
                                }
                            })

                            if (atLeastOne == 0) {
                                var thisurl = req.body.url

                                $(processfield).each(function(index) {
                                    if (atLeastOne <= limit) {
                                        var splittedField = validate.splitStatement(
                                            $(this).text(),
                                            max_length - thisurl.length
                                        )
                                        for (var y in splittedField) {
                                            statements.push(
                                                splittedField[y] + ' ' + thisurl
                                            )
                                        }
                                        atLeastOne = atLeastOne + 1
                                    }
                                })
                            }

                            // Did we add all the statements into the array? Let's now add them to DB
                            if (
                                atLeastOne == $(processfield).length ||
                                atleastOne == limit
                            ) {
                                var reqq = {
                                    body: {
                                        entry: {
                                            body: [],
                                        },
                                        context: default_context,
                                    },

                                    contextids: contexts,
                                    internal: 1,
                                    multiple: 1,
                                }

                                for (var key in statements) {
                                    if (statements.hasOwnProperty(key)) {
                                        reqq.body.entry.body[key] =
                                            statements[key]
                                    }
                                }

                                entries.submit(reqq, res)
                            }
                            // res.message('Importing the content based on your classes... Please, reload this page in 30 seconds...');
                            // res.redirect(res.locals.user.name + '/' + importContext + '/edit');
                        }
                    })
                    .catch(function(err) {
                        console.error('Could not import URL: ' + err)
                        res.error(
                            'Could not access the URL specified or extract any information. Error code: ' +
                                err
                        )
                        res.redirect('back')
                    })
            }
        })
    } else if (service == 'rss') {
        var rssSubmitted = validate.sanitize(req.body.rssinput)

        var rssRequested = rssSubmitted.split(/\s+/).slice(0, 10)

        var addToContexts = []

        var rssFeeds = 0

        var rssItemsMax = validate.sanitize(req.body.rssitems)

        // If no date given, default to a very old date to allow all articles through
        var rssSinceDateTime = (!!req.body.rsssince ? Date.parse(req.body.rsssince) : Date.parse("1970-01-01"))

        var includeteasers = validate.sanitize(req.body.includeteasers)

        var statements = []

        addToContexts.push(importContext)

        var default_context = importContext

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
                        context: default_context,
                    },

                    contextids: contexts,
                    internal: 1,
                    multiple: 1,
                }

                // How many statements from each RSS feed do we take max?
                var limito

                if (rssItemsMax) {
                    if (rssItemsMax < 300) {
                        limito = rssItemsMax
                    } else {
                        limito = 10
                    }
                }

                for (var item in rssRequested) {
                    // How many RSS feeds in total can we process?

                    feedparser
                        .parse(rssRequested[item])
                        .then(items => {
                            var rssIterations = 0

                            items.forEach(itemo => {
                                if (rssIterations < limito && itemo.pubdate >= rssSinceDateTime) {
                                    var thisheadline = S(
                                        itemo.title
                                    ).stripTags().s
                                    var thisurl = S(itemo.link).stripTags().s

                                    if (includeteasers == 1) {
                                        var thisteaser =
                                            ' / ' +
                                            validate.splitStatement(
                                                ' ' +
                                                    S(itemo.description)
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
    } else if (service == 'youtube') {
        var youtubedl = require('youtube-dl')

        var statements = []

        var default_context = importContext

        var addToContexts = []

        addToContexts.push(default_context)

        var subphrases = req.body.subphrases

        var sublanguage = req.body.sublanguage

        if (!sublanguage) {
            sublanguage = 'en'
        }

        if (!subphrases) {
            subphrases = '6'
        } else {
            subphrases = parseInt(subphrases)
        }

        var ytoptions = {
            // Write automatic subtitle file (youtube only)
            auto: false,
            // Downloads all the available subtitles.
            all: false,
            // Languages of subtitles to download, separated by commas.
            lang: sublanguage,
        }

        validate.getContextID(user_id, addToContexts, function(result, err) {
            if (err) {
                console.log(err)
                res.error(
                    'Something went wrong when adding a new context into the database. Try changing its name or open an issue on GitHub.'
                )
                res.redirect('back')
            } else {
                var contexts = result
                var req = {
                    body: {
                        entry: {
                            body: [],
                        },
                        context: default_context,
                    },

                    contextids: contexts,
                    internal: 1,
                    multiple: 1,
                }

                var url = searchString

                // TODO glue two different subtitles together (from - to)
                // TODO add a link to the video at the end of each glue youtube.be/23282929?t=192

                function youtube_parser(url) {
                    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/
                    var match = url.match(regExp)
                    return match && match[7].length == 11 ? match[7] : false
                }

                get_subtitles(ytoptions)

                function get_subtitles(ytoptions) {
                    youtubedl.getSubs(url, ytoptions, function(err, files) {
                        if (err) {
                            console.log(err)
                            res.error(
                                'Could not read the video file from the link. We only accept YouTube links like https://www.youtube.com/watch?v=-qgkB0XD4bM or http://youtu.be/-qgkB0XD4bM'
                            )
                            res.redirect('back')
                        } else {
                            console.log('subtitle files downloaded:', files)

                            if (files[0]) {
                                console.log(files[0])

                                fs.readFile(files[0], 'utf8', function(
                                    err,
                                    contents
                                ) {
                                    if (err) {
                                        console.log(err)
                                        res.error(
                                            'Could not download the YouTube subtitles file.'
                                        )
                                        res.redirect('back')
                                    } else {
                                        //Output to console
                                        //console.log(captions[0].data);

                                        var statements = contents
                                            .replace(/<.*?>/g, '')
                                            .split('\n\n')
                                            .join('ttttt')
                                            .replace(/\n/g, ' ')
                                            .split('ttttt')

                                        // Shich statment are we adding

                                        var j = 0

                                        var repeating_phrase

                                        var prev_statement = ' '
                                        var future_statement = ' '

                                        var previous_timecode

                                        for (
                                            var i = 1;
                                            i < statements.length;
                                            ++i
                                        ) {
                                            var timecode

                                            if (statements[i].substr(0, 12)) {
                                                var timesplit = statements[i]
                                                    .substr(0, 12)
                                                    .split(':')

                                                if (timesplit) {
                                                    if (timesplit[2]) {
                                                        var secondsplit = timesplit[2].split(
                                                            '.'
                                                        )

                                                        // recalculate timecode into seconds and deduct 3 to point to the right moment
                                                        timecode =
                                                            parseInt(
                                                                timesplit[0]
                                                            ) *
                                                                60 *
                                                                60 +
                                                            parseInt(
                                                                timesplit[1]
                                                            ) *
                                                                60 +
                                                            parseInt(
                                                                secondsplit[0]
                                                            )

                                                        var request_body

                                                        var start_time
                                                        var end_time

                                                        start_time = statements[
                                                            i
                                                        ].substr(0, 12)

                                                        request_body =
                                                            statements[
                                                                i
                                                            ].substr(29) + ' '

                                                        request_body = request_body
                                                            .replace(
                                                                'align:start',
                                                                ''
                                                            )
                                                            .replace(
                                                                'position:0%',
                                                                ''
                                                            )

                                                        repeating_phrase = request_body

                                                        end_time = statements[
                                                            i
                                                        ].substr(17, 12)

                                                        // TODO fix this to check for repetition, right now YouTube automated CCs are repeating every 4 times or so

                                                        if (
                                                            statements[
                                                                i
                                                            ].indexOf(
                                                                'align:start'
                                                            ) > -1 &&
                                                            ytoptions.auto
                                                        ) {
                                                            subphrases = '4'
                                                        }

                                                        for (
                                                            var k = 1;
                                                            k < subphrases;
                                                            k++
                                                        ) {
                                                            if (
                                                                statements[
                                                                    i + k
                                                                ]
                                                            ) {
                                                                var interim_statement =
                                                                    statements[
                                                                        i + k
                                                                    ]
                                                                        .substr(
                                                                            29
                                                                        )
                                                                        .replace(
                                                                            'align:start',
                                                                            ''
                                                                        )
                                                                        .replace(
                                                                            'position:0%',
                                                                            ''
                                                                        ) + ' '

                                                                request_body =
                                                                    request_body +
                                                                    interim_statement
                                                                end_time = statements[
                                                                    i + k
                                                                ].substr(17, 12)
                                                            }
                                                        }

                                                        req.body.entry.body[j] =
                                                            start_time +
                                                            ' --> ' +
                                                            end_time +
                                                            ' ' +
                                                            request_body.replace(
                                                                'align:start position:0%',
                                                                ' '
                                                            ) +
                                                            'http://youtu.be/' +
                                                            youtube_parser(
                                                                searchString
                                                            ) +
                                                            '?t=' +
                                                            timecode

                                                        i = i + subphrases - 1

                                                        j = j + 1
                                                    }
                                                }
                                            }
                                        }

                                        entries.submit(req, res)

                                        // TODO

                                        // Visualize

                                        // We then identify the two main topics

                                        // Identify which one is earlier

                                        // Minus 2 seconds + 2 seconds — propose to watch that fragment of video
                                    }
                                    fs.unlink(files[0])
                                })

                                // if files[0]
                            } else {
                                if (ytoptions.auto) {
                                    console.log('NO CAPTIONS')
                                    res.error(
                                        'Sorry, there are no captions in this video.'
                                    )
                                    res.redirect('back')
                                } else {
                                    ytoptions = {
                                        // Write automatic subtitle file (youtube only)
                                        auto: true,
                                        // Downloads all the available subtitles.
                                        all: false,
                                        // Languages of subtitles to download, separated by commas.
                                        lang: sublanguage,
                                    }

                                    get_subtitles(ytoptions)
                                }
                            }
                        }
                    })
                }
            }
        })
    } else if (service == 'googlesearch') {
        // google.lang = 'us'
        // google.tld = 'us'

        // google.resultsPerPage = limit
        // var nextCounter = 0

        var statements = []

        var default_context = importContext

        var addToContexts = []
        addToContexts.push(default_context)

        var excludesearchquery = req.body.excludesearchquery

        var excludetitles = req.body.excludetitles


        validate.getContextID(user_id, addToContexts, function(result, err) {
            if (err) {
                console.log(err)
                res.error(
                    'Something went wrong when adding a new context into the database. Try changing its name or open an issue on GitHub.'
                )
                res.redirect('back')
            } else {
                var contexts = result
                var req = {
                    body: {
                        entry: {
                            body: [],
                        },
                        context: default_context,
                    },

                    contextids: contexts,
                    internal: 1,
                    multiple: 1,
                    walkthrough: walknext
                }


                let google_request_link = config.google.URL_search + config.google.API_key + '&q=' + searchString.toLowerCase();

                https.get(google_request_link, (resp) => {

                    var receiveddata = '';

                    // A chunk of data has been received.
                    resp.on('data', (chunk) => {
                        receiveddata += chunk;
                    });

                    // The whole response has been received. Print out the result.
                    resp.on('end', () => {

                        let googlejson = JSON.parse(receiveddata);

                        req.body.entry.body = addGoogleEntry(googlejson, excludetitles);

                        let currentmarker = 0;

                        // How much total results we get?
                        let tot_search_results = googlejson.queries.request[0].totalResults;

                        currentmarker = tot_search_results - 10;

                        let startmarker = 0;

                        if (currentmarker > 0) {
                            startmarker = 10;
                            https.get(google_request_link + '&start=' + startmarker, (resp) => {

                                receiveddata = '';
                                // A chunk of data has been received.
                                resp.on('data', (chunk) => {
                                    receiveddata += chunk;
                                });

                                // The whole response has been received. Print out the result.
                                resp.on('end', () => {

                                    googlejson = JSON.parse(receiveddata);

                                    req.body.entry.body = req.body.entry.body.concat(addGoogleEntry(googlejson, excludetitles));

                                    currentmarker = tot_search_results - 20;

                                    if (currentmarker > 0) {
                                        startmarker = 20;

                                        https.get(google_request_link + '&start=' + startmarker, (resp) => {

                                            receiveddata = '';
                                            // A chunk of data has been received.
                                            resp.on('data', (chunk) => {
                                                receiveddata += chunk;
                                            });

                                            // The whole response has been received. Print out the result.
                                            resp.on('end', () => {

                                                googlejson = JSON.parse(receiveddata);

                                                req.body.entry.body = req.body.entry.body.concat(addGoogleEntry(googlejson, excludetitles));

                                                currentmarker = tot_search_results - 30;

                                                if (currentmarker > 0) {
                                                    startmarker = 30;

                                                    https.get(google_request_link + '&start=' + startmarker, (resp) => {

                                                        receiveddata = '';
                                                        // A chunk of data has been received.
                                                        resp.on('data', (chunk) => {
                                                            receiveddata += chunk;
                                                        });

                                                        // The whole response has been received. Print out the result.
                                                        resp.on('end', () => {

                                                            googlejson = JSON.parse(receiveddata);

                                                            req.body.entry.body = req.body.entry.body.concat(addGoogleEntry(googlejson, excludetitles));


                                                             // Do we need to exclude the search query from the graph? Let's make a temporary list of stopwords for it

                                                            if (excludesearchquery) {

                                                                let searchterms = searchString.toLowerCase().split(' ')

                                                                let searchlemmas = [];

                                                                for (let k = 0; k < searchterms.length; k++) {

                                                                    // Now we find lemmas, so we deal with plural cases and also with Russian word endings and suffixes
                                                                    // TODO this whole thing should be moved outside of this function and Russian lemmas should be added to stopwords not deleted from text

                                                                    if (
                                                                        /[а-яА-ЯЁё]/.test(searchterms[k]) ==
                                                                        true
                                                                    ) {
                                                                        var lemmaterm = lemmerRus.lemmatize(
                                                                            searchterms[k]
                                                                        )
                                                                    }

                                                                    // English?
                                                                    else {
                                                                        var lemmaterm = lemmerEng.lemmatize(
                                                                            searchterms[k]
                                                                        )

                                                                    }

                                                                    // Now push the lemma into the list
                                                                    if (lemmaterm[0] != undefined) {
                                                                        searchlemmas.push(lemmaterm[0].toLowerCase())
                                                                    }
                                                                }

                                                                req.excludestopwords = searchlemmas;
                                                            }

                                                            // Submit entries (routes/entries.js)

                                                            entries.submit(req, res);


                                                        });
                                                    });

                                                }
                                                else {
                                                    entries.submit(req, res);

                                                }


                                            });
                                        });

                                    }
                                    else {
                                        entries.submit(req, res);
                                    }


                                });
                            });
                        }
                        else {
                            if (tot_search_results > 0) {
                                entries.submit(req, res);
                            }
                            else {
                                console.log("Error: No Google search results found");
                                res.error(JSON.stringify("Google provided zero search results for this query. Try to make it a bit more general."));
                                res.redirect('back')
                            }
                        }





                    });



                }).on("error", (err) => {
                    console.log("Error: " + err.message);
                    res.error(JSON.stringify(err.message));
                    res.redirect('back')
                });

            }
        })
    }


    function addGoogleEntry(googlejson, excludetitles) {

        console.log('googlejson')
            console.log(googlejson)

            let entryobject = [];

            let searchresults = googlejson.items;

            if (searchresults) {
                for (let i = 0; i < searchresults.length;  ++i) {
                    if (
                        searchresults[i].snippet &&
                        searchresults[i].snippet != 'null' &&
                        searchresults[i].snippet != undefined
                    ) {

                        let searchtext = ''

                        if (!excludetitles) {
                            searchtext += searchresults[i].title + ' ';
                        }
                        searchtext += searchresults[i].snippet
                        searchtext += ' ' + searchresults[i].link

                        // Old Google import code that replaces the dates
                        // searchtext = searchtext.replace(
                        //     /(0?[1-9]|[12][0-9]|3[01])\s{1}(Jan|Feb|Mar|Apr|May|Jun|Jul|Apr|Sep|Oct|Nov|Dec)\s{1}\d{4}/g,
                        //     ''
                        // )

                        // Add the search result as an entry to process
                        entryobject[i] = searchtext;

                    }
                }
            }

            return entryobject;

    }

    function saveHighlight(highlight, contexts) {
        // and finally create an object to send this entry with the right context

        var req = {
            body: {
                entry: {
                    body: highlight,
                },
                context: '',
            },

            contextids: contexts,
            internal: 1,
        }

        entries.submit(req, res)
    }

    function processContext(context) {
        var requestedContext = S(context)
            .dasherize()
            .chompLeft('-')
            .camelize()
            .s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        requestedContext = requestedContext.replace(/[^\w]/gi, '')
        requestedContext = requestedContext.substr(0, 12)
        return requestedContext
    }
}
