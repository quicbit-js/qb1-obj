// thies was a concise way of creating clean objects... not used at the moment, so in the museum.

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


// create a 'clean' object (with no undefined values) from an object or from a selection of an object-or-array
function obj(a0, a1) {
    var ret = {}
    if (a0) {
        var i = 0
        if (Array.isArray(a0)) {
            // create from an array-of-keys and array-of-values:  obj(['a', 'b', ...], [1, 2, ...])
            Array.isArray(a1) || err('illegal argument: ' + a1)
            var len = Math.min(a0.length, a1.length)
            while(i < len) { put(ret, a0[i], a1[i]); i++ }
        } else {
            // create from object and it's keys or given keys  obj({ a: 1, b: 2, ...}, [ 'a', 'b', ... ])
            var keys = a1 || Object.keys(a0)
            while(i < keys.length) { put(ret, keys[i], a0[keys[i]]); i++ }
        }
    }
    return ret
}
function put(o, k, v) {
    if (v === undefined) { delete o[k] }
    else { o[k] = v }
    return o
}
