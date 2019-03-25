var pdfText = require('pdf-text')

var pathToPdf = __dirname + "/book-eric.pdf"

var text = '';

pdfText(pathToPdf, function(err, chunks) {
  //chunks is an array of strings
  //loosely corresponding to text objects within the pdf
text = chunks.join('\r\n');
console.log(text);
  //for a more concrete example, view the test file in this repo
})
