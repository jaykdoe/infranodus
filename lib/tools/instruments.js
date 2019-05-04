module.exports = Instruments

function Instruments() {}

// Borrowed from this beautiful example: http://stackoverflow.com/a/9229821/712347

Instruments.uniqualizeArray = function(ary, key) {
    var seen = {}
    return ary.filter(function(elem) {
        var k = key(elem)
        return seen[k] === 1 ? 0 : (seen[k] = 1)
    })
}

Instruments.cleanHtml = function(Description) {
    var tmp = Description.replace(/<br\s*\/?>/gm, '\n')
    tmp = tmp.replace(/(<([^>]+)>)/gi, ' ')
    tmp = tmp.replace(/&nbsp;/g, ' ')
    return tmp
}

Instruments.findInArray = function(array, key, reverse) {
    for (var i = 0; i < array.length; i++) {
        if (reverse) {
            if (array[i][1] == key) {
                return array[i][0]
            }
        } else {
            if (array[i][0] == key) {
                return array[i][1]
            }
        }
    }
}
