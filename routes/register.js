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

// Get methods to operate on a User object
var User = require('../lib/user');

// Get options for registration invitation code (if exist in config.json file)
var options = require('../options');


// The form route function renders the register.ejs template from views and adds 'Register' into the title field there

exports.form = function(req, res){
    res.render('register', { title: 'InfraNodus: Polysingularity Thinking Tool' });
};

// This happens when the user accesses /register with a POST request

exports.submit = function(req, res, next){

    // Define data as the parameters entered into the registration form
    var data = req.body;

    // Call getByName method from User class with the user.name from the form and check if it already exists

    User.getByName(data.username, function(err, user){
        if (err) return next(err);

        // The user with this UID already exists?
        if (user.uid) {
            res.error("Username already taken!");
            res.redirect('back');
        }

        // We have a setting for invite-only registration and it doesn't match?
        else if (options.invite.length > 0 && data.invite != options.invite) {
            res.error("Please, enter the corrent invitation code or leave the field empty to create a account.");
            res.redirect('back');
        }

        // The user doesn't exist? Then create a new object User with the data from the form
        else {

            if (data.consent != 'yes') {
                res.error("Please, accept our privacy policy.");
                res.redirect('back');
            }
            else {


              user = new User({
                  name: data.username,
                  pepper: data.password,
                  portal: data.email
              });

              // save that object in Neo4J database
              user.save(function(err){
                  if (err) return next(err);

                  // save his ID into the session
                  req.session.uid = user.uid;

                  // redirect to the login page
                  res.redirect('/login');
              });
            }
        }
    });
};
