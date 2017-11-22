// Software License Agreement (ISC License)
//
// Copyright (c) 2017, Matthew Voss
//
// Permission to use, copy, modify, and/or distribute this software for
// any purpose with or without fee is hereby granted, provided that the
// above copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

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

var TCODES = {
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
            return TCODES.STR
        case 'number':
            return TCODES.NUM
        case 'boolean':
            return TCODES.BOO
        case 'undefined':
            return TCODES.NUL
        case 'function':
            return TCODES.FUN
        default:
            // default case handles 'object' including host objects that may occur in certain environments
            return v === null ? TCODES.NUL : (Array.isArray(v) ? TCODES.ARR : TCODES.OBJ)
    }
}

function walk_container (src, cb, carry, opt, path, control) {
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

        var is_container = tcode === TCODES.ARR || tcode === TCODES.OBJ
        // carry/reduce (not map-mode)
        carry = cb(carry, k, i, tcode, v, path, control)
        if (control.walk === 'continue' && is_container) {
            carry = walk_container(v, cb, carry, opt, path, control)  // NOTE: this can modify control value
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
    }
    return carry
}

function for_val (o, vfn) {
    var keys = Object.keys(o)
    for (var i=0; i<keys.length; i++) {
        vfn(keys[i], o[keys[i]], i)
    }
}

// nested map function
//
// kfn if provided, maps keys to new keys.  returning null will prune the object (skip value).
// kfn (
//     k            object key, or null for arrays
//     v            value
//     i            array index or object item number (ordered)
//     tcode        value type code (TCODE)
//     path         array path (keys and indexes)
// )
// returns          the new key, or null to skip / prune
//
//
// vfn, if provided maps *leaf* values to new values.  only called for terminals / leaves, not for objects and arrays
// vfn (
//     k            object key, or null for arrays
//     v            value
//     i            array index or object item number (ordered)
//     tcode        value type code (TCODE)
//     path         array path (keys and indexes)
// )
// returns          the new value, or null to skip / prune.  null values are pruned by default.
//
// opt {
//     init         object, if provided will be used as the root object to populate
//     containers
// }
//
// Notes - possible extensions -
//          make pruning null values optional
//          allow visiting objects and arrays, but handle skip / continue of object to terminal (skips always).
//              disallow modify-in-place (create new container if v === fn(v)?)
//
function mapn (o, kfn, vfn, opt) {
    opt = opt || {}
    var pstate = []
    return walk(o, function (carry, k, i, tcode, v, path, control) {
        if (path.length === 0 && opt.init) {
            pstate.push(opt.init)
            return opt.init
        }
        pstate.length = path.length  // keep parent state in sync with depth
        if (k && kfn) {
            k = kfn(k, v, i, tcode, path)
            if (k == null) {
                control.walk = 'skip'
                return pstate[0]
            }
        }
        var parent = pstate[pstate.length-1]
        switch (tcode) {
            case TCODES.ARR: v = []; pstate.push(v); break
            case TCODES.OBJ: v = {}; pstate.push(v); break
            default:
                if (vfn) {
                    v = vfn(k, v, i, tcode, path)
                }
        }
        if (parent && v != null) {
            parent[k || i] = v
        }
        return pstate[0]
    }, null, opt)
}

module.exports = {
    for_val: for_val,
    walk: walk,
    mapn: mapn,
    tcode: typecode,
    TCODES: TCODES,
}
