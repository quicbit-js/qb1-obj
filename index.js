var assign = require('qb-assign')

// walk: iterate over any javascript value (object, array, string, number, null...) and all nested values invoking a
// callback.  Object function properties are ignored.  Functions in arrays or passed in as the first value are forwarded
// as an error (tcode = tcode.ERR) to the callback.
//
//   o          - the object to walk - which actually can be any value, array, string, number etc.
//
//   cb (           (callback function)
//       carry          - init value passed along - fn(fn(fn(init, ..), ...), ...)
//       container      - the container holding this value, or null, if at root (first call)
//       key,           - if within object, it is a string, if within array it is null
//       i,             - if within array, it is the array index, if within object it is the
//                        count of the key/value pair (insertion order)
//       type_code,     - { 0: err, 1: obj, 2: arr, 3, str, 5: num, 6: boo, 7: nul }.  module exported as 'tcode'.
//       value,         - the object or array value
//       path,          - an array holding keys/indexes of the current path (values are changed-in-place.  make a copy to preserve values)
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
//      map_mode        string - enables replacement of values or construction of a new object hierarchy
//                      'keys'   use the returned fn values to modify keys in objects rather than values (only objects are changed)
//                      'vals'   (default) use the returned fn values to construct new arrays and objects (deep copy)
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
    var carry = init
    var control = { walk: 'continue' }
    if (!opt.typ_select || opt.typ_select(tcode, path)) {
        carry = cb(init, null, 0, tcode, v, path, control)
    }
    if (control.walk === 'continue') {
        carry = walk_container(v, cb, carry, opt, path, control)
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

// map_dst, if set, will be populated with results from cb()
function walk_container (container, cb, carry, opt, path, control) {
    if (control.walk === 'stop') { return carry }

    var in_object = !Array.isArray(container)
    var keys_or_vals = in_object ? Object.keys(container) : container
    var depth = path.length
    for (var i = 0; i < keys_or_vals.length; i++) {
        var k = in_object ? keys_or_vals[i] : null
        path[depth] = k || i
        if (in_object && opt.key_select && !opt.key_select(k, path)) {
            continue
        }
        var v = container[k || i]
        var tcode = typecode(v)
        if (opt.typ_select && !opt.typ_select(tcode, path)) {
            continue
        }

        var is_container = tcode === TCODE.ARR || tcode === TCODE.OBJ
        // carry/reduce (not map-mode)
        carry = cb(carry, k, i, tcode, v, path, control)
        if (control.walk === 'continue' && is_container) {
            carry = walk_container(v, cb, carry, opt, path, control)
            // control may be modifed from this call or above cb()
        }

        if (control.walk === 'skip') {
            control.walk = 'continue'
            break
        }
        if (control.walk === 'stop') {
            return carry
        }
    }

    if (path.length > depth) {
        path.length = depth
    }
    return carry
}

function map_vals_in_situ_cb (fn) {
    return function (carry, k, i, tcode, v, path) {
        switch (tcode) {
            case TCODE.ARR: case TCODE.OBJ: return v
            default:                        return fn(k == null ? i : k, v, i, path)
        }
    }
}

function map_vals_cb (fn) {
    return function (carry, k, i, tcode, v, path) {
        switch (tcode) {
            case TCODE.ARR: return []
            case TCODE.OBJ: return {}
            default:        return fn(k == null ? i : k, v, i, path)
        }
    }
}

function map_key_cb (fn) {
    return function (carry, k, i, tcode, v, path) {
        return fn(k, v, i, path)
    }
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
    // return a new object with either keys or values returned by the given fn() (see opt.keys).
    // This is a simple shallow traversal.   For nested traversal, see mapw().
    // fn
    //      k       the property key
    //      v       the property value
    //      i       the index of the property value
    // opt
    //      map_mode    str
    //                      'keys' the returned object will use the keys returned from fn()
    //                      'vals' (default) the returned object will consist of values returned from fn()
    //
    map: function (o, fn, opt) {
        var ret = {}
        var keys = Object.keys(o)
        var len = keys.length
        var i
        if (opt && opt.map_mode === 'keys') {
            for (i=0; i<len; i++) { ret[fn(keys[i], o[keys[i]], i)] = o[keys[i]] }
        } else {
            for (i=0; i<len; i++) { ret[keys[i]] = fn(keys[i], o[keys[i]], i) }
        }
        return ret
    },

    // A walk-based map function performing nested traversal and replacement.
    // By default, creates new objects.  Use opt.map_in_place to modify the
    // given object in-place.
    //
    // c            the container (array or object) to map
    //
    // fn
    //      ki      str|int      - array index (number) or object key (string)
    //      v       !(arr|obj)   - the value of current leaf item (non-container)
    //      i       int          - the index of the property value (same as i for arrays)
    //      path    [str|int]    - the current location path (array - see walk function)
    //
    // opt
    //      map_mode        str
    //                          'keys'   use the returned fn values to modify keys in objects rather than values (only objects are changed)
    //                          'vals'   (default) use the returned fn values to construct new arrays and objects (deep copy)
    //                          'vals-in-situ' use the returned fn values to modify objects and arrays in-place.
    //
    //      key_select      same as walk option
    //      typ_select      same as walk option
    //

    mapw: function (c, fn, opt) {
        opt = assign({}, opt)
        var in_situ = opt.map_mode === 'vals-in-situ'
        opt.map_mode = opt.map_mode === 'keys' ? 'keys' : 'vals'    // walk has just two map modes: 'keys' and 'vals'
        var cb
        var init = null
        if (in_situ) {
            cb = map_vals_in_situ_cb(fn)
        } else {
            init = Array.isArray(c) ? [] : {}
            cb = opt.map_mode === 'keys' ? map_key_cb(fn) : map_vals_cb(fn)
        }
        return walk(c, cb, init, opt)
    },
    tcode: TCODE,
    walk: walk,
}
