'use strict';

var NlpjsTFr = require('../');

var corpus = "Elle semble se nourrir généralement de plancton, et de hotdog du vendeur du coin.";

var nlpToolsFr;
// nlpToolsFr = new NlpjsTFr(corpus);
nlpToolsFr = new NlpjsTFr(corpus, {
    tagTypes: ['adj', 'ver', 'nom'],
    strictness: false,
    minimumLength: 3,
    debug: true,
    // perfLog: true
});

var tokenizedWords = nlpToolsFr.tokenized;
var posTaggedWords = nlpToolsFr.posTagger();
var lemmatizedWords = nlpToolsFr.lemmatizer();
var stemmedWords = nlpToolsFr.stemmer();
var stemmedWord = nlpToolsFr.wordStemmer("aléatoirement");
console.log(nlpToolsFr.foundTokensInDicts);
