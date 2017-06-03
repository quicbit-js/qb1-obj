function err(msg) { throw Error(msg) }

// create a 'clean' object (with no undefined values) from an object or from a selection of an object-or-array
function obj(a0, a1) {
    var ret = {}
    if (a0) {
        var i = 0
        if (Array.isArray(a0)) {
            // create from an array-of-keys and array-of-values:  obj(['a', 'b', ...], [1, 2, ...])
            Array.isArray(a1) || err('illegal argument: ' + a1)
            var len = Math.min(a0.length, a1.length)
            while(i < len) { put(ret, a0[i], a1[i]); i++ }
        } else {
            // create from object and it's keys or given keys  obj({ a: 1, b: 2, ...}, [ 'a', 'b', ... ])
            var keys = a1 || Object.keys(a0)
            while(i < keys.length) { put(ret, keys[i], a0[keys[i]]); i++ }
        }
    }
    return ret
}

function put(o, k, v) {
    if (v === undefined) { delete o[k] }
    else { o[k] = v }
    return o
}

obj.len = function (o) { return Object.keys(o).length }
obj.keys = function (o) { return Object.keys(o) }
obj.vals = function (o) {
    var ret = []
    var keys = Object.keys(o)
    for (var i = 0; i < keys.length; i++) {
        ret[i] = o[keys[i]]
    }
    return ret
}
obj.map = function (o, fn) {
    var ret = {}
    var keys = Object.keys(o)
    for (var i=0; i<keys.length; i++) {
        ret[keys[i]] = fn(keys[i], o[keys[i]], i)
    }
    return ret
}
obj.put = put

module.exports = obj
