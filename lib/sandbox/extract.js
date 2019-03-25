var extractor = require('unfluff');
var textract = require('textract');
var rp = require('request-promise');
var cheerio = require('cheerio');


var urloptions = {
    uri: 'https://waytorussia.net/WhatIsRussia/Russian-Men.html',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1'
    },
    transform: function (body) {
       return cheerio.load(body);
    }
};

textract.fromUrl('https://waytorussia.net/WhatIsRussia/Russian-Men.html', function( error, text ) {

console.log(text);

})

rp(urloptions)

  .then(function ($) {

    var extracteddata = extractor($.html());
    console.log(extracteddata);
    console.log($.text())
  });
