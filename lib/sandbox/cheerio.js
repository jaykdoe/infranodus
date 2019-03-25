var rp = require('request-promise');

var cheerio = require('cheerio');

var processfield = '.dds';

var options = {
    uri: 'https://waytorussia.net/Travel/VisaSupport.html',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1'
    },
    transform: function (body) {
       return cheerio.load(body);
    }
};

rp(options)

  .then(function ($) {
    console.log($(processfield).length);
    // $(processfield).each(function (index) {
    //     console.log($(this).text());
    // });


   })
   .catch(function (err) {
     console.log("error")
     console.log(err);
   });
