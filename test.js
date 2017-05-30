var test = require('test-kit').tape()
var obj = require('.')

test('create', function (t) {
    t.table_assert([
        [ 'args',                               'exp' ],
        [ [[['a',1],['b',2]]],                  '{a:1,b:2}' ],
        [ [['b','a'],{a:1,b:2}],                '{b:2,a:1}' ],
        [ [['a','b'],[null,'N']],               "{a:N,b:'N'}" ],
    ], function (args) {
        return obj.apply(null, args).toString({name:'short'})
    })
})

test('put, remove, length', function (t) {
    var o = obj()
    t.equal(o.length, 0)
    o.put('x', 99)
    o.put('y', null)
    o.put('z', 101)
    t.equal(o.length, 3)
    t.equal(o.toString(), '{x:99,y:nul,z:101}')
    t.equal(o.at(0), o.get('x'))
    t.equal(o.at(1), o.get('y'))
    t.equal(o.at(2), o.get('z'))
    t.equal(o.put('y', 100), null)
    t.equal(o.at(1), 100)
    t.equal(o.put('y', -1), 100)
    t.equal(o.toString(), '{x:99,y:-1,z:101}')
    t.equal(o.put('y',undefined), -1)
    t.equal(o.toString(), '{x:99,z:101}')
    t.equal(o.remove('x'), 99)
    t.equal(o.toString(), '{z:101}')
    t.equal(o.remove('x', null))
    t.end()
})

test('errors', function (t) {
    t.table_assert([
        [ 'args',                                   'exp' ],
        [ [['a','b'],[1]],                          /different length/ ],
        [ [['a','b'],[1,undefined]],                /undefined values/ ],
        [ [5],                                      /illegal argument/ ],
        [ [[],[],[]],                               /too many arguments/ ],
    ], function (args) {
        return obj.apply(null, args)
    }, {assert:'throws'})

})
// var v = {'a':{'len':30, 'vals':[null,4,5,'six']}, 'qb': "certainly"}
