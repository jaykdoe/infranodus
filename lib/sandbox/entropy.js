// entropy.js MIT License © 2014 James Abney http://github.com/jabney

// Calculate the Shannon entropy of a string in bits per symbol.

  // Create a dictionary of character frequencies and iterate over it.
  function process(s, evaluator) {
    var h = Object.create(null), k;
    s.split('').forEach(function(c) {
      h[c] && h[c]++ || (h[c] = 1); });
    if (evaluator) for (k in h) evaluator(k, h[k]);
    return h;
  };
  
  // Measure the entropy of a string in bits per symbol.
  entropy = function(s) {
    var sum = 0,len = s.length;
    process(s, function(k, f) {
      var p = f/len;
      sum -= p * Math.log(p) / Math.log(2);
    });
    return sum;
  };
  
  // Measure the entropy of a string in total bits.
  bits = function(s) {
    return entropy(s) * s.length;
  };
  
  // Log the entropy of a string to the console.
  log = function(s) {
    console.log('Entropy of "' + s + '" in bits per symbol:', bits(s));
  };
 
log('BSJA');

