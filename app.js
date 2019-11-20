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

var api = require('./routes/api')
var api2 = require('./routes/api2')
var express = require('express')
var oauths = require('./routes/evernote')
var entries = require('./routes/entries')
var Entry = require('./lib/entry')
var page = require('./lib/middleware/page')
var validate = require('./lib/middleware/validate')
var user = require('./lib/middleware/user')
var register = require('./routes/register')
var login = require('./routes/login')
var main = require('./routes/main')
var messages = require('./lib/messages')
var http = require('http')
var path = require('path')

var bodyParser = require('body-parser')
var favicon = require('serve-favicon')
var morgan = require('morgan')
var session = require('express-session')
var cookieParser = require('cookie-parser')
var methodOverride = require('method-override')
var errorhandler = require('errorhandler')
var serveStatic = require('serve-static')

var multer = require('multer')
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './tmp');
     },
    filename: function (req, file, cb) {
        cb(null , file.originalname);
    }
});
var upload = multer({ storage: storage })

var options = require('./options')

var pass = require('./lib/pass')
var passport = require('passport')

var settings = require('./routes/settings')
var imports = require('./routes/imports')
var importRss = require('./routes/importrss')
var importGoogle = require('./routes/importgoogle')


var app = express()

var server = http.Server(app)
var io = require('socket.io')(server)

app.set('port', process.env.PORT || 3000)
app.set('views',  __dirname + '/views')
app.set('view engine', 'ejs')

app.use(favicon(path.join(__dirname, 'public/images', 'favicon-32x32.png')))
app.use(methodOverride())

app.use(session({
    secret: options.cookie_secret,
    resave: true,
    saveUninitialized: true
}))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(morgan('dev'))

app.use(cookieParser(options.cookie_secret))

app.use(serveStatic(path.join(__dirname, 'public')));

app.use(passport.initialize())
app.use(passport.session())


app.get('/', main.render)


// This makes sure that when someone accesses external /api2 they are authenticated first
app.use('/api2', api2.auth)

app.use(user)
app.use(messages)

// First we declare all the static paths in the script


app.get('/signup', register.form)
app.get('/recover', register.recover)
app.post('/recover', register.generatehash)
app.post('/signup', register.submit)
app.get('/login', pass.checkLogin, login.form)
app.get('/reset/:user/:timestamp/:hash', register.reset)
app.post('/reset', register.reset)

// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
app.post('/login', login.submit)

app.get('/logout', login.logout)
app.get('/post', entries.form)
app.post(
    '/post',
    pass.ensureAuthenticated,
    validate.isLoggedIn(),
    validate.isToDelete(),
    validate.getContextForEntry('entry[body]'),
    entries.submit
)

app.post('/context', pass.ensureAuthenticated, validate.changeContextPrivacy())

// Internal API to get nodes and statements for user's own nodes - no need to check user ID
app.get('/api/user/nodes/:context?', validate.getContextsList(), api.nodes)
app.get('/api/user/statements/:context?', api.entries)

// Internal API to get nodes and statements for somebody else's nodes in context
app.get(
    '/api/public/nodes/:user?/:context?',
    validate.getUserID(),
    validate.getContextPrivacy(),
    validate.getContextsList(),
    api.nodes
)
app.get(
    '/api/public/statements/:user?/:context?',
    validate.getUserID(),
    validate.getContextPrivacy(),
    api.entries
)
app.get('/api/:user/lda/:type/:context?', validate.getUserID(), api.entriesLDA)

// Get connected texts through internal connector function
app.get(
    '/api/connectedcontexts/',
    validate.getUserID(),
    api.connectedcontextsoutside
)

app.get(
    '/api/:user/connectedcontexts/',
    validate.getUserID(),
    api.connectedcontexts
)

// External API to get nodes and statements
app.get('/api2/user/nodes/:context?', api2.nodes)
app.get('/api2/user/statements/:context?', validate.getUserID(), api2.entries)

// For posting through API POST parameters:
// entry[body] is the statement,
// context is the context (optional, default: private),
// statementid is the ID of a statement to edit / delete (optional)
// submit = 'edit' to edit, delete = 'delete' to delete (optional)
app.post(
    '/api2/post',
    validate.isToDelete(),
    validate.getContextForEntry('entry[body]'),
    entries.submit
)

app.get(
    '/settings',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    settings.render
)
app.post('/settings', pass.ensureAuthenticated, settings.modify)
app.get(
    '/import',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    imports.render
)
app.get(
    '/import/files',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    imports.renderFiles
)
// backward compatibility
app.get(
    '/google',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    importGoogle.renderGoogle
)
app.get(
    '/import/google',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    importGoogle.renderGoogle
)
app.get(
    '/import/youtube',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    imports.renderYouTube
)
app.get(
    '/import/evernote',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    imports.renderEvernote
)
app.get(
    '/importurl',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    imports.renderURL
)
app.get(
    '/importrss',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    importRss.renderRSS
)
app.get(
    '/apps',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    imports.renderApps
)
app.get(
    '/twitter',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    imports.renderTwitter
)

app.post('/import', pass.ensureAuthenticated, upload.single('uploadedFile'), imports.submit)
app.post('/importrss', pass.ensureAuthenticated, importRss.submitRSS)
app.post('/importgoogle', pass.ensureAuthenticated, importGoogle.submitGoogle)


app.get('/evernote_oauth', oauths.oauth)
app.get('/evernote_oauth_callback', oauths.oauth_callback)
app.get('/evernote_clear', oauths.clear)

// From here we declare all the dynamic paths at the first level of the content tree

app.get(
    '/:user/edit',
    pass.ensureAuthenticated,
    validate.getContextsList(),
    entries.list
)
app.get(
    '/:user/:context?/edit',
    pass.ensureAuthenticated,
    validate.getContextPrivacy(),
    validate.getContextsList(),
    entries.list
)
app.get(
    '/:user/:context?',
    pass.checkUser,
    validate.getUserID(),
    validate.getContextPrivacy(),
    validate.getContextsList(),
    entries.list
)

// Errors and bad requests
var routes = require('./routes')
app.use(routes.notfound)
app.use(routes.error)
app.use(routes.badrequest)

// development only
if ('development' == app.get('env')) {
    app.use(errorhandler())
}

if (process.env.ERROR_ROUTE) {
    app.get('/dev/error', function(req, res, next) {
        var err = new Error('database connection failed')
        err.type = 'database'
        next(err)
    })
}

server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'))
})

// could be var chat = to make it recursive

io.on('connection', function(socket) {
    console.log('a user socket connected')

    socket.on('disconnect', function(data) {
        console.log('user disconnected')

        // let's count how many people are left in a room
        var room = io.sockets.adapter.rooms[socket.room]
        var people_remaining = 1

        // TODO that shouldn't be called if not needed
        if (room != undefined) {
            people_remaining = room.length
        }

        console.log('users left')
        console.log(room)
        console.log(people_remaining)
        // Notify the other person in the chat room
        // that his partner has left
        socket.broadcast.to(socket.room).emit('leave', {
            boolean: true,
            people: people_remaining,
        })
    })
    socket.on('chat message', function(msg) {
        console.log('message: ' + msg)
        io.sockets.in(socket.room).emit('chat message', msg)
        // io.emit('chat message', msg);
    })
    socket.on('delete message', function(msg) {
        console.log('message: ' + msg)
        io.sockets.in(socket.room).emit('delete message', msg)
        // io.emit('chat message', msg);
    })
    socket.on('node click', function(msg) {
        socket.broadcast.to(socket.room).emit('node click', msg)
    })
    socket.on('node delete', function(msg) {
        io.sockets.in(socket.room).emit('node delete', msg)
    })
    socket.on('node add', function(msg) {
        io.sockets.in(socket.room).emit('node add', msg)
    })
    socket.on('graph reset', function(msg) {
        io.sockets.in(socket.room).emit('graph reset', msg)
    })
    socket.on('login', function(data) {
        // Use the socket object to store data. Each client gets
        // their own unique socket object
        socket.username = data.user
        socket.room = data.id

        // Add the client to the room
        socket.join(data.id)

        // Send the startChat event to all the people in the
        // room, along with a list of people that are in it.

        socket.to(data.id).emit('startChat', {
            boolean: true,
            id: data.id,
        })
    })
})
