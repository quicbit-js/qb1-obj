var test = require('test-kit').tape()
var obj = require('.')
var TCODE = obj.tcode

function err (msg) { throw Error(msg) }
function path_and_val (control_fn) {
    return function (carry, k, i, tcode, v, path, control) {
        var vstr
        switch (tcode) {
            case TCODE.ARR: vstr = '[' + v.length + ']'; break
            case TCODE.OBJ: vstr = '{' + Object.keys(v).filter(function (k){ return typeof(obj[k] !== 'function')}).length + '}'; break
            case TCODE.ERR: vstr = 'Error(' + v.msg + ':' + v.val + ')'; break
            case TCODE.BOO: vstr = v === true ? 'T' : 'F'; break
            case TCODE.NUM:
            case TCODE.STR:
                vstr = String(v); break
            case TCODE.NUL: vstr = 'N'; break
            default:
                throw Error('unexpected type code: ' + tcode)
        }
        var last = path[path.length - 1] || 0
        var pstr = path.join('/') || 'R'        // return 'R' for root
        if (k === null) {
            last === i || err('path does not match index: ' + i + ' and ' + pstr)
        } else {
            last === k || err('path does not match key: ' + k + ' and ' + pstr)
            pstr += '.' + i     // add index
        }
        carry.push(pstr + ':' + vstr)
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
        [ {a:{x:fn,y:2},b:[7,8,9]},         [],         null,     [ 'R:{2}', 'a.0:{2}', 'a/y.0:2', 'b.1:[3]', 'b/0:7', 'b/1:8', 'b/2:9' ] ],  // ignore object functions
        [ [],                               [],         null,     [ 'R:[0]' ] ],
        [ [[[]]],                           [],         null,     [ 'R:[1]', '0:[1]', '0/0:[0]' ] ],
        [ [[{}]],                           [],         null,     [ 'R:[1]', '0:[1]', '0/0:{0}' ] ],
        [ [7,8,9],                          [],         null,     [ 'R:[3]', '0:7', '1:8', '2:9' ] ],
    ], function (o, init, opt) { return obj.walk(o, path_and_val(), init, opt)} )
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
        [ {a:1},                            ['first'],  {key_select: ks(/a/,0)},     [ 'first', 'R:{1}', 'a.0:1' ] ],
        [ {a:1, b:'foo', c:true, d:null},   [],         {key_select: ks(/b/,1)},     [ 'R:{4}', 'b.1:foo' ] ],
        [ {a:{x:1,y:2}},                    [],         {key_select: ks(/x/,2)},     [ 'R:{1}', 'a.0:{2}', 'a/x.0:1' ] ],
        [ {a:{x:1,y:2}},                    [],         {key_select: ks(/y/,2)},     [ 'R:{1}', 'a.0:{2}', 'a/y.1:2' ] ],
    ], function (o, init, opt) { return obj.walk(o, path_and_val(), init, opt)} )
})

test('walk - typ_select', function (t) {
    function ts(whichcode, depth) {
        return function (tcode, path) {
            return path.length !== depth || whichcode === tcode
        }
    }
    t.table_assert([
        [ 'o',                              'init',     'opt',                          'exp' ],
        [ {},                               ['first'],  {typ_select: ts(TCODE.NUM,-1)}, [ 'first', 'R:{0}' ] ], // filter not applied
        [ {},                               ['first'],  {typ_select: ts(TCODE.NUM,0)},  [ 'first' ] ],
        [ {a:1},                            ['first'],  {typ_select: ts(TCODE.NUM,0)},  [ 'first','a.0:1' ] ],
        [ {a:[1,2,3], b:true, d:null, e:7}, [],         {typ_select: ts(TCODE.NUM,1)},  [ 'R:{4}', 'e.3:7' ] ],
        [ {a:[1,'b',3], b:true, d:null, e:7}, [],       {typ_select: ts(TCODE.NUM,2)},  [ 'R:{4}', 'a.0:[3]', 'a/0:1', 'a/2:3', 'b.1:T', 'd.2:N', 'e.3:7' ] ],
    ], function (o, init, opt) { return obj.walk(o, path_and_val(), init, opt)} )
})

test('walk errors', function (t) {
    var fn = function chewy () {}
    t.table_assert([
        [ 'o',                              'init',   'opt',   'exp' ],
        [ fn,                               [],       null,    [ 'R:Error(illegal value (function):function chewy() {})' ] ],
        [ [7,fn,9],                         [],       null,    [ 'R:[3]', '0:7', '1:Error(unexpected function.  functions are only allowed as object properties:function chewy() {})', '2:9' ] ],
    ], function (o, init, opt) { return obj.walk(o, path_and_val(), [], opt)} )
})

test('walk control', function (t) {
    var maxdepth = function (maxdepth, skip_stop) {
        return path_and_val(
            function (k, i, tcode, v, path, control) {
                if (path.length === maxdepth) { control.walk = skip_stop }
            }
        )
    }

    t.table_assert([
        [ 'o',                          'cb',                  'init',   'opt',   'exp' ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(0, 'skip'),   [],       null,    [ 'R:{2}' ] ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(1, 'skip'),   [],       null,    [ 'R:{2}', 'a.0:{1}', 'x.1:[1]' ] ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(2, 'skip'),   [],       null,    [ 'R:{2}', 'a.0:{1}', 'a/b.0:[1]', 'x.1:[1]', 'x/0:7' ] ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(3, 'skip'),   [],       null,    [ 'R:{2}', 'a.0:{1}', 'a/b.0:[1]', 'a/b/0:{1}', 'x.1:[1]', 'x/0:7'  ] ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(0, 'stop'),   [],       null,    [ 'R:{2}' ] ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(1, 'stop'),   [],       null,    [ 'R:{2}', 'a.0:{1}' ] ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(2, 'stop'),   [],       null,    [ 'R:{2}', 'a.0:{1}', 'a/b.0:[1]'  ] ],
        [ {a:{b:[{c:'hi'}]},x:[7]},      maxdepth(3, 'stop'),   [],       null,    [ 'R:{2}', 'a.0:{1}', 'a/b.0:[1]', 'a/b/0:{1}' ] ],
    ], obj.walk )
})

test('walk - map_carry in-place', function (t) {
    var in_situ_cb = function (regex, nv) {
        return function (carry, k, i, tcode, v, path) {
            switch (tcode) {
                case TCODE.ARR: case TCODE.OBJ:     return v
                default:                            return regex.test(k || String(i)) ? nv : v
            }
        }
    }

    t.table_assert([
        [ 'o',                          'cb',                     'opt',            'exp' ],
        [ {a:7},                        in_situ_cb(/a/, 3),       {map_mode:'vals'},   [true, {a:3}] ],
        [ {a:{b:7}},                    in_situ_cb(/b/, 3),       {map_mode:'vals'},   [true, {a:{b:3}}] ],
        [ {a:[7,8,9]},                  in_situ_cb(/1/, 3),       {map_mode:'vals'},   [true, {a:[7,3,9]}] ],
        [ [7,8,9],                      in_situ_cb(/1/, 3),       {map_mode:'vals'},   [true, [7,3,9]] ],
    ], function (o, cb, opt) { var n = obj.walk(o, cb, null, opt); return [n === o, n]} )
})

test('walk - map_carry copy', function (t) {
    var copy_cb = function (regex, nv) {
        return function (carry, k, i, tcode, v) {
            switch (tcode) {
                case TCODE.ARR:     return []
                case TCODE.OBJ:     return {}
                default:            return regex.test(k || String(i)) ? nv : v
            }
        }
    }

    t.table_assert([
        [ 'o',                          'cb',                   'init', 'opt',           'exp' ],
        [ {},                           copy_cb(/a/, 3),        {},     {map_mode:'vals'},   [false, {}] ],
        [ {a:7},                        copy_cb(/a/, 3),        {},     {map_mode:'vals'},   [false, {a:3}] ],
        [ {a:{b:7}},                    copy_cb(/b/, 3),        {},     {map_mode:'vals'},   [false, {a:{b:3}}] ],
        [ {a:[7,8,9]},                  copy_cb(/1/, 3),        {},     {map_mode:'vals'},   [false, {a:[7,3,9]}] ],
        [ [],                           copy_cb(/a/, 3),        {},     {map_mode:'vals'},   [false, []] ],
        [ [7,8,9],                      copy_cb(/1/, 3),        [],     {map_mode:'vals'},   [false, [7,3,9]] ],
    ], function (o, cb, init, opt) { var n = obj.walk(o, cb, init, opt); return [n === o, n]} )
})

test('walk - map_carry - replace containers', function (t) {
    var dreplace = function (depth) {
        return function (carry, k, i, tcode, v, path, control) {
            return path.length === depth ? ('i=' + i) : v
        }
    }

    t.table_assert([
        [ 'o',                          'cb',                   'init', 'opt',           'exp' ],
        [ {a:7},                        dreplace(0),            {},     {map_mode:'vals'},   'i=0' ],
        [ {a:7,b:8},                    dreplace(1),            {},     {map_mode:'vals'},   {a:'i=0',b:'i=1'} ],
        [ {a:{x:[7,8,9]},b:8},          dreplace(2),            {},     {map_mode:'vals'},   {a:{x:'i=0'},b:8} ],
        [ {a:{x:[7,8,9]},b:8},          dreplace(3),            {},     {map_mode:'vals'},   {a:{x:['i=0','i=1','i=2' ]},b:8} ],
    ], obj.walk )
})

test('keys', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                       [] ],
        [ {a:1,b:2},                ['a','b'] ],
    ], obj.keys)
})

test('vals', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                       [] ],
        [ {a:1,b:2,c:null},         [1,2,null] ],
    ], function (o) {
        return obj.vals(o)
    })
})

test('length', function (t) {
    t.table_assert([
        [ 'o',                          'exp' ],
        [ {},                           0 ],
        [ {a:1,b:2},                    2 ],
        [ [1,2,3],                      3 ],
    ], obj.len)
})

test('map', function (t) {
    t.table_assert([
        [ 'o',                      'fn',                             'opt',                'exp' ],
        [ {},                       null,                             null,     {} ],
        [ {1:3, 2:7, 3:13},         function(k,v,i) {return k*v+i},   {map_mode:'vals'},    {1:3,2:15,3:41} ],
        [ {},                       null,                             {map_mode:'keys'},    {} ],
        [ {1:3, 2:7, 3:13},         function(k,v,i) {return k*v+i},   {map_mode:'keys'},    {3:3,15:7,41:13} ],
    ], obj.map)
})

test('mapw', function (t) {
    var kvi = function(k,v,i) {return k*v+i}
    var vi3 = function(k,v,i) {return v*(i+3)}
    t.table_assert([
        [ 'o',                          'fn',   'opt',                      'exp' ],
        [ {},                           null,   null,                       [false, {}] ],
        [ {1:3,2:7,3:13},               kvi,    {map_mode:'vals-in-situ'},  [true,{1:3,2:15,3:41}] ],
        [ {1:3,2:7,3:13},               kvi,    {map_mode:'vals'},          [false,{1:3,2:15,3:41}] ],
        [ {a:3,b:7,c:[5,9]},            vi3,    {map_mode:'vals'},          [false,{a:9,b:28,c:[15,36]}] ],
        [ {a:3,b:7,c:[{d:[1,3,5]},9]},  vi3,    {map_mode:'vals'},          [false,{a:9,b:28,c:[{d:[3,12,25]},36]}] ],
        [ [3,7,[{d:[1,3,5]},9]],        vi3,    {map_mode:'vals'},          [false,[9,28,[{d:[3,12,25]},36]]] ],
        [ [3,7,[{d:[1,3,5]},9]],        vi3,    {map_mode:'vals-in-situ'},  [true,[9,28,[{d:[3,12,25]},36]]] ],
    ], function(o, fn, opt) { var n = obj.mapw(o, fn, opt); return [n === o, n] })
})

test('oo_put', function (t) {
    t.table_assert([
        [ 'o',              'k1',   'k2',   'v',    'exp' ],
        [ {},               'a',    'b',    7,      [undefined, {a:{b:7}}] ],
        [ {a:null},         'a',    'b',    7,      [undefined, {a:{b:7}}] ],
        [ {a:{b:7}},        'a',    'b',    8,      [7, {a:{b:8}}] ],
        [ {a:{b:7}},        'x',    'b',    2,      [undefined, {a:{b:7},x:{b:2}}] ],

    ], function (o, k1, k2, v) { var prev = obj.oo_put(o, k1, k2, v); return [prev, o] } )
})

test('oo_get', function (t) {
    t.table_assert([
        [ 'o',              'k1',   'k2',  'exp' ],
        [ {},               'a',    'b',   undefined ],
        [ {a:8},            'a',    'b',   undefined ],
        [ {a:{b:null}},     'a',    'b',   null ],
        [ {a:{b:4}},        'a',    'b',   4 ],

    ], obj.oo_get )
})

test('oa_push', function (t) {
    t.table_assert([
        [ 'o',              'k',    'v',    'exp' ],
        [ {},               'a',    null,   {a:[null]} ],
        [ {a:[]},           'a',    7,      {a:[7]} ],
        [ {a:[3]},          'a',    7,      {a:[3,7]} ],
        [ {a:[3],b:[2]},    'a',    7,      {a:[3,7],b:[2]} ],

    ], function (o, k, v) { obj.oa_push(o,k,v); return o } )
})

