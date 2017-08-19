var qbobj = require('..')
var TCODE = qbobj.TCODE



var o = {a:1,b:{x:7,y:8},c:2}
var n = qbobj.map(o, function (k, v) { return v + 1 })
console.log(n)
console.log(n === o)