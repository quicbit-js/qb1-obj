var ser = require('qb1-serial-plain')

function Obj(keys, vals) {
    this.keys = keys
    this.vals = vals
}
Obj.prototype = {
    get length() {
        return this.keys.length
    },
    'get': function (k) {
        return this.vals[k]
    },
    put: function (k, v) {
        if (v === undefined) { return this.remove(k) }
        var prev = this.vals[k]
        if (prev === undefined) {
            this.keys.push(k)
        }
        this.vals[k] = v
        return prev
    },
    remove: function (k) {
        var prev = this.vals[k]
        if (prev === undefined) {
            return undefined
        }
        this.keys.splice(this.keys.indexOf(k), 1)
        delete this.vals[k]
        return prev
    },
    at: function (i) {
        return this.vals[this.keys[i]]
    },
    // serialization callback, see qb1-serial-plain
    serial: function (cb) {
        var keys = this.keys
        var vals = this.vals
        cb('{')
        for (var i=0; i<keys.length; i++) {
            cb('?', i, keys[i], vals[keys[i]])
        }
        cb('}')
    },
    str: function (opt) { return ser.str(this, opt) },          // short method for toString()
    toString: function (opt) { return this.str(opt) },
}

function err(msg) { throw Error(msg) }

function from_pairs(pairs) {
    var keys = []
    var vals = []
    for(var i=0; i<pairs.length; i++) {
        keys[i] = pairs[i][0]
        vals[i] = pairs[i][1]
    }
    return from_arrays(keys, vals)
}
function from_arrays(keys, vals) {
    keys.length === vals.length || err('keys and vals have different length: ' + keys.length + '/' + vals.length)
    var ret = new Obj([],[])
    for (var i=0; i<keys.length; i++) {
        vals[i] !== undefined || err('cannot initialize map with undefined values')
        ret.put(keys[i], vals[i])
    }
    return ret
}

function obj() {
    var args = arguments
    if (args.length === 0) {
        return new Obj([], [])
    } else {
        Array.isArray(args[0]) || err('illegal argument: ' + args[0])
        if (args.length === 1) {
            return from_pairs(args[0])
        }
        if (args.length === 2) {
            var keys = args[0]
            var vals = args[1]
            if (Array.isArray(vals)) {
                return from_arrays(keys, vals)
            } else {
                return from_arrays(keys, keys.map(function (k){ return vals[k] }))
            }
        }
        err('too many arguments')
    }
}

module.exports = obj
