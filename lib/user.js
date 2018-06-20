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

var bcrypt = require('bcrypt-nodejs');

var neo4j = require('node-neo4j');

var options = require('../options');

dbneo = new neo4j(options.neo4jlink);

var uuid = require('node-uuid');

var entries = require('../routes/entries');

var validate = require('../lib/middleware/validate');


// Construct User object (schema)

module.exports = User;

function User(obj) {
    for (var key in obj) {
        this[key] = obj[key];
    }
}


// SIGNUP PROCEDURES

// Main user constructor

User.prototype.save = function(fn){

    var user = this;

    // Create a password hash for user

    user.hashPassword(function(err){
       if (err) return fn(err);

       // Success? Then update the user record
       user.update(fn);

    });


};

// Constructing a hash of password (pepper) and adding some salt

User.prototype.hashPassword = function(fn){
    var user = this;
    bcrypt.genSalt(12, function(err, salt){
        if (err) return fn(err);
        user.salt = salt;
        bcrypt.hash(user.pepper, salt, null, function(err, hash){
            if (err) return fn(err);
            user.pepper = hash;
            fn();
        })
    });
};


// Now let's record the constructed user object into the database

User.prototype.update = function(fn){

    var user = this;
    var user_uid = uuid.v1();


    // Create a user node in Neo4J

    dbneo.insertNode({
        name: user.name,
        uid: user_uid,
        salt: user.salt,
        pepper: user.pepper,
        substance: user.name,
        portal: user.portal,
        fullscan: options.settings.fullscan,
        fullview: options.settings.fullview,
        morphemes: options.settings.morphemes,
        hashnodes: options.settings.hashnodes,
        maxnodes: options.settings.max_nodes,
        inlanguage: options.settings.inlanguage,
        label_threshold: options.settings.label_threshold,
        palette: options.settings.palette,
    },'User',function (err, node){
        if(err) return fn(err);

        // Output node id.

        console.log("User created. Neo4J ID: " + node._id);
        console.log("Unique UID (retrieved): " + node.uid);


        // Now let's add the default statements for the user

        // Here is a list of the statements

        var statements = options.defaultstatements;

        if (statements) {

            // This is a default context where all the statements will be added anyway (private or twitter etc)

            var addToContexts = [];

            var default_context = 'help';

            addToContexts.push(default_context);



            // 1. We retrieve or create an array of contexts that will exist for a series of statements

            validate.getContextID(node.uid, addToContexts, function(result) {

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
                                body: ''
                            },
                            context: default_context
                        },
                        contextids: contexts,
                    internal: 1
                };

                var res = {
                    locals:  {
                        user: {
                            uid: node.uid,
                            name: user.name,
                            fullscan: options.settings.fullscan
                        }
                    }
                };

                for (var key in statements) {
                    if (statements.hasOwnProperty(key)) {
                        req.body.entry.body = statements[key];
                        entries.submit(req, res);
                    }

                }

                // Move on to the next one

                fn();

            });
        }
        else {
            fn();
        }




    });

};



// LOGIN PROCEDURES

// Let's authenticate the user using the username and password entered

User.authenticate = function(name, pass, fn){

    // Launch get the user by the username function below

    User.getByName(name, function(err, user){
        if (err) return fn(err);
        if (!user.uid) return fn();

        // let's see if the password is right by computing hash from the user.pass and the salt and seeing if it's related to the hashed pass we store in our db
        bcrypt.hash(pass, user.salt, null, function(err, hash){
            if (err) return fn(err);
            if (hash == user.pepper) {

                // TODO Do something to inform pass.js that the password is wrong

                console.log("Logged in " + user.uid);

                return fn(null, user);

            }
            fn();
        });
    });
};


// First we get the user by name

User.getByName = function(name, fn){

    // Get the ID from the name

    User.getId(name, function(err, uid){

        if (err) return fn(err);

        // Go the ID? get the full user data by ID

        User.get(uid, fn);


    });
};

// Get the ID from the name function

User.getId = function(name, fn){

    name = validate.sanitize(name);

    var idQuery = 'MATCH (u:User{substance:"' + name + '"}) RETURN u.uid;';


    dbneo.cypherQuery(idQuery, function(err, uid){

        if(err) {
            err.type = 'neo4j';
            return fn(err);
        }

        // Pass this on to the next function

        fn(null, uid.data[0]);

    });
};


// Get the user data using the ID

User.get = function(uid, fn){

    var userQuery = 'MATCH (u:User{uid:"' + uid + '"}) RETURN u;';

    dbneo.cypherQuery(userQuery, function(err, user){

        if(err) {
            err.type = 'neo4j';
            return fn(err);
        }

        fn(null, new User(user.data[0]));

    });

};


User.modifySettings = function (user_id, fullscan, fullview, morphemes, hashnodes, maxnodes, inlanguage, palette, background, midi, label_threshold, topnodes, customization, stopwords, callback) {

    // Sanitize entry
    inlanguage = validate.sanitize(inlanguage);
    palette = validate.sanitize(palette);
    background = validate.sanitize(background);
    midi = validate.sanitize(midi);
    label_threshold = validate.sanitize(label_threshold);
    topnodes = validate.sanitize(topnodes);
    stopwords = validate.sanitize(stopwords).replace(/["'\\]/g, "");
    fullscan = validate.sanitize(fullscan);
    fullview = validate.sanitize(fullview);
    maxnodes = validate.sanitize(maxnodes);
    customization = validate.sanitize(customization);
    morphemes = validate.sanitize(morphemes);

    // Construct query from the parameters passed

    var modify_query = 'MATCH (u:User{uid:"' + user_id + '"}) ' +
        'SET u.fullscan = ' + fullscan + ', ' +
        'u.fullview = ' + fullview + ', ' +
        'u.hashnodes = ' + hashnodes + ', ' +
        'u.maxnodes = ' + maxnodes + ', ' +
        'u.morphemes = ' + morphemes + ', ' +
        'u.inlanguage = "' + inlanguage + '", ' +
        'u.palette = "' + palette + '", ' +
        'u.background = "' + background + '", ' +
        'u.midi = "' + midi + '", ' +
        'u.label_threshold = "' + label_threshold + '", ' +
        'u.topnodes = "' + topnodes + '", ' +
        'u.customization = "' + customization + '", ' + 
        'u.stopwords = "' + stopwords + '";';
    console.log(modify_query);
    dbneo.cypherQuery(modify_query, function(err, cypherAnswer){

        if(err) {
            err.type = 'neo4j';
            return callback(err);
        }
        // No error? Pass the contexts to makeQuery function
        callback(null,cypherAnswer);


    });


}




User.prototype.toJSON = function(){
    return {
        uid: this.uid,
        name: this.name
    }
};
