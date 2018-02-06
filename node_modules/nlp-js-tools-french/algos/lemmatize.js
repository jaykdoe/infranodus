'use strict';

var Helpers = require('../helpers');

module.exports = function(_that) {
    var lemmas = [];
    var currentWord = null;
    _that.foundTokensInDicts.forEach(function(wordObj, index) {
        currentWord = {
            id: wordObj.id,
            word: wordObj.word,
            lemma: wordObj.lemma
        };
        lemmas.push(currentWord);
    });
    return Helpers.removeDuplicateObjects(lemmas);
}
