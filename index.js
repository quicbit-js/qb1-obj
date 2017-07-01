// walk: iterate over an object (or array) and its nested values calling the given callback for each.  functions are skipped/ignored.
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
//                      'continue': continue the walk over all values (this is the default)
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
function walk (o, cb, init, opt) {
    return walk_container(Array.isArray(o), o, cb, init, opt || {}, [], {walk: 'continue'})
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

function typecode (v, is_arr) {
    switch (typeof v) {
        case 'object':
            if (v === null) {
                return TCODE.NUL
            } else if (Array.isArray(v)) {
                return TCODE.ARR
            } else {
                return TCODE.OBJ
            }
        case 'string':
            return TCODE.STR
        case 'number':
            return TCODE.NUM
        case 'boolean':
            return TCODE.BOO
        case 'undefined':
            return TCODE.NUL
        case 'function':
            return is_arr ? TCODE.ERR : TCODE_FUN
        default:
            return TCODE.ERR    // this would only happen for custom host objects in certain environments
    }
}

function walk_container (is_arr, container, cb, init, opt, path, control) {
    var keys_or_vals = is_arr ? container : Object.keys(container)
    var pathi = path.length
    var carry = init
    var ignored = 0
    for (var i = 0; i < keys_or_vals.length; i++) {
        var k
        var v
        if (is_arr) {
            k = null
            path[pathi] = i
            v = container[i]
        } else {
            k = keys_or_vals[i]
            path[pathi] = k
            if (opt.key_select && !opt.key_select(k, path)) {
                continue
            }
            v = container[k]
        }
        var tcode = typecode(v, is_arr)
        switch (tcode) {
            case TCODE_FUN: // ignore functions
                ignored++
                continue
            case TCODE.ERR:
                v = {msg: 'unexpected value', val: v}
        }

        carry = cb(carry, k, i-ignored, tcode, v, path, control)
        switch (control.walk) {
            case 'continue':
                if (tcode == TCODE.ARR || tcode === TCODE.OBJ) {
                    walk_container(tcode === TCODE.ARR, v, cb, carry, opt, path, control)
                }
                break
            case 'stop':
                return carry
            case 'skip':
                // children skipped, continue with others
                control.walk = 'continue'
                break
        }
    }
    if (path.length > pathi) {
        path.length = pathi
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
    map: function (o, fn) {
        var ret = {}
        var keys = Object.keys(o)
        for (var i=0; i<keys.length; i++) {
            ret[keys[i]] = fn(keys[i], o[keys[i]], i)
        }
        return ret
    },
    tcode: TCODE,
    walk: walk,
}
