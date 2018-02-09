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

var Entry = require('../lib/entry');
var FlowdockText = require("flowdock-text");
var validate = require('../lib/middleware/validate');
var options = require('../options');
var async = require('async');


exports.list = function(req, res, next){

    // The one who sees the statements (hello Tengo @1Q84 #Murakami)
    var receiver = '';

    // The one who made the statements (hello Fuka-Eri @1Q84 #Murakami)
    var perceiver = '';

    var receivername = null;

    var perceivername = null;

    var contextpublic = null;

    // We checked the context using validate.getContextPrivacy() function and got the variable for it
    if (res.locals.contextpublic) {
        contextpublic = res.locals.contextpublic;
    }

    // If the user is logged in then we know the ID and the name of the user who is viewing
    if (res.locals.user) {
        if (!res.locals.user.publicview) {
            receiver = res.locals.user.uid;
        }
        receivername = res.locals.user.name;

    }

    // Is there user name in the requested URL AND we know their ID already? Then the entries of that user will be shown
    if (req.params.user && res.locals.viewuser) {
        perceiver = res.locals.viewuser;
        perceivername = req.params.user;
    }


    console.log('wtf');
    console.log(receiver);
    console.log(perceiver);
    // Let's see what context the user wants to view if there is one

    var contexts = [];
        contexts.push(req.params.context);

    // Do we want to compare it with another ?addcontext=... ?

    if (req.query.addcontext) contexts.push(req.query.addcontext);

    // Now let's arrange what users we want to see and what information

    Entry.getRange(receiver, perceiver, contexts, function(err, entries) {
        if (err) return next(err);

        // Add links to @contexts and #hashtags
        for (var i = 0; i < entries.length; ++ i) {
              //entries[i].text = FlowdockText.autoLinkMentions(entries[i].text,{hashtagUrlBase:"/contexts/",hashtagClass:"app-context-link"});
              //entries[i].text = FlowdockText.autoLinkHashtags(entries[i].text,{hashtagUrlBase:"/concepts/",hashtagClass:"app-concept-link"});
            entries[i].text = validate.safe_tags(entries[i].text);
            entries[i].text = FlowdockText.autoLinkUrlsCustom(entries[i].text,{class:"app-url-link",target:"_blank"});

        }

        console.log("Showing statements to user " + receiver);
        console.log("Statements made by " + perceiver);

        for (var s=0;s<contexts.length;++s) {
            if (contexts[s] == 'undefined' || typeof contexts[s] === 'undefined') {
                contexts[s] = '';
            }
        }

        res.render('entries', {
            title: 'InfraNodus: Polysingularity Thinking Tool',
            entries: entries,
            context: contexts[0],
            addcontext: req.query.addcontext,
            perceivername: perceivername,
            receivername: receivername,
            contextpublic: contextpublic,
            showcontexts: req.query.showcontexts,
            background: req.query.background,
            maxnodes: req.query.maxnodes,
            url: req.query.url,
            urltitle: req.query.urltitle
        });
    });
};

exports.form = function(req, res){
    res.render('post', { title: 'Post' });
};

exports.submit = function(req, res, next){

    // Retrieve the statement
    var statement = req.body.entry.body;

    // Retrieve the context where user was in when submitting the statement
    var default_context = req.body.context;

    // Pass on the context IDs from the DB
    var contextids = req.contextids;

    // Some parameter settings
    var max_length = options.settings.max_text_length;
    var min_length = options.settings.min_text_length;
    var maxhash = options.settings.max_hashtags;

    // Generate new timestamp and multiply it by 10000 to be able to track the sequence the nodes were created in
    var timestamp = new Date().getTime() * 10000;

    if (req.body.timestamp) {
        timestamp = req.body.timestamp;
    }

    // A series of checks before the statement is submitted
    async.waterfall([
        function(callback){
            if (!statement) {
                callback('Please, enter a statement');
            }
            else if (statement.length <= min_length) {
                callback('A statement must have more than ' + min_length + ' characters');
            }
            else if (statement.length > max_length) {
                callback('Try to make it less than ' + max_length + ' characters, please...');
            }
            else {
                callback(null, statement);
            }
        },
        function(statement, callback){
            statement = validate.sanitize(statement);
            callback(null, statement);
        },
        function(statement, callback){

            var hashtags = validate.getHashtags(statement, res);

            if (req.onlymentions) {
                hashtags = '';
            }
            
            var mentions = validate.getMentions(statement);

            if (req.excludementions) {
                mentions = '';
            }


            if  (!hashtags && mentions.length < 1) {
                callback('There should be at least one word, #hashtag or @mention.');
            }
            else {
                if (hashtags) {
                    if (hashtags.length >= maxhash) {
                        callback('Please, try to use less than ' + maxhash + ' #hashtags');
                    }
                    else {
                        callback(null, statement, hashtags, mentions);
                    }
                }
                else {
                    callback(null, statement, hashtags, mentions);
                }
            }
        },
        function(statement, hashtags, mentions, callback){

            // Put all the contexts that came with the statement into a new variable

            var contexts = [];

            if (contextids.length > 0) {
                for (var i = 0; i < contextids.length; i++) {
                        contexts.push(contextids[i]);
                }
                callback(null, statement, hashtags, contexts, mentions);
            }
            else {
                callback('Please, select a context for this statement');
            }


        },
        function(statement, hashtags, contexts, mentions, callback){
            // Then we ascribe the data that the Entry object needs in order to survive
            // We create various fields and values for that object and initialize it

            var entry = new Entry({
                "by_uid": res.locals.user.uid,
                "by_id": res.locals.user.uid,
                "by_name": res.locals.user.name,
                "contexts": contexts,
                "hashtags": hashtags,
                "mentions": mentions,
                "text": statement,
                "fullscan": res.locals.user.fullscan,
                "timestamp": timestamp

            });
            callback(null, entry);
        }
    ], function (err, entry) {

        if (err) {

            console.log(err);

            if (!req.internal) {
                res.send({errormsg: err});
               // res.redirect('back');
            }

        }
        else {
            entry.save(function(err, answer) {
                if (err) {
                    if (req.internal) {

                    }
                    else {
                        return next(err);
                    }
                }
                if (req.remoteUser) {
                    res.json({message: 'Entry added.'});
                }
                else if (req.internal) {
                    //next();
                }
                else {
                    if (req.body.delete == 'delete' || req.body.btnSubmit == 'edit' || req.body.delete == 'delete context') {
                        if (default_context == 'undefined' || typeof default_context === 'undefined' || default_context == '') {
                         res.redirect('/' + res.locals.user.name + '/edit');
                         }
                         else {
                         res.redirect(res.locals.user.name + '/' + default_context + '/edit');

                         }


                    }
                    else {

                        // TODO find a better way of dealing with Edit and Delete

                    var receiver = res.locals.user.uid;
                    var perceiver = res.locals.user.uid;
                    var showcontexts = req.query.showcontexts;
                    var fullview = res.locals.user.fullview;
                    var contexts = [];

                    contexts.push(default_context);

                    Entry.getNodes(receiver, perceiver, contexts, fullview, showcontexts, res, req, function(err, graph){
                        if (err) return next(err);

                        // Change the result we obtained into a nice json we need
                        res.send({entryuid: answer, entrytext: statement, graph: graph});

                    });

                    }



                }
            });
        }
    });


};
