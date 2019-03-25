const Graph = require('graphology');

var louvain = require('../../node_modules/graphology-communities-louvain');


const graph = new Graph();
graph.addNode('John');
graph.addNode('Martha');
graph.addNode('Boost');
graph.addNode('Boris');

graph.addEdge('John', 'Martha', {weight: 3});
graph.addEdge('John', 'Boost', {weight: 2});
graph.addEdge('Boris', 'Boost', {weight: 1});

console.log('Number of nodes', graph.order);
console.log('Number of edges', graph.size);
//
// graph.forEachNode(node => {
//   graph.forEachNeighbor(node, neighbor => console.log(node, neighbor));
// });


// const communities = louvain(graph);
console.log(louvain.assign(graph));

console.log(graph);
// console.log(communities);
