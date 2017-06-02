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

function obj(a1, a2) {
    var ret = new Obj([],[])
    if (a1) {
        Array.isArray(a1) || err('illegal argument: ' + a1)
        var i = 0
        if (a2) {
            // create from keys (array) and vals (array or object)
            typeof a2 === 'object' || err('illegal argument: ' + a2)
            if (Array.isArray(a2)) {
                var len = Math.min(a1.length, a2.length)
                while(i < len) { ret.put(a1[i], a2[i]); i++ }
            } else {
                while(i < a1.length) { ret.put(a1[i], a2[a1[i]]); i++ }
            }
        } else {
            // one arg: create from single array of alternating pairs
            while (i < a1.length) { ret.put(a1[i], a1[i+1]); i += 2 }
        }
    } // else return empty obj
    return ret
}

module.exports = obj
