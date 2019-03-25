var suggest = require('node-google-suggest')
var keyword = 'text network analysis'

suggest(keyword, function(err, res) {

	if (( ! err) && res.length) {
		console.log(res);
	} else {
		console.log('no result');
	}
	
})
