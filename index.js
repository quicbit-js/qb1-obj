// walk: iterate over any javascript value (object, array, string, number, null...) and all nested values invoking a
// callback.  Object function properties are ignored.  Functions in arrays or passed in as the first value are forwarded
// as an error (tcode = tcode.ERR) to the callback.
//
//   o          - the object to walk - which actually can be any value, array, string, number etc.
//
//   cb (           (callback function)
//       carry          - init value passed along - fn(fn(fn(init, ..), ...), ...)
//       key,           - if within object, it is a string, if within array it is null
//       i,             - if within array, it is the array index, if within object it is the
//                        count of the key/value pair (insertion order)
//       type_code,     - { 0: err, 1: obj, 2: arr, 3, str, 5: num, 6: boo, 7: nul }.  module exported as 'tcode'.
//       value,         - the object or array value
//       path,          - an array holding keys/indexes of the current path (values are changed-in-place.  make a copy to preserve values)
//       control        - an object that controls the iteration.  setting the 'control.walk' property to:
//
//                      'continue': continues the walk over all values (this is the default)
//                      'stop': stops the walk (returning the value that this function returns)
//                      'skip': continues the walk, but skip this value's children.  makes sense only for objects and arrays.
//   )
//
//   init           (any - optional) same as Array.prototype.reduce(cb, init).  take care to use 'undefined' and not 'null'
//                        to get the init set to the first value in the object.
//
//   options        (object - optional)
//
//      typ_select:     inclusive list of types to include in the walk (callback): [ obj, arr, str, int, num, boo, nul ]
//
//      key_select:     function (key, path)
//
//                      if set, this function is called for each key prior to calling the callback.
//                      The function should return true to include the value for this key, false to skip.
//                      note that path also has the key as its last value.
//
//
function walk (v, cb, init, opt) {
    opt = opt || {}
    var control = { walk: 'continue' }

    // callback with root
    var tcode = typecode(v)
    if (tcode === TCODE_FUN) {
        tcode = TCODE.ERR
        v = { msg: 'illegal value (function)', val: v }
    }
    var carry = cb(init, null, 0, tcode, v, [], control)
    if (control.walk !== 'continue') {
        return carry
    }

    if (tcode === TCODE.ARR || tcode === TCODE.OBJ) {
        carry = walk_container(tcode === TCODE.OBJ, v, cb, carry, opt, [], control)
    }
    return carry
}

var TCODE = {
    ERR: 0,
    OBJ: 1,
    ARR: 2,
    STR: 3,
    NUM: 4,
    BOO: 5,
    NUL: 6,
}
var TCODE_FUN = 7       // not public - never passed to callback

function typecode (v) {
    switch (typeof v) {
        case 'string':
            return TCODE.STR
        case 'number':
            return TCODE.NUM
        case 'boolean':
            return TCODE.BOO
        case 'undefined':
            return TCODE.NUL
        case 'function':
            return TCODE_FUN
        default:
            // default case handles 'object' including host objects that may occur in certain environments
            return v === null ? TCODE.NUL : (Array.isArray(v) ? TCODE.ARR : TCODE.OBJ)
    }
}

var STOP_OBJ = {carry: null }
function walk_container (in_object, container, cb, carry, opt, path, control) {
    var keys_or_vals = in_object ? Object.keys(container) : container
    var depth = path.length
    var ignored = 0
    for (var i = 0; i < keys_or_vals.length; i++) {
        var k
        var v
        if (in_object) {
            k = keys_or_vals[i]
            path[depth] = k
            if (opt.key_select && !opt.key_select(k, path)) {
                continue
            }
            v = container[k]
        } else {
            k = null
            path[depth] = i
            v = container[i]
        }

        var tcode = typecode(v)
        if (tcode === TCODE_FUN) {
            if (in_object) {
                ignored++
                continue
            } else {
                tcode = TCODE.ERR
                v = { msg: 'unexpected function.  functions are only allowed as object properties', val: v }
            }
        }

        carry = cb(carry, k, i-ignored, tcode, v, path, control)
        switch (control.walk) {
            case 'continue':
                // walk children
                if (tcode === TCODE.ARR || tcode === TCODE.OBJ) {
                    carry = walk_container(tcode === TCODE.OBJ, v, cb, carry, opt, path, control)
                    if (carry === STOP_OBJ) {
                        return depth === 0 ? STOP_OBJ.carry : STOP_OBJ          // unwrap carry when leaving (depth = 1)
                    }
                }
                break
            case 'stop':
                if (depth === 0) {
                    return carry
                } else {
                    STOP_OBJ.carry = carry
                    return STOP_OBJ
                }
            case 'skip':
                // children not walked, continue with next peer value
                control.walk = 'continue'
                break
        }
    }
    if (path.length > depth) {
        path.length = depth
    }
    return carry
}

module.exports = {
    len: function (o) { return Object.keys(o).length },
    keys: function (o) { return Object.keys(o) },
    vals: function (o, keys) {
        var ret = []
        keys = keys || Object.keys(o)
        for (var i = 0; i < keys.length; i++) {
            ret[i] = o[keys[i]]
        }
        return ret
    },
    oa_push: function (o, k, v) {
        var a = o[k]
        if (!a) { o[k] = a = [] }
        a.push(v)
    },
    oo_put: function (o, k1, k2, v) {
        var oo = o[k1]
        if (!oo) { o[k1] = oo = {} }
        var prev = oo[k2]
        oo[k2] = v
        return prev
    },
    oo_get: function (o, k1, k2) {
        return o[k1] && o[k1][k2]
    },
    // return a new object with the same keys, but new values
    map: function (o, fn) {
        var ret = {}
        var keys = Object.keys(o)
        for (var i=0; i<keys.length; i++) {
            ret[keys[i]] = fn(keys[i], o[keys[i]], i)
        }
        return ret
    },
    // return a new object with same values, but new key names (in same insertion order)
    mapk: function (o, fn) {
        var ret = {}
        var keys = Object.keys(o)
        for (var i=0; i<keys.length; i++) {
            var v = o[keys[i]]
            ret[fn(keys[i], v, i)] = v
        }
        return ret
    },
    tcode: TCODE,
    walk: walk,
}
