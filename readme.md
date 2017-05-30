# qb1-obj

An object (a.k.a map or dictionary) that keeps string keys in insertion order, but also
may be rearranged into any order desired.

A mind-bendingly simple implementation.

(qb1-obj purposefully gives direct access to keys - see [comment](#is_this_safe?) below)

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


## Is this safe?

**Wait!** Isn't that extremely dangerous?  What about encapsulation?  Shouldn't we make defensive copies of the
keys instead of just handing them back? 

Well, yes.  If we were building that sort of rich and safe (and complex, and slow-for-big-objects) 
library, but we take another
approach to reducing unwanted surprises in code... by making things simple and 
transparent enough that they are understood.  qb1-obj
is so simple that you can go ahead and sort the keys to your purposes, or 
insert values in the keys if you understand the contract to keep m.keys in sync with the keys of m.obj.   
That's it.  That's the whole contract.
