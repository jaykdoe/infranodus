var rightNow = new Date();
var res = rightNow.toISOString().slice(2,10).replace(/-/g,"").replace(/:/g,"");

console.log(res);

var tutorial = '';

var rightHere = function() { if (tutorial == 'newcontext') { return false } else { return 'some' }}
console.log(rightHere());
