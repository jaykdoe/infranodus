var modularity = require('./node_modules/graphology-metrics/modularity.js');

window.louvain_modularity = function (input) {
  const mod = modularity(input);
  return mod;
}
