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
        [ {},                               ['first'],  {key_select: ks(/a/,0)},     [ 'first', 'R:{0}' ] ],
        [ {a:1},                            ['first'],  {key_select: ks(/a/,0)},     [ 'first', 'R:{1}', 'a.0:1' ] ],
        [ {a:1, b:'foo', c:true, d:null},   [],         {key_select: ks(/b/,1)},     [ 'R:{4}', 'b.1:foo' ] ],
        [ {a:{x:1,y:2}},                    [],         {key_select: ks(/x/,2)},     [ 'R:{1}', 'a.0:{2}', 'a/x.0:1' ] ],
        [ {a:{x:1,y:2}},                    [],         {key_select: ks(/y/,2)},     [ 'R:{1}', 'a.0:{2}', 'a/y.1:2' ] ],
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
    ], function (o, cb, init, opt) { return obj.walk(o, cb, [], opt)} )
})


test('keys', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                          [] ],
        [ {a:1,b:2},               ['a','b'] ],
    ], function (o) {
        return obj.keys(o)
    })
})

test('vals', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                          [] ],
        [ {a:1,b:2,c:null},               [1,2,null] ],
    ], function (o) {
        return obj.vals(o)
    })
})

test('length', function (t) {
    t.table_assert([
        [ 'o',                          'exp' ],
        [ {},                           0 ],
        [ {a:1,b:2},                2 ],
    ], function (o) {
        return obj.len(o)
    })
})

test('map', function (t) {
    t.table_assert([
        [ 'o',                      'fn',                                   'exp' ],
        [ {},                       null,                                   {} ],
        [ {1:3, 2:7, 3:13},         function(k,v,i){return k*v+i},          {1:3,2:15,3:41} ],
    ], function (o, fn) {
        return obj.map(o, fn)
    })
})

test('mapk', function (t) {
    t.table_assert([
        [ 'o',                      'fn',                                   'exp' ],
        [ {},                       null,                                   {} ],
        [ {1:3, 2:7, 3:13},         function(k,v,i){return k*v+i},          {3:3,15:7,41:13} ],
    ], function (o, fn) {
        return obj.mapk(o, fn)
    })
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
        [ {a:{b:null}},            'a',    'b',   null ],
        [ {a:{b:4}},            'a',    'b',   4 ],

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

