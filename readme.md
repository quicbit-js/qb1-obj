# qb1-obj

An object (a.k.a map or dictionary) that keeps string keys in insertion order, but also
may be rearranged into any order desired.

A mind-bendingly simple implementation.

qb1-obj gives direct access to keys (on purpose) - see [comment](#direct-access-to-keys-is-that-safe) below

## Install

    npm install qb1-obj
    
## Usage

    var obj = require('qb1-obj')
    
    var o = obj()
    o.put('a', 99)
    o.put('b', "hi")
    o.put('key c',[1,2,null])

    o.length
    
    > 3
    
    o.keys                  // note - returns the actual keys array, not a copy.
    
    ['a','b','a c']
    
    o.get('a')

    > 99
    
    o.at(1)     // fetch by index
    
    > 'hi'
    
obj.str() is just qb shorthand for 'toString()'.  Output is in qb-plain form.
 
    [ o.str(), o.toString() ]
    
    > [ {a:99,b:'hi','a c':[1,2,nul]}
        {a:99,b:'hi','a c':[1,2,nul]} ]
    
like other qb1 objects, obj supports the json() method:

    o.json()
        
    > {"a":99,b:"hi","a c":[1,2,null]}
    
items can be deleted by using remove() or by putting undefined values:

    o.remove('a c')
    o.keys
    
    > ['a','b']
    
    o.put('a', undefined)
    
    o.keys
    
    > ['b']
    
note that put(k,null) is not like put(k,undefined).  it will put a null value:
     
    o.put('a',null)
     
    o.str()
     
    > {b:'hi',a:nul}
     
keys are actual keys used for order, so if we sort them, we can actually change the serialization order
of the object values.

    o.keys.sort()
    o.str()
    
    > {a:nul,b:'hi'}

## Construction

qb-obj has a few convenient constructors.  The following are all equivalent:
    
    var obj = require('qb-obj')

alternating key, value pairs (single array):

    var o = obj(['a', 1, 'b', 2, 'c', 3])
    
    > {a:1,b:2,c:3}

array of keys and array of values:

    obj(['a','b','c'], [1,2,3]).str()
    
    > {a:1,b:2,c:3}
    
array of keys and object of values:

    obj(['a','b','c'], {a:1,b:2,c:3}).str()

    > {a:1,b:2,c:3}
    
In the last two cases, the keys are used to select values from the values.  For array/array, the 
positions of the keys select values and missing values are ignored (i.e. if there are more 
keys than values).  For array/object, the object is checked for values and again, missing values
are ignored:

    obj(['a','b','c'], [1,2]).str()
    
    > {a:1,b:2}
    
    obj(['a','b'], [1,2,3,4,5]).str()
    
    > {a:1,b:2}

    obj(['a','b','c'], {c:3, z:200, b:2}).str()
    
    > {b:2,c:3}

## Direct access to Keys?  Is that safe?

**Wait!** Isn't that key access extremely dangerous?  What about encapsulation?  Shouldn't we make defensive copies of the
keys instead of just handing them back? 

Well, yes, we should do those things if we were building that sort of rich and 
safe (and complex, and slow-for-big-objects) library, but we take another
approach to reducing unwanted surprises in code... we make things simple and 
transparent enough that they are understood.  qb1-obj
is so simple that you can go ahead and sort the keys to your purposes, or 
insert values in the keys if you understand the contract to keep m.keys in sync with the keys of m.obj.   
That's it.  That's the whole contract.
