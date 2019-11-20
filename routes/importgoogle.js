var validate = require('../lib/middleware/validate')
var entries = require('../routes/entries')
var options = require('../options')
var config = require('../config.json')
const https = require('https');

var max_length = options.settings.max_text_length
var max_total_length = options.settings.max_total_text_length
var max_file_length = options.settings.max_file_length


// Lemmatizer module initialization
const Morphy = require('phpmorphy-locutus').default

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



// POST request to the settings page (change settings)

exports.submitGoogle = function(req, res, next) {
    var user_id = res.locals.user.uid

    var user_name = res.locals.user.name

    // What will we analyze?
    var service = req.body.source

    // What will we be extracting
    var extract = req.body.extract

    var searchString = ''

    // What is the search string
    if (!req.body.search || req.body.search == '') {
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


    // List to be used for import
    var importContext = 'imported'

    if (
        req.body.context &&
        req.body.context.length > 0 &&
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

    if (service == 'googlesearch') {

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

}