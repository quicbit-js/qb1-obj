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

function obj() {
    var ret = new Obj([],[])
    if (arguments.length > 0) {
        var a0 = arguments[0]
        Array.isArray(a0) || err('illegal argument: ' + a0)
        var i = 0
        if (arguments.length === 1) {
            // from tuples
            while (i < a0.length) { ret.put(a0[i], a0[i+1]); i += 2 }
        } else if (arguments.length === 2) {
            // from keys & vals array or object
            var vals = arguments[1]
            typeof vals === 'object' || err('illegal argument: ' + vals)
            if (Array.isArray(vals)) {
                var len = Math.min(a0.length, vals.length)
                while(i < len) { ret.put(a0[i], vals[i]); i++ }
            } else {
                while(i < a0.length) { ret.put(a0[i], vals[a0[i]]); i++ }
            }
        } else {
            err('too many arguments')
        }
    }
    return ret
}

module.exports = obj
