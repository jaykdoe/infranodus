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

var config = require('../config.json');

const nodemailer = require('nodemailer');





// The form route function renders the register.ejs template from views and adds 'Register' into the title field there

exports.form = function(req, res){

      // TODO remove invitation field by default
      res.render('register', { title: 'InfraNodus.Com Text Network Analysis — Sign Up' , invitation: req.query.invitation});

};

// This renders the password recover page

exports.recover = function(req, res){

      // TODO remove invitation field by default
      res.render('recover', { title: 'InfraNodus.Com — Recover Password',errormsg:''});

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
    urluser = validate.sanitize(urluser);


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
    newpass = validate.sanitize(newpass);

    var thatstamp;

    if (req.params.timestamp) {
      thatstamp = req.params.timestamp;
    }

    User.getByName(urluser, function(err, user){

       if (err) console.log(err);

        // The user with this UID already exists?
       if (user.uid) {

           console.log(user);

           var nowtime = Date.now().toString();

           // Round the time to about 1000 seconds or the 15-minutes period
           nowtime = parseInt(nowtime.slice(0,6) + '0000000');

           var complete_string = user.substance + user.portal + user.pepper + nowtime;

           //res.send({errormsg:"This username is already taken! Please, choose another one."});
           var old_hash = bcrypt.hashSync(complete_string);

           bcrypt.compare(complete_string, hash, function(err, ress) {
             if (err) {
               res.render('recover', { title: 'InfraNodus.Com — Recover Password', errormsg: 'The link you provided had wrong parameters, please, copy and paste it from your email into your browser URL or try again below.'});
             }
             else {
               if (req.params.hash && ress) {
                 if (thatstamp) {
                   if (nowtime != parseInt(thatstamp,36)) {
                     res.render('recover', { title: 'InfraNodus.Com — Recover Password', errormsg: 'The link has expired. Please, submit your request again below:'});
                   }
                   else {
                      res.render('reset', { title: 'InfraNodus.Com — Reset Password' , login: user.substance, email: user.portal, hash: hash});
                   }
                 }


               }
               else if (req.body && req.body.hash && ress) {

                 User.modifyPassword(urluser, newpass, function (err, answer) {

                     if (err) {
                         console.log(answer);
                         res.send({errormsg:"There was an error when changing your password. Please, try again."});
                     }

                     else {

                         res.send({moveon: '/login?login=' + data.username, errormsg:"Your password has been changed. You can now log in."});

                     }


                 });

               }
               else {
                 res.render('recover', { title: 'InfraNodus.Com — Recover Password',errormsg:"Something went wrong with the recovery link. Please, check your mail and copy and paste the link to your browser."});

               }
             }

          });



       }
       else {
         res.render('recover', { title: 'InfraNodus.Com — Recover Password',errormsg:"This user in that recovery URL has not been found. Please, try again."});



       }

    });
};


// This happens when the user submits data to recover the password

exports.generatehash = function(req, res, next){

    // Define data as the parameters entered into the registration form
    var data = req.body;

    // Call getByName method from User class with the user.name from the form and check if it already exists

    User.getByNameEmail(data.username, data.email, function(err, user){

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
           var resetLink = '/reset/' + encodeURIComponent(user.substance) + '/' + nowtime.toString(36) + '/' + encodeURIComponent(hash);

           // console.log(resetLink);
           // console.log(bcrypt.compareSync(complete_string, hash));

           // Send the link to the user
           if (bcrypt.compareSync(complete_string, hash)) {
             console.log('starting mailer');
             const transporter = nodemailer.createTransport(config.smtpOptions);

             config.mailOptions.to = user.portal;
             config.mailOptions.subject = 'Password Recovery Link for InfraNodus.Com';
             config.mailOptions.text = "Hello, \n\nWe have received a request to reset your password. \n\nIf you haven't made this request, please, ignore this message. If you did, please, click the link below to create a new password. \n\n Your username: " + user.substance + "\n\nYour password reset link: http://" + config.infranodus.domain + resetLink + "\n\nThank you,\n\nInfraNodus Bot";

             transporter.sendMail(config.mailOptions, function(err, ress) {
                 if (err) {
                   console.log('there was an error: ', err);
                   res.send({success:"True",errormsg:"Sorry, but there was a problem sending a password reset link to your email."});
                 } else {
                   console.log('mail sent');
                   res.send({errormsg:"The recovery link has been sent to the e-mail associated with your username."});
                 }
             });

           }



       }
       else {
         if (data.username && data.email) {
           res.send({errormsg:"We did not find this username / email combination. Try to enter either the username or the email and try again."});
         }
         else if (data.username) {
           res.send({errormsg:"There's no record of this username in our database. Usernames are case-sensitive, so you can try again. Or enter only the email."});
         }
         else if (data.email) {
           res.send({errormsg:"There's no record of this email in our database. Try submitting the form with just the username."});
         }
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
      //  console.log('hosted page initiated');

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
                            //  redirect_url : redirecturl,
                              // embed: false,
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
                                  console.log(result);
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
