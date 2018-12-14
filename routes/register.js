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

var chargebee = require("chargebee");

var validate = require('../lib/middleware/validate');

var bcrypt = require('bcrypt-nodejs');




// The form route function renders the register.ejs template from views and adds 'Register' into the title field there

exports.form = function(req, res){

      // TODO remove invitation field by default
      res.render('register', { title: 'InfraNodus.Com Text Network Analysis — Sign Up' , invitation: req.query.invitation});

};

// This renders the password recover page

exports.recover = function(req, res){

      // TODO remove invitation field by default
      res.render('recover', { title: 'InfraNodus.Com — Recover Password' , login: req.query.login, hash: req.query.hash});

};

exports.reset = function(req, res, next){

    var data = req.body;

    var urluser;
    if (req.params.user) {

      urluser = req.params.user;
    }
    else {

      urluser = req.body.username;
    }
    console.log('urluser');
    console.log(urluser);

    var hash;
    if (req.params.hash) {
      hash = req.params.hash;
    }
    else {
      hash = req.body.hash;
    }

    var newpass;
    if (req.body) {
      newpass = req.body.password;
    }

    User.getByName(urluser, function(err, user){

       if (err) return next(err);

        // The user with this UID already exists?
       if (user.uid) {

           console.log(user);

           var nowtime = Date.now().toString();

           // Round the time to about 1000 seconds or the 15-minutes period
           nowtime = parseInt(nowtime.slice(0,6) + '0000000');

           // TODO add check the link is expired

           var complete_string = user.substance + user.portal + user.pepper + nowtime;

           //res.send({errormsg:"This username is already taken! Please, choose another one."});
           var old_hash = bcrypt.hashSync(complete_string);

           if (req.params.hash && bcrypt.compareSync(complete_string, hash)) {
             console.log('here we are');
             res.render('reset', { title: 'InfraNodus.Com — Reset Password' , login: user.substance, email: user.portal, hash: hash});
           }
           else if (req.body && req.body.hash && bcrypt.compareSync(complete_string, hash)) {
             console.log('changing password');
             User.modifyPassword(urluser, newpass, function (err, answer) {

                 // Error? Go back and display it.

                 if (err) {
                     console.log(answer);
                     res.send({errormsg:"There was an error when changing your password. Please, try again."});
                 }

                 // If all is good, make a message for the user and reload the settings page
                 else {

                


                     // To just render the page, use: res.render('settings', { title: 'Settings' });

                     // To reload the page:

                     res.send({moveon: '/login?login=' + data.username, errormsg:"Your password has been changed. You can now log in."});

                 }


             });

           }
           else {
             console.log('didnt work');
           }
       }

    });
};


// This happens when the user submits data to recover the password

exports.generatehash = function(req, res, next){

    // Define data as the parameters entered into the registration form
    var data = req.body;

    // Call getByName method from User class with the user.name from the form and check if it already exists

    User.getByName(data.username, function(err, user){

       if (err) return next(err);

        // The user with this UID already exists?
       if (user.uid) {

           console.log(user);

           var nowtime = Date.now().toString();

           // Round the time to about 1000 seconds or the 15-minutes period
           nowtime = parseInt(nowtime.slice(0,6) + '0000000');

           var salt = user.salt;
           var complete_string = user.substance + user.portal + user.pepper + nowtime;

           //res.send({errormsg:"This username is already taken! Please, choose another one."});
           var hash = bcrypt.hashSync(complete_string, salt);

           // Generate link
           console.log('/reset/' + user.substance + '/' + nowtime.toString(36) + '/' + hash);

           console.log(bcrypt.compareSync(complete_string, hash)); // true)
       }

    });
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
           res.send({errormsg:"This username is already taken! Please, choose another one."});
       }

       // Ok, doesn't exist. Did the user accept the privacy policy?
       else if (data.consent != 'yes') {
           res.send({errormsg:"Please, accept our privacy policy."});
       }

       else if (data.hostedPage) {

         User.checkHostedPage(data.hostedPage, function(err, response) {
           if (err) {
             console.log(err);
             res.send({errormsg:"Your subscription is not active, you have to renew it or create a new one."});
           }
           else {
             console.log(response.content.customer.email);
             console.log(response.content.subscription.status);
             if (response.content.subscription.status == 'in_trial' || response.content.subscription.status == 'active') {
               create_user();

             }
             else {
               res.send({errormsg:"Your subscription is not active, you have to renew it or create a new one."});
             }
           }
         });

       }

       // Ok, now on to the account creation
       else {

         // Do we have a setting for the invitation code and the user submitted it but it's not right?

         if (options.invite.length > 0 && data.invite.length > 0 && data.invite != options.invite) {
             res.send({errormsg:"Please, enter the correct invitation code or leave the field empty to create an account."});
         }

         // As there's no invitation code or it's not right, let's proceed to create a subscription for the user
         else {

           if (data.invite.length == 0 && options.chargebee && options.chargebee.site && options.chargebee.api_key ) {

                            // here we call for ChargeBee
                            var chargebee_site = options.chargebee.site;
                            var chargebee_api = options.chargebee.api_key;
                            var chargebee_plan = 'infranodus-access';
                            var redirecturl = options.chargebee.redirect_url + '?login=' + data.username;

                            chargebee.configure({site : chargebee_site,
                            api_key : chargebee_api});
                            chargebee.hosted_page.checkout_new({
                                subscription : {
                                  plan_id : chargebee_plan
                                },
                               redirect_url : redirecturl,
                                customer : {
                                  email : req.body.email,
                                }
                              }).request(function(error,result){
                                if(error){
                                  //handle error
                                  console.log(error);
                                  if (error.error_code == 'wrong_format') {
                                    res.send({errormsg:"Your e-mail is in the wrong format. Please, make sure it's correct and try to submit this form again."})
                                  }
                                  else {
                                    res.send({errormsg:"There was a problem passing your details to the payment processing gateway. Please, check your internet connection and try again or <a href='http://noduslabs.com/contact/'>contact us</a> and let us know about this problem, so we can resolve it for you. Thanks!"})
                                  }
                                }else{
                                  //console.log(result);
                                  res.send({hosted_page: result.hosted_page});
                                }
                             });

           }
           else if (options.invite.length > 0 && data.invite == options.invite) {
              create_user();
              res.send({moveon: '/login?login=' + data.username});
           }
           else {
             res.send({errormsg:"Please, enter the correct invitation code. "});
           }

         }

       }


      function create_user(redirecting) {

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


         });

       }



    });
};
