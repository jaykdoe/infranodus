'use strict';

module.exports = function(_that) {
    var taggedWords = [];
    var currentWord = null;
    _that.foundTokensInDicts.forEach(function(wordObj, index) {
        if (currentWord === null) {
            currentWord = {
                id: wordObj.id,
                word: wordObj.word,
                pos: [wordObj.pos]
            };
        } else {
            currentWord.pos.push(wordObj.pos);
        }
        if (_that.foundTokensInDicts[index + 1] === undefined || _that.foundTokensInDicts[index + 1].id !== currentWord.id) {
            taggedWords.push(currentWord);
            currentWord = null;
        }
    });
    return taggedWords;
}
