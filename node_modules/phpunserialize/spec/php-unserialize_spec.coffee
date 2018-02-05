describe 'Php-serialize Suite', ->
  describe 'Primative values', ->
    it "can parse a string", ->
      expect(phpUnserialize('s:3:"foo";')).toBe('foo')

    it "can parse an integer", ->
      expect(phpUnserialize('i:1337;')).toBe(1337)

    it "can parse a float", ->
      expect(phpUnserialize('d:13.37;')).toBe(13.37)

    it "can parse a boolean", ->
      expect(phpUnserialize('b:1;')).toBeTruthy()
      expect(phpUnserialize('b:0;')).toBeFalsy()

    it "can parse a null", ->
      expect(phpUnserialize('N;')).toBeNull()

    it "can parse an array", ->
      expect(phpUnserialize('a:2:{i:0;s:5:"hello";i:1;s:5:"world";}')).
        toEqual(['hello', 'world'])

    it "can parse a dictionary", ->
      expect(phpUnserialize('a:2:{s:5:"hello";i:0;s:5:"world";i:1;}')).
        toEqual({'hello':0, 'world':1})

    it "can parse a reference", ->
      expect(phpUnserialize('a:2:{s:5:"hello";i:42;s:5:"world";R:2;}')).
        toEqual({'hello':42, 'world':42})

  describe 'Object values', ->
    it "can parse an empty object", ->
      expect(phpUnserialize('O:5:"blank":0:{}')).toEqual({})

    it "can parse public members", ->
      expect(phpUnserialize(
        'O:3:"Foo":2:{s:5:"hello";i:0;s:5:"world";i:1;};'
      )).toEqual({'hello':0, 'world':1})

    it "can parse protected members", ->
      expect(phpUnserialize(
        'O:3:"Foo":2:{s:8:"\u0000*\u0000hello";i:0;s:8:"\u0000*\u0000world";i:1;};'
      )).toEqual({'hello':0, 'world':1})

    it "can parse private members", ->
      expect(phpUnserialize(
        'O:3:"Foo":2:{s:10:"\u0000Foo\u0000hello";i:0;s:10:"\u0000Foo\u0000world";i:1;};'
      )).toEqual({'hello':0, 'world':1})

    it "can parse a circular reference", ->
      expected = {}
      expected.self = expected

      expect(phpUnserialize(
        "O:3:\"Bar\":1:{s:4:\"self\";r:1;}"
      )).toEqual(expected)

    it "can parse a complex object", ->
      expected = {
        bar : 1,
        baz : 2,
        xyzzy : [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
      }
      expected.self = expected

      expect(phpUnserialize(
        "O:3:\"Foo\":4:{s:3:\"bar\";i:1;s:6:\"\u0000*\u0000baz\";i:2;s:10:\"\u0000Foo\u0000xyzzy\";a:9:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:4;i:4;i:5;i:5;i:6;i:6;i:7;i:7;i:8;i:8;i:9;}s:7:\"\u0000*\u0000self\";r:1;}"
      )).toEqual(expected)

    it "can parse inherited private members", ->
      expected = {
        bar : 1,
        baz : 2,
        'Foo::xyzzy' : [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
        lorem : 42,
        ipsum : 37,
        dolor : 13,
      }
      expected.self = expected

      expect(phpUnserialize(
        "O:5:\"Child\":7:{s:5:\"lorem\";i:42;s:8:\"\u0000*\u0000ipsum\";i:37;s:12:\"\u0000Child\u0000dolor\";i:13;s:3:\"bar\";i:1;s:6:\"\u0000*\u0000baz\";i:2;s:10:\"\u0000Foo\u0000xyzzy\";a:9:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:4;i:4;i:5;i:5;i:6;i:6;i:7;i:7;i:8;i:8;i:9;}s:7:\"\u0000*\u0000self\";r:1;}"
      )).toEqual(expected)

    it "can parse an ugly mess", ->
      expected = {
        obj1 : {
          obj2 : {
            obj3 : {
              arr : { 0 : 1, 1 : 2, 2 : 3 }
            }
          }
        }
      }
      expected.obj1.obj2.obj3.arr['ref1'] = expected.obj1.obj2
      expected.obj1.obj2.obj3.arr['ref2'] = expected.obj1.obj2.obj3.arr

      expect(phpUnserialize(
        "O:8:\"stdClass\":1:{s:4:\"obj1\";O:8:\"stdClass\":1:{s:4:\"obj2\";O:8:\"stdClass\":1:{s:4:\"obj3\";O:8:\"stdClass\":1:{s:3:\"arr\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;s:4:\"ref1\";r:3;s:4:\"ref2\";R:5;}}}}}"
      )).toEqual(expected)

    it "can parse more ugly references", ->
      expected = {
        int : 42,
        str : 'lorem',
        nul : null,
        obj : {
          lorem : 10,
          ipsum : {},
        },
      }
      expected.obj.ipsumLink = expected.obj.ipsum
      expected.obj.ipsumRef  = expected.obj.ipsum
      expected.intRef  = expected.int
      expected.strRef  = expected.str
      expected.nulRef  = expected.nul
      expected.objLink = expected.obj
      expected.objRef  = expected.obj

      expect(phpUnserialize(
        "a:9:{s:3:\"int\";i:42;s:3:\"str\";s:5:\"lorem\";s:3:\"nul\";N;s:3:\"obj\";O:8:\"stdClass\":4:{s:5:\"lorem\";i:10;s:5:\"ipsum\";O:8:\"stdClass\":0:{}s:9:\"ipsumLink\";r:7;s:8:\"ipsumRef\";R:7;}s:6:\"intRef\";R:2;s:6:\"strRef\";R:3;s:6:\"nulRef\";R:4;s:7:\"objLink\";r:5;s:6:\"objRef\";R:5;}"
      )).toEqual(expected)

  describe 'Custom serializers', ->
    it "can parse a SplDoublyLinkedList", ->
      expected = {
        '__PHP_Incomplete_Class_Name': 'SplDoublyLinkedList',
        'serialized': 'i:0;'
      }
      expect(
        phpUnserialize("C:19:\"SplDoublyLinkedList\":4:{i:0;}")
      ).toEqual(expected)

    it "can parse a SplObjectStorage", ->
      expected = {
        '__PHP_Incomplete_Class_Name': 'SplObjectStorage',
        'serialized': 'x:i:2;O:8:"stdClass":1:{s:1:"a";O:8:"stdClass":0:{}},i:1;;r:4;,i:2;;m:a:0:{}'
      }
      expect(
        phpUnserialize("C:16:\"SplObjectStorage\":76:{x:i:2;O:8:\"stdClass\":1:{s:1:\"a\";O:8:\"stdClass\":0:{}},i:1;;r:4;,i:2;;m:a:0:{}}")
      ).toEqual(expected)
