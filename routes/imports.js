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

var User = require('../lib/user');

var Twit = require('twit');
var FlowdockText = require("flowdock-text");

var validate = require('../lib/middleware/validate');
var entries = require('../routes/entries');

var async = require('async');
var Evernote = require('evernote').Evernote;

var S = require('string');

var config = require('../config.json');

var Imap = require('imap'),
    inspect = require('util').inspect;

var Instruments = require('../lib/tools/instruments.js');

var mimelib = require("mimelib");

var phantom = require('phantom');

var rp = require('request-promise');
var cheerio = require('cheerio');

var extractor = require('unfluff');

var fs = require('fs');

var google = require('google');

const feedparser = require('feedparser-promised');

// This is for PDF reader
global.navigator = {
  userAgent: 'node',
}

window.navigator = {
  userAgent: 'node',
}

var pdfreader = require('pdfreader');

// Lemmatizer module initialization
const Morphy = require('phpmorphy').default;

const lemmerEng = new Morphy('en', {
//  nojo:                false,
  storage:             Morphy.STORAGE_MEM,
  predict_by_suffix:   true,
  predict_by_db:       true,
  graminfo_as_text:    true,
  use_ancodes_cache:   false,
  resolve_ancodes:     Morphy.RESOLVE_ANCODES_AS_TEXT
});

const lemmerRus = new Morphy('ru', {
//  nojo:                false,
  storage:             Morphy.STORAGE_MEM,
  predict_by_suffix:   true,
  predict_by_db:       true,
  graminfo_as_text:    true,
  use_ancodes_cache:   false,
  resolve_ancodes:     Morphy.RESOLVE_ANCODES_AS_TEXT
});



// Keeping them here as they are useful libs for future use

//var iconv = require('iconv-lite'); // converting encodings
//var cheerio = require('cheerio'); // for content extraction  from html pages
//var validator = require('validator'); // to validate encodings, emails, numbers




var T = new Twit({
    consumer_key:         config.twitter.consumer_key
    , consumer_secret:      config.twitter.consumer_secret
    , access_token:         config.twitter.access_token
    , access_token_secret:  config.twitter.access_token_secret
});





// GET request to the /settings page (view settings)

exports.render = function(req, res) {
      var contextslist = [];
      if (res.locals.contextslist) {
          contextslist = res.locals.contextslist;
      }
    if (req.session.oauthAccessToken) {

        var client = new Evernote.Client({token: req.session.oauthAccessToken});

        var noteStore = client.getNoteStore();

        notebooks = noteStore.listNotebooks(function(err, notebooks) {
            //var notebookid = notebooks[1].guid
            if (err) {
                req.session.error = JSON.stringify(err);
                console.log(req.session.error);
                res.redirect('/');
            }
            else {

                var notebooks_names = [];

                for (var t = 0; t < notebooks.length; t++) {
                    notebooks_names.push(notebooks[t].name);
                }
                res.render('import', { title: 'Import Data to InfraNodus', context: '', fornode: '', notebooks: notebooks_names, contextlist: contextslist, evernote: req.session.oauthAccessToken});
            }

        });



   /*     notebooknotes = noteStore.getNotebook(req.session.oauthAccessToken, "e14d8c18-133f-4bc0-b32a-36ebe6ffd405", function(err, notebook) {

            console.log(notebook);

        });*/




    }
    else {

        res.render('import', { title: 'Import Data to InfraNodus', evernote: '', contextlist: contextslist, context: req.query.context, notebooks: '', fornode: req.query.fornode });

    }




};


// GET request to the /google page (view settings)

exports.renderGoogle = function(req, res) {
        var contextslist = [];
        if (res.locals.contextslist) {
            contextslist = res.locals.contextslist;
        }
        res.render('google', { title: 'Google the Google', evernote: '', context: req.query.context, notebooks: '', contextlist: contextslist, fornode: req.query.fornode });

};

exports.renderApps = function(req, res) {
        // Did we get a list of all the contexts for this user / entries list?
        var contextslist = [];
        if (res.locals.contextslist) {
            contextslist = res.locals.contextslist;
        }
        res.render('apps', { title: 'InfraNodus: Visualize any Text as a Network', evernote: '', context: req.query.context, notebooks: '', contextlist: contextslist, fornode: req.query.fornode });

};

exports.renderTwitter = function(req, res) {
        var contextslist = [];
        if (res.locals.contextslist) {
            contextslist = res.locals.contextslist;
        }
        res.render('twitter', { title: 'InfraNodus: Twitter Text Network Visualization', evernote: '', context: req.query.context, contextlist: contextslist, notebooks: '', fornode: req.query.fornode });

};

exports.renderURL = function(req, res) {
        var contextslist = [];
        if (res.locals.contextslist) {
            contextslist = res.locals.contextslist;
        }
        res.render('importurl', { title: 'InfraNodus: Twitter Text Network Visualization', evernote: '', context: req.query.context, contextlist: contextslist, notebooks: '', fornode: req.query.fornode });
};

exports.renderRSS = function(req, res) {
        var contextslist = [];
        if (res.locals.contextslist) {
            contextslist = res.locals.contextslist;
        }
        res.render('importrss', { title: 'InfraNodus: Twitter Text Network Visualization', evernote: '', context: req.query.context, contextlist: contextslist, notebooks: '', fornode: req.query.fornode });
};


// POST request to the settings page (change settings)

exports.submit = function(req, res,  next) {

    var user_id = res.locals.user.uid;

    var user_name = res.locals.user.name;

    // What will we analyze?
    var service = req.body.source;

    // What will we be extracting
    var extract = req.body.extract;

    var searchString = '';

    // What is the search string
    if (service == 'twitter' && (!req.body.search || req.body.search == ''))  {
        res.error('Please, enter the @username or a #hashtag');
        res.redirect('back');
    }
    else {
        searchString = req.body.search;
    }

    // How many recent posts
    var limit = 301;
    if (req.body.limit && req.body.limit < limit) {
            limit = req.body.limit;
    }

    // How many connections to import from gkg
    var graphconnections = 20;

    if (req.body.limitgkg && req.body.limitgkg < graphconnections) {

        graphconnections = req.body.limitgkg;

    }

    // List to be used for import
    var importContext = 'imported';
    if (req.body.context && req.body.context.length > 2 && req.body.context.length < 20) {
        importContext = validate.sanitize(req.body.context).replace(/[^\w]/gi, '');
    }
    else {
        req.body.context = importContext;
    }

    // Add a link to the URL after import?

    var append_url = '';

    if (req.body.hide_always) {
        append_url = '?hide_always=1';
    }
    else if (req.body.hide_when_small) {
        append_url = '?hide_when_small=1';
    }

    if (req.body.go_next_add) {
        append_url = append_url + '&go_next_add=' + req.body.go_next_add;
    }

    // We extract only hashtags or hashtags and morphemes
    // TODO reset res.locals after that parameter change

    if (req.body.settings == 'hashtags') {
        res.locals.user.hashnodes = '2';
    }
    else if (req.body.settings == 'morphemes') {
        res.locals.user.hashnodes = '1';
    }

    var twitterRequest = [];

    if (service == 'twitter' && extract == 'user') {
         twitterRequest = {
              type: 'statuses/user_timeline',
              params: {
                    screen_name: searchString.substr(1),
                    count: limit
              }
        }
    }
    else if (service == 'twitter' && extract == 'hashtag') {
         twitterRequest = {
            type: 'search/tweets',
            params: {
                q: searchString,
                count: limit
            }
        }
    }
    else if (service == 'twitter' && extract == 'tophashtag') {
        twitterRequest = {
            type: 'search/tweets',
            params: {
                q: searchString,
                lang: 'en',
                result_type: 'mixed',
                count: limit
            }
        }
    }
    else if (service == 'twitter' && extract == 'timeline') {
        twitterRequest = {
            type: 'friends/ids',
            params: {
                screen_name: searchString.substr(1),
                count: limit
            }
        }

    }
    else if (service == 'twitter' && extract == 'lists') {
        var listname = req.body.listname;
        twitterRequest = {
            type: 'lists/statuses',
            params: {
                slug: listname,
                owner_screen_name: searchString.substr(1),
                count: limit
            }
        }

    }




    console.log('Import parameters submitted: ');
    console.log(searchString);
    console.log(importContext);
    console.log(service);
    console.log(extract);
    console.log(twitterRequest);


    if (searchString && service == 'twitter') {


        // Finding tweets of the @user
        if (twitterRequest.type == 'friends/ids') {

            var tweets = [];
            var moreTwitterRequests = [];

            var errors = 0;

            async.waterfall([

                function(callback){

                    T.get(twitterRequest.type, twitterRequest.params, function(err, data, response) {
                        if (err) {
                            console.log(err);
                            res.error(err);
                            res.redirect('back');
                        }
                        else {
                            console.log(data);
                            var result = data['ids'];
                            for (var i = 0; i < result.length; i++) {
                                var statement = result[i];
                                // Get 3 most recent statements from each friend of a user
                                moreTwitterRequests[i] = {
                                    type: 'statuses/user_timeline',
                                    params: {
                                        user_id: statement,
                                        count: 3
                                    }
                                }

                            }

                            callback(null, moreTwitterRequests);
                        }

                    });



                },
                function(moreTwitterRequests, callback){

                    var count = 0;
                    for (var j = 0; j < moreTwitterRequests.length; j++) {


                        T.get(moreTwitterRequests[j].type, moreTwitterRequests[j].params, function(err, data, response) {

                            if (err) {
                                // TODO do something about those errors that the program just doesn't stall here when Twitter rate is exceeded
                               console.log(err);
                               errors = errors + 1;
                               callback(err, null);
                            }
                            else {
                                var result = data;


                                for (var k = 0; k < result.length; k++) {
                                    var tweetobject = [];
                                    tweetobject['created_at'] = result[k].created_at;
                                    tweetobject['text'] = result[k].text;
                                    tweets.push(tweetobject);
                                }
                                count = count + 1;
                                if (count == moreTwitterRequests.length) {
                                    callback(null, tweets);
                                }
                            }


                        });



                    }


                }
            ], function (err, tweets) {

                if (err) {

                    console.log(err);
                    res.error(JSON.stringify(err));

                    if (errors == 1) {
                     res.redirect('back');
                    }



                }
                else {

                    function sortFunction(a,b){
                        var dateA = new Date(a.created_at).getTime();
                        var dateB = new Date(b.created_at).getTime();
                        return dateA < dateB ? 1 : -1;
                    };

                    tweets.sort(sortFunction);
                    tweets = tweets.splice(0,100);

                    var statements = [];
                    var default_context = importContext;

                    var addToContexts = [];
                    addToContexts.push(default_context);

                    for (key in tweets) {
                        var statement = tweets[key].text;

                        // This clears the Tweet from the mention, but now as we use @mentions as nodes to connect to everything, we don't need it anymore

                     /*   var mentions = FlowdockText.extractMentions(statement);
                        for (index in mentions) {
                            statement = statement.replace(mentions[index], 'user_' + mentions[index].substr(1) + ' (http://twitter.com/' + mentions[index].substr(1) + ')');
                        }*/

                        // This clears Twitter-specific stopwords we don't need

                        statement = statement.replace(/rt /ig,' ');

                        statements.push(statement);
                    }

                    validate.getContextID(user_id, addToContexts, function(result, err) {
                        if (err) {
                            res.error('Something went wrong when adding new Tweets into Neo4J database. Try changing the import category name or open an issue on GitHub.');
                            res.redirect('back');
                        }
                        else {
                            console.log('so the statements we got are');
                            console.log(statements);
                            console.log('and default context');
                            console.log(default_context);
                            // What are the contexts that already exist for this user and their IDs?
                            // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                            var contexts = result;

                            console.log('extracted contexts');
                            console.log(contexts);

                            // Create default statement object that has an empty body, default context, and all the context IDs for the user
                            // context: default_context is where all the statements are added anyway
                            // contextids: contexts are the IDs of all the contexts that will be used in those statements

                            var req = {
                                body:  {
                                    entry: {
                                        body: []
                                    },
                                    context: default_context
                                },

                                contextids: contexts,
                                internal: 1,
                                multiple: 1
                            };






                            for (var key in statements) {
                                if (statements.hasOwnProperty(key)) {
                                    req.body.entry.body[key] = statements[key];
                                }
                            }

                            entries.submit(req, res);

                            // Move on to the next one

                          //  res.redirect(res.locals.user.name + '/' + default_context + '/edit');
                        }


                    });


                }
            });


        }
        // Finding tweets with a certain hashtag or a timeline of a @user
        else {
            T.get(twitterRequest.type, twitterRequest.params, function(err, data, response) {
                if (err) {
                    console.log(err);
                    res.error(JSON.stringify(err));
                    res.redirect('back');
                }
                else {
                    var statements = [];

                    var default_context = importContext;

                    var addToContexts = [];
                    addToContexts.push(default_context);

                    var searchquery = twitterRequest.params.q;

                    var result = data;

                    // For hashtag surrounding search remove the actual hashtag from all tweets
                    if (twitterRequest.type == 'search/tweets') {
                        result = data['statuses'];

                    }

                    // Show only @mentions in the graph?
                    var onlymentions = '';
                    if (req.body.onlymentions) {
                          onlymentions = req.body.onlymentions;
                    }


                    // Show only @mentions in the graph?
                    var excludementions = '';
                    if (req.body.excludementions) {
                        excludementions = req.body.excludementions;
                    }

                    console.log('total results: ' + data.length);



                    for (key in result) {
                        if (result[key].lang == 'en' || result[key].lang == 'ru') {
                        var statement = result[key].text;
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

                        statement = statement.replace(/rt /ig,' ');

                        if (req.body.showtwitters) {
                            statement = '@' + result[key].user.screen_name + ' ' + statement;
                        }

                        if (req.body.excludesearchterm) {

                            var searchPattern = new RegExp('('+searchquery+')', 'ig');
                            statement = statement.replace(searchPattern,' ');

                            if (twitterRequest.type == 'lists/statuses') {
                                statement = statement.replace(/listname/ig,' ');
                            }
                        }

                        statements.push(statement);

                        }
                    }


                    validate.getContextID(user_id, addToContexts, function(result, err) {
                        if (err) {
                            res.error('Something went wrong when adding new Twitter lists into Neo4J database. Try changing the Twitter import folder name or open an issue on GitHub.');
                            res.redirect('back');
                        }
                        else {
                            console.log('so the statements we got are');
                            console.log(statements);
                            console.log('and default context');
                            console.log(default_context);
                            // What are the contexts that already exist for this user and their IDs?
                            // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                            var contexts = result;

                            console.log('extracted contexts');
                            console.log(contexts);

                            // Create default statement object that has an empty body, default context, and all the context IDs for the user
                            // context: default_context is where all the statements are added anyway
                            // contextids: contexts are the IDs of all the contexts that will be used in those statements

                            var req = {
                                body:  {
                                    entry: {
                                        body: []
                                    },
                                    context: default_context
                                },

                                contextids: contexts,
                                onlymentions: onlymentions,
                                excludementions: excludementions,
                                internal: 1,
                                multiple: 1
                            };


                            for (var key in statements) {
                                if (statements.hasOwnProperty(key)) {
                                    req.body.entry.body[key] = statements[key];
                                }
                            }

                            entries.submit(req, res);

                            // Move on to the next one

                          //  res.redirect(res.locals.user.name + '/' + default_context + '/edit');
                        }


                    });
                }


            });
        }
    }
    else if (service == 'evernote') {

        var userInfo 	= req.session.oauthAccessToken;
        var offset 		= 0;
        var count 		= limit;

        console.log('logged into Evernote');

        var client = new Evernote.Client({token: req.session.oauthAccessToken});

        console.log(req.session.oauthAccessToken);

        var noteStore = client.getNoteStore();
        var noteFilter = new Evernote.NoteFilter;
        var notesMetadataResultSpec = new Evernote.NotesMetadataResultSpec;

        var statements = [];

        var default_context = importContext;

        // Which notebooks to import - this is for checkboxes
        // var notebooksToImport = req.body.notebooks;

        // And this is for radio option
        var notebooksToImport = [];

        if (req.body.notebooks) {
            notebooksToImport.push(req.body.notebooks);
        }

        notebooks = noteStore.listNotebooks(function(err, notebooks) {
            //var notebookid = notebooks[1].guid
            if (err) {
                req.session.error = JSON.stringify(err);
                console.log(req.session.error);
                res.redirect('/');
            }
            else {


                // This below will be needed if we want to add filter notebooks functionality
                //noteFilter.notebookGuid = notebookid;

                // Let's create an array of notebook names to their IDs

                var notebooks_db = [];

                var notebooksList = [];

                var onenotebookid = [];

                for (var t = 0; t < notebooks.length; t++) {

                     // Check if the notebook is in the list of the notebooks to import
                     if (notebooksToImport.indexOf(notebooks[t].name) > -1) {
                        notebooks_db[notebooks[t].guid] = notebooks[t].name;
                        notebooksList.push(notebooks[t].name);
                        onenotebookid = notebooks[t].guid;
                     }

                }

                // This is for checkboxes to filter which notebook we import
                if (notebooksList.length == 1) {
                    noteFilter.notebookGuid = onenotebookid;
                }

                notesMetadataResultSpec.includeNotebookGuid = true;

                if (notebooksToImport.length > 0) {

                noteStore.findNotesMetadata(userInfo, noteFilter, offset, count, notesMetadataResultSpec, function(err, noteList) {
                    if (err) {

                        console.log(err);

                    } else {

                        var notebook_name = [];

                        for (var i = 0; i < noteList.notes.length; i++ ) {

                            notebook_name[i] = noteList.notes[i].notebookGuid;
                            console.log('notebookname');
                            console.log(notebook_name[i]);

                        }

                        async.waterfall([

                            function(callback){


                                var addToContexts = [];
                                // Here we create dummy statements in order to create the new contexts and get the IDs for them from our Neo4J DB

                                for (var m = 0; m < notebooksList.length; m++) {
                                    addToContexts.push(S(notebooksList[m]).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,""));
                                }

                                validate.getContextID(user_id, addToContexts, function(result, err) {
                                    if (err) {
                                        res.error('Something went wrong when adding Evernote folders into Neo4J database. Try changing the name of your Evernote folder or open an issue on GitHub.');
                                        res.redirect('back');
                                    }
                                    else {

                                        // What are the contexts that already exist for this user and their IDs?
                                        // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                                        var contexts = result;

                                        console.log('Extracted contexts from DB with IDs');
                                        console.log(contexts);

                                        callback(null, contexts);
                                    }



                                });



                            },
                            function(contexts, callback){

                               callback(null,contexts);

                            }
                        ], function (err, contexts) {

                            if (err) {

                                console.log(err);



                            }
                            else {


                                for (var i = 0; i < noteList.notes.length; i++ ) {

                                    var notebook_id = noteList.notes[i].notebookGuid;

                                    var notebook_name =  notebooks_db[notebook_id];

                                    var note_id = noteList.notes[i].guid;


                                    if (notebooksList.indexOf(notebook_name) > -1) {
                                        getStatement(notebook_id, note_id, contexts);
                                    }



                                }

                                function getStatement(notebook_id, note_id, contexts) {

                                    noteStore.getNoteContent(userInfo, note_id, function(err, result) {

                                        if (err) {
                                            console.log(err);
                                            res.error(err);
                                            res.redirect('back');

                                        }
                                        // Normalize note, get rid of tags, etc.

                                        var sendstring = S(result).stripTags().s;

                                        sendstring = sendstring.replace(/&quot;/g, '');


                                        // Create container for contexts to push

                                        var selcontexts = [];

                                        // Create contained for intemediary context

                                        var selcontexts2 = [];

                                        // What's the notebook name? This will be our context
                                        var currentcontext = S(notebooks_db[notebook_id]).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                                        currentcontext = currentcontext.replace(/[^\w]/gi, '');

                                        // Now let's find the right ID for that notebook in our database
                                        for (var i = 0; i < contexts.length; i++) {
                                            if (contexts[i].name == currentcontext) {
                                                selcontexts2['uid'] = contexts[i].uid;
                                                selcontexts2['name'] = contexts[i].name;
                                                selcontexts.push(selcontexts2);
                                            }
                                        }

                                        // and finally create an object to send this entry with the right context

                                        var req = {
                                            body:  {
                                                entry: {
                                                    body: sendstring
                                                },
                                                context: ''
                                            },

                                            contextids: selcontexts,
                                            internal: 1
                                        };


                                        entries.submit(req,res);



                                    });
                                }

                                    // Move on to the next one
                                res.error('Importing content... Please, reload this page in a few seconds...');
                                res.redirect(res.locals.user.name + '/edit');




                            }
                        });








                    }


                });

                }
                else {
                    res.error('You did not select any notebooks, please, try again');
                    res.redirect('back');
                }
            }


        });





    }

    else if (service == 'email') {

        var email = '';
        var encoding = '';
        var sencoding = '';
        var statements = [];


        var imap = new Imap({
            user: req.body.email,
            password: req.body.password,
            host: req.body.host,
            port: req.body.port,
            tls: req.body.tls
        });

        function openInbox(cb) {
            imap.openBox('Notes', true, cb);
        }

        imap.once('ready', function() {
            openInbox(function(err, box) {
                if (err) {
                    throw err;
                    res.error(err);
                    res.redirect('back');
                }

                // How many last messages do we fetch?
                var nummes = box.messages.total - limit;


                var f = imap.seq.fetch(box.messages.total + ':' + nummes, { bodies: ['HEADER.FIELDS (DATE)','TEXT'], struct: true });
                f.on('message', function(msg, seqno) {
                    // console.log('Message #%d', seqno);
                    var prefix = '(#' + seqno + ') ';
                    msg.on('body', function(stream, info) {
                        if (info.which === 'TEXT') {
                            // console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
                        }
                        var buffer = '', count = 0;
                        stream.on('data', function(chunk) {
                            count += chunk.length;
                            buffer += chunk.toString('utf8');
                            if (info.which === 'TEXT')  {
                                // console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
                            }
                        });

                        stream.once('end', function() {

                            // If the message contains text, save it to email variable

                            if (info.which !== 'TEXT') {
                                console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
                            }
                            else  {
                                email = buffer;
                            }

                        });
                    });
                    msg.once('attributes', function(attrs) {

                        // Get the charset of the message obtained

                        var charset = attrs.struct[0].params.charset;
                        var enc = attrs.struct[0].encoding;

                        // Is the main encoding base64 - prioritize
                        if (enc == 'BASE64') {
                            encoding = 'base64';
                        }
                        // Another one – then it'll be that one
                        else {
                            encoding = charset;
                            sencoding = enc;
                        }



                    });
                    msg.once('end', function() {

                        // The statement is empty
                        var statement = '';

                        // If it's base64 convert it to utf8

                        if (encoding == 'base64') {
                            statement = new Buffer(email, 'base64').toString('utf8');
                        }

                        // otherwise it might have weird characters, so convert it accordingly
                        else if (sencoding == 'QUOTED-PRINTABLE') {
                            statement = mimelib.decodeQuotedPrintable(email);

                        }
                        // otherwise it must be utf-8 for real, so keep it that way
                        else {
                            statement = email;
                        }


                        // replace all html with spaces and <br> with \n

                        statement = Instruments.cleanHtml(statement);


                        // add the cleaned statement to array

                        statements.push(statement);


                        // console.log(prefix + 'Body [%s] Finished', inspect(info.which));

                    });
                });
                f.once('error', function(err) {
                    console.log('Fetch error: ' + err);
                });
                f.once('end', function() {

                    // console.log('Done fetching all messages!');

                    var default_context = importContext;

                    var addToContext = [];

                    addToContext.push(default_context);




                    validate.getContextID(user_id, addToContext, function(result, err) {
                        if (err) {
                            res.error('Something went wrong when adding new notes into Neo4J database. Try changing the import list name or open an issue on GitHub.');
                            res.redirect('back');
                        }
                        else {
                            // What are the contexts that already exist for this user and their IDs?
                            // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement

                            var contexts = result;


                            // Create default statement object that has an empty body, default context, and all the context IDs for the user
                            // context: default_context is where all the statements are added anyway
                            // contextids: contexts are the IDs of all the contexts that will be used in those statements

                            var req = {
                                body:  {
                                    entry: {
                                        body: []
                                    },
                                    context: default_context
                                },

                                contextids: contexts,
                                internal: 1,
                                multiple: 1
                            };




                            for (var key in statements) {
                                if (statements.hasOwnProperty(key)) {
                                    req.body.entry.body[key] = statements[key];
                                }
                            }

                            entries.submit(req, res);

                            // Move on to the next one

                          //  res.redirect(res.locals.user.name + '/' + default_context + '/edit');
                        }

                    });
                    imap.end();
                });
            });
        });

        imap.once('error', function(err) {
            console.log(err);
            res.error('Error connecting to email: ' + JSON.stringify(err));
            res.redirect('back');

        });

        imap.once('end', function() {
            console.log('Connection ended');
        });

        imap.connect();


    }

    // gkg
    else if (service == 'gkg') {

        var default_context = importContext;

        var addToContext = [];

        addToContext.push(default_context);

        var searchQuery = searchString;



        validate.getContextID(user_id, addToContext, function(result, err) {
            if (err) {
                res.error('Something went wrong when adding new notes into Neo4J database. Try changing the import list name or open an issue on GitHub.');
                res.redirect('back');
            }
            else {
                // What are the contexts that already exist for this user and their IDs?
                // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement

                var contexts = result;


                // Create default statement object that has an empty body, default context, and all the context IDs for the user
                // context: default_context is where all the statements are added anyway
                // contextids: contexts are the IDs of all the contexts that will be used in those statements

                var req = {
                    body:  {
                        entry: {
                            body: ''
                        },
                        context: default_context
                    },

                    contextids: contexts,
                    internal: 1
                };


                submitRelations(req, res, searchQuery);

            }

        });


        function submitRelations(req, res, searchQuery) {

            phantom.create(function (ph) {
                ph.createPage(function (page) {
                    page.set('settings.userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1');
                    page.open("http://www.google.com/ncr", function (status) {
                        console.log("opened google NCR ", status);

                        if (status == 'fail') {
                            res.error('Something went wrong getting the results you need.');
                            res.redirect('back');
                        }

                        page.evaluate(function () { return document.title; }, function (result) {
                            console.log('Page title is ' + result);
                            page.open("https://www.google.com/search?gws_rd=ssl&site=&source=hp&q=" + searchQuery, function (status) {
                                console.log("opened google Search Results ", status);
                                if (status == 'fail') {
                                    res.error('Something went wrong opening search results. Maybe try again?');
                                    res.redirect('back');
                                }
                                setTimeout( function() {
                                    page.evaluate(function () { return document.body.innerHTML; }, function (result) {

                                        // Get the first search results page but only from also search for... sentence
                                        setTimeout( function() {

                                            var truncresult = result.substr(result.indexOf('also search for'));

                                            // Load result in Cheerio
                                            var $ = cheerio.load(truncresult);


                                            // Get the link to more results
                                            var expandedurl = $("._Yqb").attr('href');

                                            // Open that link

                                            page.open("https://www.google.com" + expandedurl, function (status) {
                                                console.log("opened connections page ", status);
                                                if (status == 'fail') {
                                                    res.error('Something went wrong importing connections. Maybe try again?');
                                                    res.redirect('back');
                                                }
                                                page.evaluate(function () { return document.body.innerHTML; }, function (result) {

                                                            var $ = cheerio.load(result);

                                                            searchQuery = searchQuery.replace(/\./g, "");

                                                            searchQuery = searchQuery.replace(/\,/g, "");

                                                            if ($(".kltat").length < graphconnections) {
                                                                graphconnections = $(".kltat").length;
                                                            }

                                                            $(".kltat").each(function (index) {
                                                                    var link = $(this);
                                                                    var text = link.text();

                                                                    text = text.replace(/\./g, "");

                                                                    text = text.replace(/\,/g, "");

                                                                    var statement = 'people who search for #' + searchQuery.replace(/ /g,"_") + ' also search for #' + text.replace(/ /g,"_");

                                                                    req.body.entry.body = statement;

                                                                    entries.submit(req, res);

                                                                    if (index == (graphconnections - 1)) {
                                                                        ph.exit();
                                                                        res.error('Importing connections... Reload this page in a few seconds.');
                                                                        res.redirect(res.locals.user.name + '/' + default_context + '/edit');
                                                                        return false;
                                                                    }

                                                            });

                                                });
                                            });

                                        }, 1000);

                                    }, 1000);
                                });

                                // end of eval

                            });

                        });
                    });
                });
            });

        }

    }
    else if (service == 'file') {

        console.log(req.files);

        console.log(req.files.uploadedFile.type);

        var process_type = 'classes';

        // Is the file uploaded and is it a text / html one?
        if (req.files && (req.files.uploadedFile.type == 'text/html' || req.files.uploadedFile.type == 'text/plain' || req.files.uploadedFile.type == 'application/pdf') ) {

            // Import parameters
            var titlefield = '';

            if (req.body.titlefield && req.body.titlefield.length > 0) {
                titlefield = '.' + req.body.titlefield;
            }



            var processfield = '.highlight';

            if (req.body.processfield) {
                processfield = '.' + req.body.processfield;
            }

            var filecontents = ''
            // Read that file



            fs.readFile(req.files.uploadedFile.path, function (err, data) {
                if (err) throw err;

                if ( req.files.uploadedFile.type != 'application/pdf') {
                  filecontents = data.toString('utf8');
               }
               else {
                  filecontents = data;
               }



                // Load DIVs in the file contents
                var $ = cheerio.load(filecontents);


                // Now step by step...
                async.waterfall([

                    function(callback){

                        var addToContexts = [];

                        // Is there any DIVs with the class .title in that file? This is how we check if it's an Amazon file
                        // TODO add another check for other type of files

                        if (titlefield && $(titlefield).length) {
                            $(titlefield).each(function (index) {


                                // Get the book names
                                var bookname = $(this).text();


                                // Translate the book name into the context name
                                var currentcontext = S(bookname).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                                currentcontext = currentcontext.replace(/[^\w]/gi, '');
                                currentcontext = currentcontext.substr(0,12);

                                addToContexts.push(currentcontext);

                            });
                         }
                        else  {
                            var currentcontext = S(importContext).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                            currentcontext = currentcontext.replace(/[^\w]/gi, '');
                            currentcontext = currentcontext.substr(0,12);
                            addToContexts.push(importContext);
                        }


                        validate.getContextID(user_id, addToContexts, function(result, err) {

                                if (err) {
                                    res.error('Something went wrong when adding contexts into Neo4J database. Could be a problem with the file.');
                                    res.redirect('back');
                                }

                                else {

                                    // What are the contexts that already exist for this user and their IDs?
                                    // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                                    var contexts = result;

                                    console.log('Extracted contexts from DB with IDs');
                                    console.log(contexts);

                                    callback(null, contexts);
                                }

                        });




                    },
                    function(contexts, callback){

                        // Do import fields exist?
                        if ($(processfield).length) {
                            callback(null,contexts);
                        }
                        // TODO or PDF
                        else if (req.files.uploadedFile.type == 'text/plain' || req.files.uploadedFile.type == 'application/pdf') {
                          process_type = 'book';
                          console.log('processing book');
                          callback(null,contexts);
                        }

                        else {
                            err = 'Sorry, but InfraNodus does not recognize this kind of content yet. Add a feature request on our GitHub and we will look into it.';
                            callback(err);
                        }


                    }
                ], function (err, contexts) {

                    if (err) {

                        console.log(err);
                        res.error(err);
                        res.redirect('back');

                    }
                    else {

                        // Separate Amazon highlights file into blocks by the books


                        if (process_type != 'book') {

                          console.log("Processing file by classes");
                          var books = filecontents.split("bookMain yourHighlightsHeader");

                          var numHighlights = 0;

                        for (var i = 0; i < books.length; i++) {

                            var current_book = books[i];
                            var $$ = cheerio.load(current_book);

                            // Get the name of the book
                            var bookname = '';

                            if (titlefield && $$(titlefield).length) {
                                bookname = $$(titlefield).first().text();
                            }
                            else {
                                bookname = importContext;
                            }



                            // Convert it to the context name
                            // TODO this repeats the function above from validate.ContextID so make sure not to change it if the above is not changed also
                            var currentcontext = S(bookname).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                                currentcontext = currentcontext.replace(/[^\w]/gi, '');
                                currentcontext = currentcontext.substr(0,12);


                            $$(processfield).each(function (index) {

                                // Get the book names
                                var highlight = $(this).text();


                                // Check the corresponding context ID for the book name
                                var addingcontexts = [];

                                for (var j = 0; j < contexts.length; j++) {
                                     if (contexts[j].name == currentcontext) {
                                          addingcontexts.push(contexts[j]);
                                     }
                                }

                                // Only add a statement if it's below the max limit
                                if (numHighlights < limit) {
                                     saveHighlight(highlight, addingcontexts);
                                }

                                numHighlights++;

                            });


                        }
                        }
                        // if it's a book
                        else {



                          console.log("Processing file as a whole");
                            var bookname = '';
                            bookname = importContext;

                            var currentcontext = S(bookname).dasherize().chompLeft('-').camelize().s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                                currentcontext = currentcontext.replace(/[^\w]/gi, '');
                                currentcontext = currentcontext.substr(0,12);

                                // Check the corresponding context ID for the book name
                                var addingcontexts = [];

                                for (var j = 0; j < contexts.length; j++) {
                                     if (contexts[j].name == currentcontext) {
                                          addingcontexts.push(contexts[j]);
                                     }
                                }

                                if (req.files.uploadedFile.type == 'application/pdf') {
                                  //PDF cases
                                  var PDFtextfull = '';
                                  new pdfreader.PdfReader().parseBuffer(filecontents, function(err, item){
                                    if (err)
                                      callback(err);
                                    else if (!item) {

                                      saveFileAtOnce(PDFtextfull, addingcontexts);

                                      callback();

                                      }
                                    else if (item.text) {
                                      PDFtextfull += item.text + ' \r\n';

                                      }
                                  });

                                }
                                else {

                                  saveFileAtOnce(filecontents, addingcontexts);

                                  }





                        }



                        function saveFileAtOnce(fullfiletext, contexts) {



                                // and finally create an object to send this entry with the right context

                                var req = {
                                    body:  {
                                        entry: {
                                            body: fullfiletext
                                        },
                                        context: ''
                                    },

                                    contextids: contexts
                                };


                               entries.submit(req,res);


                        }





                        // Move on to the next one
                        res.error('Importing the content... Please, reload this page in 30 seconds...');

                        if (titlefield.length == 0 && importContext) {
                            res.redirect(res.locals.user.name + '/' + importContext + '/edit');
                        } else {
                            res.redirect(res.locals.user.name + '/edit');
                        }

                    }
                });

                // delete file
                fs.unlink(req.files.uploadedFile.path, function (err) {
                    if (err) throw err;
                    console.log('successfully deleted ' + req.files.path);
                });
            });
        }

        else {
            res.error('Sorry, but InfraNodus does not recognize this kind of content yet. Add a feature request on GitHub and we will look into it.');
            res.redirect('back');
        }



    }

    else if (service == 'url') {

        var numHighlights = 0;

        //console.log(req.body);

        var processfield = validate.sanitize(req.body.processfield);
        var processheadline = validate.sanitize(req.body.processheadline);
        var processteaser = validate.sanitize(req.body.processteaser);
        var processurl = validate.sanitize(req.body.processurl);

        console.log("processing url " + req.body.url);
        console.log(importContext);

        if (!processheadline){
          processheadline = '';
        }
        if (!processteaser){
          processteaser = '';
        }
        if (!processurl){
          processurl = '';
        }

        var addToContexts = [];

        addToContexts.push(importContext);

        var options = {
            uri: req.body.url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1'
            },
            transform: function (body) {
               return cheerio.load(body);
            }
        };


        validate.getContextID(user_id, addToContexts, function(result, err) {

                if (err) {
                    res.error('Something went wrong when adding contexts into Neo4J database. Try to choose a different name and do not use special characters.');
                    res.redirect('back');
                }

                else {

                    // What are the contexts that already exist for this user and their IDs?
                    // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                    var contexts = result;


                    var atLeastOne = 0;

                    console.log('entering to RP');

                    rp(options)

                      .then(function ($) {

                          console.log('successful RP');

                          if (processfield.length == 0 || $(processfield).length == 0) {
                            console.log('entering automatic text extraction');
                            console.log(importContext);
                            // TODO include options limitation
                            var extracteddata = extractor($.html());
                            var thisurl = req.body.url;

                            saveHighlight(extracteddata.text.substr(0,89000) + ' ' + thisurl, contexts);

                            res.message('Importing the content automatically... Please, reload this page in 30 seconds...');
                            res.redirect(res.locals.user.name + '/' + importContext + '/edit');

                          }
                          else {
                          $(processfield).each(function (index) {

                                if (processurl.length > 0) {
                                      var thisurl = $(this).find(processurl).attr('href');
                                }
                                else {
                                      var thisurl = '';
                                }

                                if (processheadline.length > 0) {
                                      var thisheadline = $(this).find(processheadline).text();
                                }
                                else {
                                      var thisheadline = '';
                                }

                                if (processteaser.length > 0) {
                                      var thisteaser = $(this).find(processteaser).text();
                                }
                                else {
                                      var thisteaser = '';
                                }

                                var thisprocessurl = processurl;


                                if (thisurl === undefined || !thisurl || thisurl == 'undefined' || thisurl == undefined) {

                                    thisprocessurl = processurl + ' a';
                                    thisurl = $(this).find(thisprocessurl).attr('href');

                                }

                                if ((thisheadline.length > 0 || thisteaser.length > 0) && (atLeastOne <= limit)) {
                                  console.log('processing snippet');
                                  saveHighlight(thisheadline + ' ' + thisteaser + ' ' + thisurl, contexts);
                                  atLeastOne = atLeastOne + 1;
                                }


                            });
                              console.log('processing continues');
                            if (atLeastOne == 0) {
                                console.log('enter condition');
                                var thisurl = req.body.url;
                              $(processfield).each(function (index) {
                                      if (atLeastOne <= limit) {
                                        console.log('processing text');
                                        console.log($(this).text());
                                        saveHighlight($(this).text() + ' ' + thisurl, contexts);
                                        atLeastOne = atLeastOne + 1;
                                      }

                              });
                            }

                            res.message('Importing the content based on your classes... Please, reload this page in 30 seconds...');
                            res.redirect(res.locals.user.name + '/' + importContext + '/edit');
                        }

                       })
                       .catch(function (err) {
                         console.log('nonsuccessful RP');
                         res.error('Could not access the URL specified or extract any information.' + err);
                         res.redirect('back');
                       });


                }

        });



    }

    else if (service == 'rss') {

        var rssSubmitted = validate.sanitize(req.body.rssinput);

        var rssRequested = rssSubmitted.split(/\s+/).slice(0,10);

        var addToContexts = [];

        var totalProcessed = 0;

        var rssItemsMax = validate.sanitize(req.body.rssitems);

        addToContexts.push(importContext);

        validate.getContextID(user_id, addToContexts, function(result, err) {

                if (err) {
                    res.error('Something went wrong when adding contexts into Neo4J database. Try to choose a different name and do not use special characters.');
                    res.redirect('back');
                }

                else {

                    // What are the contexts that already exist for this user and their IDs?
                    // Note: actually there's been no contexts, so we just created IDs for all the contexts contained in the statement
                    var contexts = result;

                    // How many statements from each RSS feed do we take max?
                    var limito;

                    if (rssItemsMax) {
                      if (rssItemsMax < 300) {
                        limito = rssItemsMax;
                      }
                      else {
                        limito = 10;
                      }
                    }

                    for (var item in rssRequested) {

                      // How many RSS feeds in total can we process?

                          feedparser.parse(rssRequested[item]).then( (items) => {

                              var rssIterations = 0;

                              items.forEach(itemo => {

                                if (rssIterations < limito) {

                                    var thisheadline =  S(itemo.title).stripTags().s;
                                    var thisteaser = S(itemo.description).stripTags().s.replace('Continue reading...', ' ').replace('&nbsp;',' ');
                                    var thisurl = S(itemo.link).stripTags().s;

                                    saveHighlight(thisheadline + ' ' + thisurl, contexts);

                                    rssIterations = rssIterations + 1;
                                    totalProcessed = totalProcessed + 1;

                               }

                              });
                            // TODO do something about processing stopping after a certain point in case there are troubles
                            }).catch(error => {
                              console.log('ERROR WITH RSS FEED');
                              console.log(error);
                              // res.message('Something went wrong with one of the RSS feeds... Please, reload this page in 30 seconds... If nothing appears, go back.');
                              // res.redirect(res.locals.user.name + '/' + importContext + '/edit');
                            });




                    }

                      res.message('Importing the RSS feeds... Please, reload this page in 30 seconds...');
                      res.redirect(res.locals.user.name + '/' + importContext + '/edit');


                }

        });



    }

    else if (service == 'googlesearch')  {

            google.lang = 'us';
            google.tld = 'us';

            google.resultsPerPage = limit;
            var nextCounter = 0;


            var statements = [];

            var default_context = importContext;

            var addToContexts = [];
            addToContexts.push(default_context);

            var excludesearchquery = req.body.excludesearchquery;

            validate.getContextID(user_id, addToContexts, function(result, err) {

            if (err) {
                console.log(err);
                res.error('Something went wrong when adding a new context into the database. Try changing its name or open an issue on GitHub.');
                res.redirect('back');
            }

            else {
                var contexts = result;
                var req = {
                    body:  {
                        entry: {
                            body: []
                        },
                        context: default_context
                    },

                    contextids: contexts,
                    internal: 1,
                    multiple: 1

                };

                // TODO to get also page titles

                google(searchString, function(err, resp){

                    if (err)    {
                        console.log(err);
                        res.error(JSON.stringify(err));
                        res.redirect('back');
                    }

                    for (var i = 0; i < resp.links.length; ++i) {

                        var searchtext = '';

                        // We don't show titles because otherwise there's overload of search terms in the graph
                        // searchtext = resp.links[i].title;

                        searchtext += resp.links[i].description;
                        searchtext += ' ' + resp.links[i].href;
                        searchtext = searchtext.replace(/(0?[1-9]|[12][0-9]|3[01])\s{1}(Jan|Feb|Mar|Apr|May|Jun|Jul|Apr|Sep|Oct|Nov|Dec)\s{1}\d{4}/g, '');

                        if (excludesearchquery) {

                            var searchterms = searchString.split(" ");

                            for (var k = 0; k < searchterms.length; k++) {

                                // Remove the search term from the Google results
                                // TODO maybe there's a way of keeping them in the text and removing the nodes
                                var searchPattern = new RegExp('('+searchterms[k]+')', 'ig');
                                searchtext = searchtext.replace(searchPattern,' ');

                                // Now we find lemmas, so we deal with plural cases and also with Russian word endings and suffixes
                                // TODO this whole thing should be moved outside of this function and Russian lemmas should be added to stopwords not deleted from text

                                if (/[а-яА-ЯЁё]/.test(searchterms[k]) == true) {
                                    var lemmaterm = lemmerRus.lemmatize(searchterms[k]);
                                    if (lemmaterm[0] != undefined) {
                                        searchPattern = new RegExp('('+lemmaterm[0].toLowerCase()+')', 'ig');
                                        searchtext = searchtext.replace(searchPattern,' ');
                                    }
                                }

                                // English?

                                else {
                                    var lemmaterm = lemmerEng.lemmatize(searchterms[k]);
                                    if (lemmaterm[0] != undefined) {
                                        searchPattern = new RegExp('('+lemmaterm[0].toLowerCase()+')', 'ig');
                                        searchtext = searchtext.replace(searchPattern,' ');
                                    }
                                }



                            }
                        }

                        req.body.entry.body[i] = searchtext;


                    }

                    entries.submit(req, res);



                });




            }
            });








    }

    function saveHighlight(highlight, contexts) {

            // and finally create an object to send this entry with the right context

            var req = {
                body:  {
                    entry: {
                        body: highlight
                    },
                    context: ''
                },

                contextids: contexts,
                internal: 1,
            };


           entries.submit(req,res);


    }




};
