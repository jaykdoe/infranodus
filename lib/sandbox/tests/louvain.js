var louvain = require('./node_modules/graphology-communities-louvain');

window.louvain_process = function (input) {
  louvain.assign(input);
  return input;
}
