var S = require('string');

const feedparser = require('feedparser-promised');

var rssSubmitted = 'https://www.theguardian.com/rss http://rss.liberation.fr/ https://www.telegraph.co.uk/rss.xml http://www.wsj.com/xml/rss/3_7085.xml http://rss.nytimes.com/services/xml/rss/nyt/World.xml';

var rssRequested = rssSubmitted.split(/\s+/).splice(0,10);

var limit = 3;

var rssFeeds = 0;



for (var item in rssRequested) {

    feedparser.parse(rssRequested[item]).then( (items) => {
        var rssIterations = 0;
        items.forEach(itemo => {
          if (rssIterations < limit) {
        //  console.log('title:', S(itemo.title).stripTags().s);
        //  console.log('description:', S(itemo.description).stripTags().s.replace('Continue reading...', ''));
          console.log('link:', S(itemo.link).stripTags().s);
          rssIterations = rssIterations + 1;
          }
        });
      }).then(done => {
        rssFeeds = rssFeeds + 1;
        if (rssFeeds == rssRequested.length) {
        console.log('done');
        }
      }).catch(error => {
        rssFeeds = rssFeeds + 1;
        console.error('error: ', error);
      });


}
