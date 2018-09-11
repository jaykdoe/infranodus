/**
 * InfraNodus is a non-linear reading device.
 *
 * Inspired from ThisIsLike.Com and KnowNodes (now Rhizi) we
 * want to create a basic interface for rich edge annotation of graphs
 * for collaborative use.
 *
 * This open source, free software is available under MIT license.
 * It is provided as is, with no guarantees and no liabilities.
 *
 * You are very welcome to reuse this code if you keep this notice.
 *
 * Written by Dmitry Paranyushkin | Nodus Labs and hopefully you also...
 * www.noduslabs.com | info AT noduslabs DOT com
 *
 *
 * In some parts the code from the book "Node.js in Action" is used,
 * (c) 2014 Manning Publications Co.
 * by Marc Harter, T.J. Holowaychuk, Nathan Rajlich
 * Any source code files provided as a supplement to the book are freely
 * available to the public for download. Reuse of the code is permitted,
 * in whole or in part, including the creation of derivative works, provided
 * that you acknowledge that you are using it and identify the source:
 * title, publisher and year.
 */

var api = require('./routes/api');
var api2 = require('./routes/api2');
var express = require('express');
var routes = require('./routes');
var oauths = require('./routes/evernote');
var entries = require('./routes/entries');
var Entry = require('./lib/entry');
var page = require('./lib/middleware/page');
var validate = require('./lib/middleware/validate');
var user = require('./lib/middleware/user');
var register = require('./routes/register');
var login = require('./routes/login');
var main = require('./routes/main');
var messages = require('./lib/messages');
var http = require('http');
var path = require('path');

var pass = require('./lib/pass')
var passport = require('passport');

var settings = require('./routes/settings');
var imports = require('./routes/imports');

var app = express();

var server = http.Server(app);
var io = require('socket.io')(server);

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.use(express.bodyParser());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// This makes sure that when someone accesses external /api2 they are authenticated first
app.use('/api2', api2.auth);

app.use(user);
app.use(messages);
app.use(app.router);
app.use(routes.notfound);
app.use(routes.error);
app.use(routes.badrequest);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


// First we declare all the static paths in the script

app.get('/signup', register.form);
app.post('/signup', register.submit);
app.get('/login', pass.checkLogin, login.form);

// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
app.post('/login', login.submit);

app.get('/logout', login.logout);
app.get('/post', entries.form);
app.post(
    '/post',
    pass.ensureAuthenticated,
    validate.isLoggedIn(),
    validate.isToDelete(),
    validate.getContextForEntry('entry[body]'),
    entries.submit
);

app.post(
    '/context',
    pass.ensureAuthenticated,
    validate.changeContextPrivacy()
);

// Internal API to get nodes and statements for user's own nodes
app.get('/api/user/nodes/:context?', api.nodes);

// Internal API to get nodes and statements for somebody else's nodes in context
app.get('/api/public/nodes/:user?/:context?', validate.getUserID(), validate.getContextPrivacy(), api.nodes);

app.get('/api/user/statements/:context?', api.entries);
app.get('/api/:user/lda/:type/:context?', validate.getUserID(), api.entriesLDA);

// Get connected texts through internal connector function
app.get('/api/connectedcontexts/',  validate.getUserID(), api.connectedcontextsoutside);

app.get('/api/:user/connectedcontexts/', validate.getUserID(), api.connectedcontexts);


// External API to get nodes and statements
app.get('/api2/user/nodes/:context?', api2.nodes);
app.get('/api2/user/statements/:context?', api2.entries);

// For posting through API POST parameters:
// entry[body] is the statement,
// context is the context (optional, default: private),
// statementid is the ID of a statement to edit / delete (optional)
// submit = 'edit' to edit, delete = 'delete' to delete (optional)
app.post('/api2/post',
    validate.isToDelete(),
    validate.getContextForEntry('entry[body]'),
    entries.submit);

app.get('/settings', pass.ensureAuthenticated, validate.getContextsList(), settings.render);
app.post('/settings', pass.ensureAuthenticated, settings.modify);
app.get('/import', pass.ensureAuthenticated, validate.getContextsList(), imports.render);
app.get('/google', pass.ensureAuthenticated, validate.getContextsList(), imports.renderGoogle);
app.get('/import/youtube', pass.ensureAuthenticated, validate.getContextsList(), imports.renderYouTube);
app.get('/importurl', pass.ensureAuthenticated, validate.getContextsList(), imports.renderURL);
app.get('/importrss', pass.ensureAuthenticated, validate.getContextsList(), imports.renderRSS);
app.get('/apps', pass.ensureAuthenticated, validate.getContextsList(), imports.renderApps);
app.get('/twitter', pass.ensureAuthenticated, validate.getContextsList(), imports.renderTwitter);
app.post('/import', pass.ensureAuthenticated, imports.submit);

app.get('/evernote_oauth', oauths.oauth);
app.get('/evernote_oauth_callback', oauths.oauth_callback);
app.get('/evernote_clear', oauths.clear);

// From here we declare all the dynamic paths at the first level of the content tree

app.get('/:user/edit', pass.ensureAuthenticated, validate.getContextsList(), entries.list);
app.get('/:user/:context?/edit', pass.ensureAuthenticated, validate.getContextPrivacy(), validate.getContextsList(), entries.list);
app.get('/:user/:context?', pass.checkUser, validate.getUserID(), validate.getContextPrivacy(), validate.getContextsList("public"), entries.list);
app.get('/', main.render);



if (process.env.ERROR_ROUTE) {
    app.get('/dev/error', function(req, res, next){
        var err = new Error('database connection failed');
        err.type = 'database';
        next(err);
    });
}


server.listen(app.get('port'), function(){

  console.log('Express server listening on port ' + app.get('port'));
});

// could be var chat = to make it recursive

io.on('connection', function(socket){

    console.log('a user socket connected');

    socket.on('disconnect', function(data){

        console.log('user disconnected');

        // let's count how many people are left in a room
        var room = io.sockets.adapter.rooms[socket.room];
        var people_remaining = 1;

        // TODO that shouldn't be called if not needed
        if (room != undefined) {
          people_remaining = room.length;
        }

        console.log('users left');
        console.log(room);
        console.log(people_remaining);
        // Notify the other person in the chat room
        // that his partner has left
        socket.broadcast.to(socket.room).emit('leave', {
            boolean: true,
            people: people_remaining
        });

    });
    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
        io.sockets.in(socket.room).emit('chat message', msg);
        // io.emit('chat message', msg);
    });
    socket.on('delete message', function(msg){
        console.log('message: ' + msg);
        io.sockets.in(socket.room).emit('delete message', msg);
        // io.emit('chat message', msg);
    });
    socket.on('node click', function(msg){
        socket.broadcast.to(socket.room).emit('node click', msg);
    });
    socket.on('node delete', function(msg){
        io.sockets.in(socket.room).emit('node delete', msg);
    });
    socket.on('node add', function(msg){
        io.sockets.in(socket.room).emit('node add', msg);
    });
    socket.on('graph reset', function(msg){
        io.sockets.in(socket.room).emit('graph reset', msg);
    });
    socket.on('login', function(data){

            // Use the socket object to store data. Each client gets
            // their own unique socket object
            socket.username = data.user;
            socket.room = data.id;

            // Add the client to the room
            socket.join(data.id);

            // Send the startChat event to all the people in the
            // room, along with a list of people that are in it.

            socket.to(data.id).emit('startChat', {
                boolean: true,
                id: data.id
            });

    });
});
