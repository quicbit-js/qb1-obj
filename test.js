var test = require('test-kit').tape()
var obj = require('.')
var TCODE = obj.tcode

function path_and_val (carry, k, i, tcode, v, path) {
    var vstr
    switch (tcode) {
        case TCODE.ARR: vstr = '[' + v.length + ']'; break
        case TCODE.OBJ: vstr = '{' + Object.keys(v).filter(function (k){ return typeof(obj[k] !== 'function')}).length + '}'; break
        case TCODE.ERR: vstr = '!' + v.msg + ':' + v.val; break
        case TCODE.BOO: vstr = v === true ? 'T' : 'F'; break
        case TCODE.NUM: case TCODE.STR: vstr = String(v); break
        case TCODE.NUL: vstr = 'N'; break
        default:
            throw Error('unexpected type code: ' + tcode)
    }
    var last = path[path.length - 1]
    var pstr = path.join('/')
    if (k === null) {
        last === i || err('path does not match index: ' + i + ' and ' + pstr)
    } else {
        last === k || err('path does not match key: ' + k + ' and ' + pstr)
        pstr += '.' + i     // add index
    }
    carry.push(pstr + ':' + vstr)
    return carry
}

test('walk', function (t) {
    var fn = function phooey() {}
    t.table_assert([
        [ 'o',                              'init',   'opt',   'exp' ],
        [ {},                               [],       null,     [] ],
        [ {a:1},                            [],       null,     [ 'a.0:1' ] ],
        [ {a:1, b:'foo', c:true, d:null},   [],       null,     [ 'a.0:1', 'b.1:foo', 'c.2:T', 'd.3:N' ] ],
        [ {a:1, b:undefined},               [],       null,     [ 'a.0:1', 'b.1:N' ] ],
        [ {a:{},b:[],c:3},                  [],       null,     [ 'a.0:{0}', 'b.1:[0]', 'c.2:3' ] ],
        [ {a:{x:1,y:2}},                    [],       null,     [ 'a.0:{2}', 'a/x.0:1', 'a/y.1:2' ] ],
        [ {a:{x:1,y:2}, b:{z:3}},           [],       null,     [ 'a.0:{2}', 'a/x.0:1', 'a/y.1:2', 'b.1:{1}', 'b/z.0:3' ] ],
        [ {a:{x:1,y:2},b:[7,8,9]},          [],       null,     [ 'a.0:{2}', 'a/x.0:1', 'a/y.1:2', 'b.1:[3]', 'b/0:7', 'b/1:8', 'b/2:9' ] ],
        [ {a:{x:fn,y:2},b:[7,8,9]},         [],       null,     [ 'a.0:{2}', 'a/y.0:2', 'b.1:[3]', 'b/0:7', 'b/1:8', 'b/2:9' ] ],  // ignore object functions
        [ [],                               [],       null,     [] ],
        [ [7,8,9],                          [],       null,     [ '0:7', '1:8', '2:9' ] ],
    ], function (o, init, opt) { return obj.walk(o, path_and_val, init, opt)} )
})

test('walk errors', function (t) {
    var fn = function chewy() {}
    t.table_assert([
        [ 'o',                              'init',   'opt',   'exp' ],
        [ [7,fn,9],                          [],       null,    [ '0:7', '1:!unexpected value:function chewy() {}', '2:9' ] ],
    ], function (o, init, opt) { return obj.walk(o, path_and_val, [], opt)} )
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

// var v = {'a':{'len':30, 'vals':[null,4,5,'six']}, 'qb': "certainly"}
