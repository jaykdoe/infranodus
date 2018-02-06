'use strict';

module.exports = function(_that) {
    var tokens = _that.sentence.replace(/[^a-zA-Z0-9\u00C0-\u00FF]+/g, ' ').split(' ');
    tokens = tokens.filter(function(token) {
        return token.length >= _that.config.minimumLength;
    });
    return tokens;
};
