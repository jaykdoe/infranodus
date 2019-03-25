var google = require('google')

const cheerio = require('cheerio')

google.resultsPerPage = 25
var nextCounter = 0

google('text network analysis', function (err, res){
  if (err) console.error(err)
  const $ = cheerio.load(res.body);

  $('.aw5cc').each(function(i, elm) {
    console.log($(this).text()) // for testing do text() 
});

  // for (var i = 0; i < res.links.length; ++i) {
  //   var link = res.links[i];
  //   console.log(link.title + ' - ' + link.href)
  //   console.log(link.description + "\n")
  //
  // }

  //console.log(res);

  if (nextCounter < 4) {
    nextCounter += 1
    if (res.next) res.next()
  }
})
