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

var config = require('../config.json');

var validate = require('../lib/middleware/validate');




// The form route function renders the register.ejs template from views and adds 'Register' into the title field there

exports.form = function(req, res){

      // TODO remove invitation field by default
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

           if (data.invite.length == 0 && config.chargebee && config.chargebee.site && config.chargebee.api_key ) {

                            // here we call for ChargeBee
                            var chargebee_site = config.chargebee.site;
                            var chargebee_api = config.chargebee.api_key;
                            var chargebee_plan = 'infranodus-access';
                            var redirecturl = config.chargebee.redirect_url + '?login=' + data.username;

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
