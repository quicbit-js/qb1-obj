# qb1-obj

**version 2.0 makes a breaking change to handling ordered objects**  Since only 
IE has object order issues (and only when deleting and re-inserting) qb1 will use normal
javascript objects.  So this module has been reduced to a few methods for normal objects.

## Install

    npm install qb1-obj
    
## API

### obj (obj, keys) 

Create an object from the given object's own properties.  If an array of keys is given, then
only those keys are copied to the object.  Undefined values are not copied.

    obj({ a: 1, b: 2, c: undefined })
    
    > { a: 1, b: 2 }

    obj( {a:1, b:2, c:3}, ['b','c'] )
    
    > {b:2, c:3}
    

#### obj( keys, vals )

create an object from an array of keys and array of values.  If the arrays are different lengths,
the shortest subset is used.  

    obj( ['a', 'b', 'c'], [1, 2, 3] )
    
    > {a: 1, b: 2, c: 3 }
    
    obj( ['a', 'b'], [1, 2, 3] )
    
    > {a: 1, b: 2 }

    obj( ['a', 'b', 'c'], [1, 2] )
    
    > {a: 1, b: 2 }

### obj.put (obj, key, val)

Put the given *defined value* into the object.  If the value is undefined **remove it instead**.  

Using this method can help keep objects clean from undefined values.

### obj.keys (obj)

Return the object's own keys.  Same as Object.keys()

### obj.vals (obj) 

Return the object's own values in the same order as Object.keys()


### obj.len (obj) 

Return the total of the object's own values.  Same as Object.keys(obj).length