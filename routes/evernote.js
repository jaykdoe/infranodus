var Evernote = require('evernote');

var config = require('../config.json');
var callbackUrl = config.evernote.CALLBACK_URL;

// home page
exports.index = function(req, res) {
    if(req.session.oauthAccessToken) {
        var token = req.session.oauthAccessToken;
        var client = new Evernote.Client({
            token: token,
            sandbox: config.evernote.SANDBOX
        });
        var noteStore = client.getNoteStore();
        noteStore.listNotebooks(function(err, notebooks){
            req.session.notebooks = notebooks;
            res.render('index');
        });
    } else {
        res.render('index');
    }
};

// OAuth
exports.oauth = function(req, res) {
    var client = new Evernote.Client({
        consumerKey: config.evernote.API_CONSUMER_KEY,
        consumerSecret: config.evernote.API_CONSUMER_SECRET,
        sandbox: config.evernote.SANDBOX
    });

    client.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results){
        if(error) {
            req.session.error = JSON.stringify(error);
            console.log('error');
            res.redirect('/');
        }
        else {
            // store the tokens in the session
            req.session.oauthToken = oauthToken;
            req.session.oauthTokenSecret = oauthTokenSecret;

            // redirect the user to authorize the token
            res.redirect(client.getAuthorizeUrl(oauthToken));
        }
    });

};

// OAuth callback
exports.oauth_callback = function(req, res) {
    var client = new Evernote.Client({
        consumerKey: config.evernote.API_CONSUMER_KEY,
        consumerSecret: config.evernote.API_CONSUMER_SECRET,
        sandbox: config.evernote.SANDBOX
    });

    client.getAccessToken(
        req.session.oauthToken,
        req.session.oauthTokenSecret,
        req.query.oauth_verifier,
        function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
            if(error) {
                console.log('error');
                console.log(error);
                res.redirect('/');
            } else {
                // store the access token in the session
                req.session.oauthAccessToken = oauthAccessToken;
              
                // req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
                // req.session.edamShard = results.edam_shard;
                // req.session.edamUserId = results.edam_userId;
                // req.session.edamExpires = results.edam_expires;
                // req.session.edamNoteStoreUrl = results.edam_noteStoreUrl;
                // req.session.edamWebApiUrlPrefix = results.edam_webApiUrlPrefix;
                res.redirect('/import');
            }
        });
};

// Clear session
exports.clear = function(req, res) {
    req.session.oauthAccessToken = '';
    res.redirect('/import');
};
