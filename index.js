var assign = require('qb-assign')

// walk: iterate over any javascript value (object, array, string, number, null...) and all nested values invoking a
// callback.
//
//   o          - the object to walk - which actually can be any value, array, string, number etc.
//
//   cb (           (callback function)
//       carry          - init value passed along - fn(fn(fn(init, ..), ...), ...)
//       key,           - if within object, it is a string, if within array it is null
//       i,             - if within array, it is the array index, if within object it is the
//                        count of the key/value pair (insertion order)
//       type_code,     - { 0: err, 1: obj, 2: arr, 3, str, 5: num, 6: boo, 7: nul, 8: function }.  See 'TCODE' export
//       value,         - the object or array value
//       path,          - an array holding keys/indexes of the current path (values are changed-in-place.  make a copy to preserve values)
//       pstate,        - an array that can hold custom state for every container in the current path.
//                          pstate[path.length] is the current parent (one longer than path).  values are undefined until set.
//       control        - an object that controls iteration and replacement
//           walk
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
//      typ_select      - inclusive list of types to include in the walk (callback): [ obj, arr, str, int, num, boo, nul ]
//
//      key_select      - function (key, path)
//
//                      if set, this function is called for each key prior to calling the callback.
//                      The function should return true to include the value for this key, false to skip.
//                      note that path also has the key as its last value.
//
//
function walk (v, cb, init, opt) {
    opt = opt || {}
    var tcode = typecode(v)
    var path = []
    var pstate = []
    var carry = init
    var control = { walk: 'continue' }
    if (!opt.typ_select || opt.typ_select(tcode, path)) {
        carry = cb(init, null, 0, tcode, v, path, pstate, control)
    }
    if (control.walk === 'continue') {
        carry = walk_container(v, cb, carry, opt, path, pstate, control)
    }
    return carry
}

var TCODE = {
    OBJ: 1,
    ARR: 2,
    STR: 3,
    NUM: 4,
    BOO: 5,
    NUL: 6,
    FUN: 7,
}

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
            return TCODE.FUN
        default:
            // default case handles 'object' including host objects that may occur in certain environments
            return v === null ? TCODE.NUL : (Array.isArray(v) ? TCODE.ARR : TCODE.OBJ)
    }
}

function walk_container (src, cb, carry, opt, path, pstate, control) {
    var in_object = !Array.isArray(src)
    var keys_or_vals = in_object ? Object.keys(src) : src
    var depth = path.length
    for (var i = 0; i < keys_or_vals.length; i++) {
        var k = in_object ? keys_or_vals[i] : null
        path[depth] = k || i
        if (in_object && opt.key_select && !opt.key_select(k, path)) {
            continue
        }
        var v = src[k || i]
        var tcode = typecode(v)
        if (opt.typ_select && !opt.typ_select(tcode, path)) {
            continue
        }

        var is_container = tcode === TCODE.ARR || tcode === TCODE.OBJ
        // carry/reduce (not map-mode)
        carry = cb(carry, k, i, tcode, v, path, pstate, control)
        if (control.walk === 'continue' && is_container) {
            carry = walk_container(v, cb, carry, opt, path, pstate, control)  // NOTE: this can modify control value
        }
        if (control.walk === 'skip') {
            control.walk = 'continue'
        } else if (control.walk === 'skip_peers') {
            control.walk = 'continue'
            break
        } else if (control.walk === 'stop') {
            return carry
        }
    }

    if (path.length > depth) {
        path.length = depth
        pstate.length = depth
    }
    return carry
}

//
//
// kfn (            function if provided, maps keys to new keys (maintaining order)
//     k            object key, or null for arrays
//     i            array index or object item number (ordered)
//     tcode        value type code (TCODE)
//     v            value
//     path         array path (keys and indexes)
// )
// vfn (            function if provided maps values to new values (maintaining order)
//     k            object key, or null for arrays
//     i            array index or object item number (ordered)
//     tcode        value type code (TCODE)
//     v            value
//     path         array path (keys and indexes)
// )
//
// opt {
//     init         object, if provided will be used as the root object to populate
// }
//
function map (o, kfn, vfn, opt) {
    opt = opt || {}
    var init = opt.init || {}
    return walk(o, function (carry, k, i, tcode, v, path, pstate) {
        if (kfn) {
            k = k && kfn(k, i, tcode, v, path)
        }
        var parent = pstate[pstate.length-1]
        switch (tcode) {
            case TCODE.ARR: v = []; pstate.push(v); break
            case TCODE.OBJ:
                if (init) {
                    v = init; init = null
                } else {
                    v = {}
                }
                pstate.push(v)
                break
            default:
                if (vfn) {
                    v = vfn(k, i, tcode, v, path)
                }
        }
        if (parent) {
            parent[k || i] = v
        }
        return pstate[0]
    }, null, opt)
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
    filter: function (o, fn) {
        var ret = {}
        var keys = keys || Object.keys(o)
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i]
            if (fn(k,o[k],i)) { ret[k] = o[k] }
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
    walk: walk,
    map: map,
    TCODE: TCODE,
}
