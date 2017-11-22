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

var test = require('test-kit').tape()
var qbobj = require('.')
var TCODES = qbobj.TCODES

function err (msg) { throw Error(msg) }

function val2str (tcode, v) {
    switch (tcode) {
        case TCODES.ARR: return '[' + v.length + ']'
        case TCODES.OBJ: return '{' + Object.keys(v).length + '}'
        case TCODES.BOO: return v ? 'T' : 'F'
        case TCODES.NUM:
        case TCODES.STR: return String(v)
        case TCODES.NUL: return 'N'
        case TCODES.FUN: return 'F'; break
    }
}

function path_and_val (control_fn, with_i) {
    return function (carry, k, i, tcode, v, path, control) {
        var last = path[path.length - 1] || 0
        var pstr = path.join('/') || 'R'        // return 'R' for root
        if (k === null) {
            last === i || err('path does not match index: ' + i + ' and ' + pstr)
        } else {
            last === k || err('path does not match key: ' + k + ' and ' + pstr)
            if (with_i) {
                pstr += '.' + i     // add index
            }
        }
        carry.push(pstr + ':' + val2str(tcode, v))
        if (control_fn) {
            control_fn (k, i, tcode, v, path, control)
        }
        return carry
    }
}

test('walk', function (t) {
    var fn = function phooey () {}
    t.table_assert([
        [ 'o',                              'init',     'opt',   'exp' ],
        [ {},                               [],         null,     [ 'R:{0}' ] ],
        [ {},                               ['first'],  null,     [ 'first', 'R:{0}' ] ],
        [ {a:1},                            ['first'],  null,     [ 'first', 'R:{1}', 'a.0:1' ] ],
        [ {a:1, b:'foo', c:true, d:null},   [],         null,     [ 'R:{4}', 'a.0:1', 'b.1:foo', 'c.2:T', 'd.3:N' ] ],
        [ {a:1, b:undefined},               [],         null,     [ 'R:{2}', 'a.0:1', 'b.1:N' ] ],
        [ {a:{},b:[],c:3},                  [],         null,     [ 'R:{3}', 'a.0:{0}', 'b.1:[0]', 'c.2:3' ] ],
        [ {a:{x:1,y:2}},                    [],         null,     [ 'R:{1}', 'a.0:{2}', 'a/x.0:1', 'a/y.1:2' ] ],
        [ {a:{x:1,y:2}, b:{z:3}},           [],         null,     [ 'R:{2}', 'a.0:{2}', 'a/x.0:1', 'a/y.1:2', 'b.1:{1}', 'b/z.0:3' ] ],
        [ {a:{x:1,y:2},b:[7,8,9]},          [],         null,     [ 'R:{2}', 'a.0:{2}', 'a/x.0:1', 'a/y.1:2', 'b.1:[3]', 'b/0:7', 'b/1:8', 'b/2:9' ] ],
        [ {a:{x:fn,y:2},b:[7,8,9]},         [],         null,     [ 'R:{2}', 'a.0:{2}', 'a/x.0:F', 'a/y.1:2', 'b.1:[3]', 'b/0:7', 'b/1:8', 'b/2:9' ] ],
        [ [],                               [],         null,     [ 'R:[0]' ] ],
        [ [[[]]],                           [],         null,     [ 'R:[1]', '0:[1]', '0/0:[0]' ] ],
        [ [[{}]],                           [],         null,     [ 'R:[1]', '0:[1]', '0/0:{0}' ] ],
        [ [7,8,9],                          [],         null,     [ 'R:[3]', '0:7', '1:8', '2:9' ] ],
    ], function (o, init, opt) { return qbobj.walk(o, path_and_val(null, true), init, opt)} )
})

test('walk - key_select', function (t) {
    function ks(regex, depth) {
        return function (k, path) {
            return path.length !== depth || regex.test(k)
        }
    }
    t.table_assert([
        [ 'o',                              'init',     'opt',                       'exp' ],
        [ {},                               ['first'],  {key_select: ks(/a/,0)},     [ 'first', 'R:{0}' ] ],  // filter not applied (no keys at depth 0)
        [ {a:1},                            ['first'],  {key_select: ks(/a/,0)},     [ 'first', 'R:{1}', 'a:1' ] ],
        [ {a:1, b:'foo', c:true, d:null},   [],         {key_select: ks(/b/,1)},     [ 'R:{4}', 'b:foo' ] ],
        [ {a:{x:1,y:2}},                    [],         {key_select: ks(/x/,2)},     [ 'R:{1}', 'a:{2}', 'a/x:1' ] ],
        [ {a:{x:1,y:2}},                    [],         {key_select: ks(/y/,2)},     [ 'R:{1}', 'a:{2}', 'a/y:2' ] ],
    ], function (o, init, opt) { return qbobj.walk(o, path_and_val(), init, opt)} )
})

test('walk - typ_select', function (t) {
    function ts(whichcode, depth) {
        return function (tcode, path) {
            return path.length !== depth || whichcode === tcode // apply filter at the given depth only
        }
    }
    t.table_assert([
        [ 'o',                              'init',     'opt',                          'exp' ],
        [ {},                               ['first'],  {typ_select: ts(TCODES.NUM,-1)}, [ 'first', 'R:{0}' ] ], // filter not applied
        [ {},                               ['first'],  {typ_select: ts(TCODES.NUM,0)},  [ 'first' ] ],
        [ {a:1},                            ['first'],  {typ_select: ts(TCODES.NUM,1)},  [ 'first', 'R:{1}', 'a:1' ] ],
        [ {a:[1,2,3], b:true, d:null, e:7}, [],         {typ_select: ts(TCODES.NUM,1)},  [ 'R:{4}', 'e:7' ] ],
        [ {a:[1,'b',3], b:true, d:null, e:7}, [],       {typ_select: ts(TCODES.NUM,2)},  [ 'R:{4}', 'a:[3]', 'a/0:1', 'a/2:3', 'b:T', 'd:N', 'e:7' ] ],
    ], function (o, init, opt) { return qbobj.walk(o, path_and_val(), init, opt)} )
})

test('walk control', function (t) {
    var maxdepth_cb = function (maxdepth, control_arg) {
        return path_and_val(
            function (k, i, tcode, v, path, control) {
                if (path.length === maxdepth) { control.walk = control_arg }
            }
        )
    }

    t.table_assert([
        [ 'o',                         'depth', 'control_arg',  'init', 'opt',   'exp' ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      5,  'skip_peers',   [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'a/b/0/c:5', 'a/b/0/d:6', 'a/b/1:7', 'x:[1]', 'x/0:8'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      4,  'skip_peers',   [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'a/b/0/c:5', 'a/b/1:7', 'x:[1]', 'x/0:8'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      3,  'skip_peers',   [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'x:[1]', 'x/0:8'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      2,  'skip_peers',   [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'x:[1]', 'x/0:8' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      1,  'skip_peers',   [],     null,    [ 'R:{2}', 'a:{1}' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      0,  'skip_peers',   [],     null,    [ 'R:{2}' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      5,  'skip',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'a/b/0/c:5', 'a/b/0/d:6', 'a/b/1:7', 'x:[1]', 'x/0:8'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      4,  'skip',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'a/b/0/c:5', 'a/b/0/d:6', 'a/b/1:7', 'x:[1]', 'x/0:8'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      3,  'skip',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'a/b/1:7', 'x:[1]', 'x/0:8'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      2,  'skip',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'x:[1]', 'x/0:8' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      1,  'skip',         [],     null,    [ 'R:{2}', 'a:{1}', 'x:[1]' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      0,  'skip',         [],     null,    [ 'R:{2}' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      5,  'stop',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'a/b/0/c:5', 'a/b/0/d:6', 'a/b/1:7', 'x:[1]', 'x/0:8'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      4,  'stop',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}', 'a/b/0/c:5' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      3,  'stop',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]', 'a/b/0:{2}' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      2,  'stop',         [],     null,    [ 'R:{2}', 'a:{1}', 'a/b:[2]'  ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      1,  'stop',         [],     null,    [ 'R:{2}', 'a:{1}' ] ],
        [ {a:{b:[{c:5,d:6},7]},x:[8]},      0,  'stop',         [],     null,    [ 'R:{2}' ] ],
    ], function (o, depth, control_arg, init, opt) {return qbobj.walk(o, maxdepth_cb(depth, control_arg), init, opt)} )
})

test('for_val', function (t) {
    t.table_assert([
        [ 'obj',                                'exp' ],
        [ {a: null},                            [ [ 'a', null, 0 ] ] ],
        [ {a: 1},                               [ [ 'a', 1, 0 ] ] ],
        [ {a: [1,2,3], b: {c: 4}},              [ [ 'a', [ 1, 2, 3 ], 0 ], [ 'b', { c: 4 }, 1 ] ] ],
    ], function (obj) {
        var hec = t.hector()
        qbobj.for_val(obj, hec)
        return hec.args
    })
})

test('mapn', function (t) {
    var ki = function(k,v,i) {
        return k + i
    }
    var vi3 = function(k,v,i) {return v*(i+3)}
    var nullval = function (val_to_null) {
        return function (k,v,i) {
            return v === val_to_null ? null : v
        }
    }
    var nullkey = function (key_to_null) {
        return function (k,v,i) {
            return k === key_to_null ? null : k
        }
    }

    t.table_assert([
        [ 'o',                          'kfn',      'vfn',      'opt',              'exp' ],
        [ {},                           null,       null,       null,               {}],
        [ {a:1,b:2},                    ki,         null,       null,               {a0:1,b1:2}],
        [ {a:1,b:{x:7,y:8},c:2},        ki,         null,       null,               {a0:1,b1:{x0:7,y1:8},c2:2 }],
        [ {a:1,b:[7,8],c:2},            ki,         null,       null,               {a0:1,b1:[7,8],c2:2 }],
        [ [1,[7,{a:8}],2],              ki,         null,       null,               [1,[7,{a0:8}],2]],
        [ {a:1,b:2},                    null,       vi3,        null,               {a:3,b:8}],
        [ {a:1,b:{x:7,y:8},c:2},        null,       vi3,        null,               { a: 3, b: { x: 21, y: 32 }, c: 10 }],
        [ {a:1,b:{x:7,y:8},c:2},        null,       vi3,        {init: {z:7}},      { z: 7, a: 3, b: { x: 21, y: 32 }, c: 10 }],
        [ {a:3,b:7,c:[5,9]},            null,       vi3,        null,               {a:9,b:28,c:[15,36]}],
        [ {a:3,b:7,c:[{d:[1,3,5]},9]},  null,       vi3,        null,               {a:9,b:28,c:[{d:[3,12,25]},36]} ],
        [ [3,7,[{d:[1,3,5]},9]],        null,       vi3,        null,               [9,28,[{d:[3,12,25]},36]] ],
        [ [3,7,[{d:[1,3,5]},9]],        null,       vi3,        null,               [9,28,[{d:[3,12,25]},36]] ],
        [ {a:3,b:7,c:[{d:[1,3,5]},9]},  null,       nullval(7),        null,        {a:3,c:[{d:[1,3,5]},9]}],
        [ {a:3,b:7,c:[{d:[1,3,5]},9]},  nullkey('c'), null,        null,            {a:3,b:7}],
    ], qbobj.mapn )
})
