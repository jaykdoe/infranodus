'use strict';
let _ = require('lodash');
module.exports = {

    orderByObjId: function (array) {
        array.sort(function(a, b) {
            return a.id - b.id;
        });
        return array;
    },

    removeDuplicateObjects: function (array) {
      return _.uniqWith(array, _.isEqual);
    }
}
