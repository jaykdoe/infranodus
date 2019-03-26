var louvain = require('./node_modules/graphology-communities-louvain');
var modularity = require('./node_modules/graphology-metrics/modularity.js');

window.louvain_process = function (input) {
  louvain.assign(input);
  return input;
}
window.louvain_modularity = function (input) {
  const mod = modularity(input);
  return mod;
}
