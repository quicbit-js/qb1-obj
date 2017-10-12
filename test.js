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

test('keys', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                       [] ],
        [ {a:1,b:2},                ['a','b'] ],
    ], qbobj.keys)
})

test('vals', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                       [] ],
        [ {a:1,b:2,c:null},         [1,2,null] ],
    ], qbobj.vals)
})

test('len', function (t) {
    t.table_assert([
        [ 'o',                          'exp' ],
        [ {},                           0 ],
        [ {a:1,b:2},                    2 ],
        [ [1,2,3],                      3 ],
    ], qbobj.len)
})

test('map', function (t) {
    var kvi = function (k, v, i) { return k + '@' + i + '.' + val2str(qbobj.tcode(v), v)}
    var kgt = function (lim) { return function (k) { return k > lim ? k : null } }
    var vgt = function (lim) { return function (k,v) { return v > lim ? v : null } }
    t.table_assert([
        [ 'o',                          'kfn',    'vfn',    'opt',              'exp' ],
        [ {},                           null,     null,     null,               {} ],
        [ {a:3, b:null, c:13},          null,     null,      {},                { a:3, c:13 } ],
        [ {a:3, b:7, c:13},             null,     kvi,      {},                 { a: 'a@0.3', b: 'b@1.7', c: 'c@2.13' } ],
        [ {a:3, b:7, c:13},             kvi,      null,     {},                 { 'a@0.3': 3, 'b@1.7': 7, 'c@2.13': 13 } ],
        [ {a:3, b:{z:[7,8]}, c:13},     kvi,      null,     {},                 { 'a@0.3': 3, 'b@1.{1}': { z: [ 7, 8 ] }, 'c@2.13': 13 } ],
        [ {a:3, b:{z:[7,8]}, c:13},     kvi,      null,     {init: {q:9}},      { q: 9, 'a@0.3': 3, 'b@1.{1}': { z: [ 7, 8 ] }, 'c@2.13': 13 } ],
        [ {b:2, c:7, d:2},              kgt('b'), null,     {init: {a:1}},      { a:1, c:7, d:2 } ],
        [ {b:3, c:7, d:2},              null,     vgt(2),   {},                 { b:3, c:7 } ],
        [ {b:3, c:7, d:2},              kgt('b'), vgt(2),   {},                 { c:7 } ],
        [ {b:3, c:7, d:2},              kgt('b'), vgt(2),   {keep_null: 1},     { c:7, d:null } ],
    ], qbobj.map)
})

test('map deep', function (t) {
    A = function() { this.a = 3 }
    A.prototype.b = 4
    var ab = new A()
    var a = new A()
    t.table_assert([
        [ 'o',                          'kfn',    'vfn',    'opt',              'exp' ],
        [ ab,                           null,     null,     null,               {a:3} ],
        [ ab,                           null,     null,     {deep: ['b']},      {a:3, b:4} ],
    ], qbobj.map)
})

test('filter', function (t) {
    var sel_k = function (kexpr) { return function (k) { return kexpr.test(k) } }
    var sel_v = function (vmax) { return function (k,v) { return v <= vmax } }
    var sel_i = function (imax) { return function (k,v,i) { return i <= imax } }
    t.table_assert([
        [ 'o',              'fn',           'keys',       'exp' ],
        [ {},               null,           null,       {} ],
        [ {a:9, b:7},      sel_k(/x/),      null,       {} ],
        [ {a:9, b:7},      sel_k(/a/),      null,       {a:9} ],
        [ {a:9, b:7},      sel_k(/b/),      null,       {b:7} ],
        [ {a:9, b:7},      sel_v(3),        null,       {} ],
        [ {a:9, b:7},      sel_v(7),        null,       {b:7} ],
        [ {a:9, b:7},      sel_v(9),        null,       {a:9,b:7} ],
        [ {a:9, b:7},      sel_i(-1),       null,       {} ],
        [ {a:9, b:7},      sel_i(0),        null,       {a:9} ],
        [ {a:9, b:7},      sel_i(1),        null,       {a:9,b:7} ],
        [ {a:9, b:7},      sel_i(1),        ['a','b'],  {a:9,b:7} ],
        [ {a:9, b:7},      sel_v(7),        ['b'],      {b:7} ],
        [ {a:9, b:7},      sel_v(7),        ['a'],      {} ],
    ], qbobj.filter)
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

test('oo_put', function (t) {
    t.table_assert([
        [ 'o',              'k1',   'k2',   'v',    'exp' ],
        [ {},               'a',    'b',    7,      [undefined, {a:{b:7}}] ],
        [ {a:null},         'a',    'b',    7,      [undefined, {a:{b:7}}] ],
        [ {a:{b:7}},        'a',    'b',    8,      [7, {a:{b:8}}] ],
        [ {a:{b:7}},        'x',    'b',    2,      [undefined, {a:{b:7},x:{b:2}}] ],

    ], function (o, k1, k2, v) { var prev = qbobj.oo_put(o, k1, k2, v); return [prev, o] } )
})

test('oo_get', function (t) {
    t.table_assert([
        [ 'o',              'k1',   'k2',  'exp' ],
        [ {},               'a',    'b',   undefined ],
        [ {a:8},            'a',    'b',   undefined ],
        [ {a:{b:null}},     'a',    'b',   null ],
        [ {a:{b:4}},        'a',    'b',   4 ],

    ], qbobj.oo_get )
})

test('oa_push', function (t) {
    t.table_assert([
        [ 'o',              'k',    'v',    'exp' ],
        [ {},               'a',    null,   {a:[null]} ],
        [ {a:[]},           'a',    7,      {a:[7]} ],
        [ {a:[3]},          'a',    7,      {a:[3,7]} ],
        [ {a:[3],b:[2]},    'a',    7,      {a:[3,7],b:[2]} ],

    ], function (o, k, v) { qbobj.oa_push(o,k,v); return o } )
})

