var youtubedl = require('youtube-dl');
var url = 'https://www.youtube.com/watch?v=NpPyLcQ2vdI';
var fs = require('fs');
var subsrt = require('subsrt');
var list = subsrt.list();


var options = {
  // Write automatic subtitle file (youtube only)
  auto: true,
  // Downloads all the available subtitles.
  all: false,
  // Languages of subtitles to download, separated by commas.
  lang: 'en',
  // The directory to save the downloaded files in.
  cwd: __dirname,
};


// TODO if no subtiles, then auto: true and get the subtitle right this time.

// TODO get rid of align:start position:0% and everything inside <>

youtubedl.getSubs(url, options, function(err, files) {
  if (err) throw err;

  console.log('subtitle files downloaded:', files);


  fs.readFile(files[0], 'utf8', function(err, contents) {

    //console.log(contents);

    var statements = contents.split('\n\n').join('ttttt').replace(/\n/g,' ').split('ttttt');
    for (var s = 0; s < statements.length; s++) {

      console.log(statements[s].replace(/<.*?>/g, '').replace('align:start position:0%',''));

    }

    // Visualize

    // We then identify the two main topics

    // Identify which one is earlier

    // Minus 2 seconds + 2 seconds — propose to watch that fragment of video


});
});
