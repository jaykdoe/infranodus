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
var options = require('../options')

// GET request to the /settings page (view settings)

exports.render = function(req, res) {
    var contextslist = []
    if (res.locals.contextslist) {
        contextslist = res.locals.contextslist
    }
    res.render('settings', { title: 'Settings', contextlist: contextslist })
}

// POST request to the settings page (change settings)

exports.modify = function(req, res) {
    var user_id = res.locals.user.uid

    var fullscan = req.body.fullscan

    var fullview = req.body.fullview

    var morphemes = req.body.morphemes

    var hashnodes = req.body.hashnodes

    var mentions = req.body.mentions

    var maxnodes = options.settings.max_nodes

    var customization = req.body.customization

    var inlanguage = req.body.inlanguage

    var palette = req.body.palette

    var midi_node_note = req.body.midinodenote
    var midi_edge_note = req.body.midiedgenote

    var midi =
        '' +
        req.body.midinodechannel +
        '' +
        req.body.midiedgechannel +
        '' +
        req.body.mididevice +
        '' +
        req.body.mididuration +
        '' +
        midi_node_note +
        '' +
        midi_edge_note +
        '' +
        req.body.midiinput

    if (req.body.midiactive == 'off') {
        midi = 'off'
    }

    var voice_continues = req.body.voice_continues

    var abstract = req.body.abstract

    var background = req.body.background

    var label_threshold = req.body.label_threshold

    var topnodes = req.body.topnodes

    var stopwords = req.body.stopwords

    if (isInt(req.body.maxnodes)) {
        maxnodes = req.body.maxnodes
    }

    function isInt(value) {
        return (
            !isNaN(value) &&
            (function(x) {
                return (x | 0) === x
            })(parseFloat(value))
        )
    }

    User.modifySettings(
        user_id,
        fullscan,
        fullview,
        morphemes,
        hashnodes,
        maxnodes,
        inlanguage,
        palette,
        background,
        midi,
        voice_continues,
        abstract,
        label_threshold,
        topnodes,
        mentions,
        customization,
        stopwords,
        function(err, answer) {
            // Error? Go back and display it.

            if (err) {
                console.log(answer)
                res.error('Sorry, there was an error updating your details.')
                res.redirect('back')
            }

            // If all is good, make a message for the user and reload the settings page
            else {
                res.error('Your settings have been updated.')

                // To just render the page, use: res.render('settings', { title: 'Settings' });

                // To reload the page:

                res.redirect('/settings')
            }
        }
    )
}
