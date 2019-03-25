var FeedParser = require('feedparser');
var request = require('request');

var feedparser = new FeedParser();

var rssSubmitted = 'https://www.theguardian.com/rss http://www.wsj.com/xml/rss/3_7085.xml http://rss.nytimes.com/services/xml/rss/nyt/World.xml';

var rssRequested = rssSubmitted.split(' ');

var rssFeedsParsed = 0;

var rssItemsParsed = 0;

var limit = 5;

var stream = [];

for (var item in rssRequested) {

  var reqrss = request(rssRequested[item]);

  reqrss.on('error', function (error) {
    // handle any request errors
  });

  reqrss.on('response', function (res) {

    stream[item] = this; // `this` is `reqrss`, which is a stream
    console.log(stream[item].href);

    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    }
    else {


          stream[item].pipe(feedparser);


    }
  });

}




feedparser.on('error', function (error) {

  console.log(error);
  // always handle errors
});

feedparser.on('readable', function () {
  // This is where the action is!
  var stream = this; // `this` is `feedparser`, which is a stream
  var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
  var item;

  while (item = stream.read()) {

     console.log(item.link);
  }
});
