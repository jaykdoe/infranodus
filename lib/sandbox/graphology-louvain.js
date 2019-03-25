import louvain from '../../node_modules/graphology-communities-louvain';


function louvaine(input) {
  // To retrieve the partition
  const communities = louvain(input);

  // To directly assign communities as a node attribute
  louvain.assign(input);

  return input;

}

});
