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
//      map_carry       if truthy, then replace values with values returned from the callback.  Return
//                      same arrays/objects from the cb to achieve a map-in-place, or return new arrays/objects
//                      to do deep copy.
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

    // callback with root
    var tcode = typecode(v)
    if (tcode === TCODE_FUN) {
        tcode = TCODE.ERR
        v = { msg: 'illegal value (function)', val: v }
    }
    var path = []
    var control = { walk: 'continue' }
    var carry = (opt.typ_select && !opt.typ_select(tcode, path))
        ? init
        : cb(init, null, 0, tcode, v, [], control)

    if (control.walk !== 'continue') {
        return carry
    }

    var ncarry = carry
    if (tcode === TCODE.ARR || tcode === TCODE.OBJ) {
        ncarry = walk_container(v, cb, carry, opt, [], control)
    }
    return opt.map_carry ? carry : ncarry
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

// if opt.map_carry, then carry is the target container (array or object)
var STOP_OBJ = {carry: null }
function walk_container (container, cb, carry, opt, path, control) {
    var in_object = !Array.isArray(container)
    var keys_or_vals = in_object ? Object.keys(container) : container
    var depth = path.length
    var ignored_prop = 0
    var ncarry = carry
    for (var i = 0; i < keys_or_vals.length; i++) {
        var k   // the object key, if in object
        var ki  // the key or index actually used (array index or object key)
        if (in_object) {
            k = keys_or_vals[i]
            ki = k
        } else {
            k = null
            ki = i
        }
        path[depth] = ki
        if (in_object && opt.key_select && !opt.key_select(k, path)) {
            continue
        }
        var v = container[ki]
        var tcode = typecode(v)
        if (tcode === TCODE_FUN) {
            if (in_object) {
                ignored_prop++
                continue
            } else {
                tcode = TCODE.ERR
                v = { msg: 'unexpected function.  functions are only allowed as object properties', val: v }
            }
        }

        if (opt.map_carry) {
            ncarry = cb(carry, k, i-ignored_prop, tcode, v, path, control)
            carry[ki] = ncarry
        } else {
            ncarry = cb(ncarry, k, i-ignored_prop, tcode, v, path, control)
        }
        switch (control.walk) {
            case 'continue':
                // walk children
                if (tcode === TCODE.ARR || tcode === TCODE.OBJ) {
                    var wcarry = walk_container(v, cb, ncarry, opt, path, control)
                    if (wcarry === STOP_OBJ) {
                        return depth === 0 ? STOP_OBJ.carry : STOP_OBJ          // unwrap carry when leaving (depth = 1)
                    }
                    if (!opt.map_carry) {
                        ncarry = wcarry
                    }
                }
                break
            case 'stop':
                if (depth === 0) {
                    return ncarry
                } else {
                    STOP_OBJ.carry = ncarry
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
    return ncarry
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
    // return a new object with same own-values, but new key names (in same insertion order)
    // fn
    //      k       the property key
    //      v       the property value
    //      i       the index of the property value
    mapk: function (o, fn) {
        var ret = {}
        var keys = Object.keys(o)
        for (var i=0; i<keys.length; i++) {
            var v = o[keys[i]]
            ret[fn(keys[i], v, i)] = v
        }
        return ret
    },
    // return a new object with the same keys, but new values
    // fn
    //      k       the property key
    //      v       the property value
    //      i       the index of the property value
    map: function (o, fn) {
        var ret = {}
        var keys = Object.keys(o)
        for (var i=0; i<keys.length; i++) {
            ret[keys[i]] = fn(keys[i], o[keys[i]], i)
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
    //      ki      array index (number) or object string (key)
    //      v       the property value
    //      i       the index of the property value (same as i for arrays)
    //
    // opt
    //      map             set to 'in-place' to modify all containers in place, or 'copy' to return new objects/arrays (the default)
    //      key_select      same as walk option
    //      typ_select      same as walk option
    //

    mapw: function (c, fn, opt) {
        opt = opt || {}
        opt.map = opt.map || ''
        var in_place = opt && opt.map_in_place
        return walk(
            c,
            function (carry, container, k, i, tcode, v, path, control) {
                var ki = k === null ? i : k

                if (in_place) {
                    container[ki] = fn(ki, v, i)
                }
            },
            in_place ? null : Array.isArray(a_or_o) ? [] : {},
            opt
        )
    },
    tcode: TCODE,
    walk: walk,
}
