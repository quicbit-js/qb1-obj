var test = require('test-kit').tape()
var str = require('qb1-serial-plain')
var obj = require('.')

test('create', function (t) {
    t.table_assert([
        [ 'arg1',                   'arg2',                'exp' ],
        [ null,                     null,                  '{}' ],
        [ {a:3,b:4,c:null},         null,                  '{a:3,b:4,c:N}' ],
        [ {a:1,b:2,c:3},            ['c','b','a'],         '{c:3,b:2,a:1}' ],
        [ {a:1,b:2,c:3},            ['c','x','a','b'],     '{c:3,a:1,b:2}' ],          // undefined is ignored (x)
        [ {a:1,b:2,c:3},            ['c','b'],             '{c:3,b:2}' ],
        [ ['a','b','c'],            [1,2,3],               '{a:1,b:2,c:3}' ],
        [ ['a','c'],                [1,2,3],               '{a:1,c:2}' ],
        [ ['a','c','c','c'],        [1,2,3],               '{a:1,c:3}' ],              // key #3 has precedence.  key #4 ignored.
        [ ['a','b'],                [null,'N'],            "{a:N,b:'N'}" ],
    ], function (arg1, arg2) {
        return str(obj(arg1, arg2), {name: 'shortname'})
    })
})

test('put', function (t) {
    t.table_assert([
        [ 'o',                   'k',        'v',                'exp' ],
        [ {},                    'a',        7,                  '{a:7}' ],
        [ {a:undefined},         'a',        undefined,          '{}' ],
        [ {a:77,b:undefined},    'a',        undefined,          '{}']
    ], function (o, k, v) {
        return str(obj.put(obj(o), k, v))
    })
})

test('keys', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                          [] ],
        [ {a:undefined},               [] ],
        [ {a:77,b:undefined},          ['a'] ],
    ], function (o) {
        return obj.keys(obj(o))
    })
})

test('vals', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                          [] ],
        [ {a:undefined},               [] ],
        [ {a:77,b:undefined},          [77] ],
    ], function (o) {
        return obj.vals(obj(o))
    })
})

test('length', function (t) {
    t.table_assert([
        [ 'o',                      'exp' ],
        [ {},                          0 ],
        [ {a:undefined},               0 ],
        [ {a:77,b:undefined},          1 ],
    ], function (o) {
            return obj.len(obj(o))
    })
})

test('errors', function (t) {
    t.table_assert([
        [ 'args',                                   'exp' ],
        [ [ [], 5 ],                                /illegal argument/ ],
    ], function (args) {
        return obj.apply(null, args)
    }, {assert:'throws'})

})
// var v = {'a':{'len':30, 'vals':[null,4,5,'six']}, 'qb': "certainly"}
