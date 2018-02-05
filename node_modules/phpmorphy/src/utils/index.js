import _ from 'lodash';
import util from 'util';
// import jschardet from 'jschardet';
// import encoding from 'encoding';
import php from 'phpjs';
import phpunserialize from 'phpunserialize';

/**
 * @param {function} cb
 */
function onShutdown (cb) {
  onShutdown.handlers.push(cb);
}
onShutdown.handlers = [];

const logger = {};
logger.log = console.log.bind(console);
logger.trace = console.trace.bind(console);
logger.info = console.info.bind(console);
logger.warn = console.warn.bind(console);
logger.error = console.error.bind(console);

/**
 * @param any
 * @returns {Array}
 */
function castArray (any) {
  any = (!_.isUndefined(any) && !_.isNull(any)) ? any : [];
  any = _.isArray(any) ? any : [any];
  
  return any;
}

/**
 * @param object
 * @param {{}} [opts]
 * @returns {string}
 */
function inspect (object, opts = {
  depth: null,
  colors: true,
  maxArrayLength: 1000
}) {
  return util.inspect(object, opts);
}

// /**
//  * @param {String|Buffer} text
//  * @returns {String}
//  */
// function detectCharset (text) {
//   let buffer;
//   let retVal = null;
//
//   if (_.isArray(text)) {
//     return _.map(text, item => detectCharset(item));
//   } else
//   if (_.isString(text)) {
//     buffer = Buffer.from(text, 'binary');
//   } else
//   if (!Buffer.isBuffer(text)) {
//     buffer = null;
//   }
//
//   if (buffer) {
//     retVal = jschardet.detect(buffer).encoding;
//     retVal = (retVal) ? retVal.toLowerCase() : null;
//   }
//
//   return retVal;
// }

// /**
//  * @param {String|Buffer} text
//  * @param {String} to
//  * @param {String} [from='UTF-8']
//  * @returns {*}
//  */
// function convert (text, to, from = 'UTF-8') {
//   let args = _.toArray(arguments);
//   let buffer = null;
//   let retVal = text;
//
//   if (_.isArray(text)) {
//     return _.map(text, (item) => convert.apply(convert, [item].concat(args.slice(1))));
//   } else
//   if (_.isString(text)) {
//     buffer = Buffer.from(text, 'binary');
//   } else
//   if (!Buffer.isBuffer(text)) {
//     buffer = null;
//   }
//
//   if (buffer) {
//     from = (!from) ? detectCharset(buffer) : from;
//
//     if (from) {
//       retVal = encoding.convert(buffer, to, from);
//     }
//
//     return retVal.toString();
//   }
//
//   return retVal;
// }

//php.ini_set('unicode.semantics', 'on');
php.ini_set('phpjs.objectsAsArrays', false);

php.unpack = function unpack (format, buffer) {
  /**
   * Параметр format задается в виде строки и состоит из кодов формата и
   * опционального аргумента повторения. Аргумент может быть целочисленным,
   * либо * для повторения до конца введенных данных. Для a, A, h, H число
   * повторений определяет то, сколько символов взято от одного аргумента
   * данных, для @ - это абсолютная позиция для размещения следующих данных,
   * для всего остального число повторений определяет как много аргументов
   * данных было обработано и упаковано в результирующую бинарную строку.
   */
  const codes  = {
    'a': 'Строка (string) с NULL-заполнением',
    'A': 'Строка (string) со SPACE-заполнением',
    'h': 'Hex-строка (Hex string), с нижнего разряда',
    'H': 'Hex-строка (Hex string), с верхнего разряда',
    'c': 'знаковый символ (char)',
    'C': 'беззнаковый символ (char)',
    's': 'знаковый short (всегда 16 бит, машинный байтовый порядок)',
    'S': 'беззнаковый short (всегда 16 бит, машинный байтовый порядок)',
    'n': 'беззнаковый short (всегда 16 бит, порядок big endian)',
    'v': 'беззнаковый short (всегда 16 бит, порядок little endian)',
    'i': 'знаковый integer (машинно-зависимый размер и порядок)',
    'I': 'беззнаковый integer (машинно-зависимый размер и порядок)',
    'l': 'знаковый long (всегда 32 бит, машинный порядок)',
    'L': 'беззнаковый long (всегда 32 бит, машинный порядок)',
    'N': 'беззнаковый long (всегда 32 бит, порядок big endian)',
    'V': 'беззнаковый long (всегда 32 бит, порядок little endian)',
    'f': 'float (машинно-зависимые размер и прдставление)',
    'd': 'double (машинно-зависимые размер и прдставление)',
    'x': 'NUL байт',
    'X': 'Резервирование одного байта',
    '@': 'NUL-заполнение до абсолютной позиции'
  };
  const parts  = format.split('/');
  let offset = 0, mod, lenStr, len;
  if (parts.length > 1) {
    let result = {};
    for (let idx = 0; idx < parts.length; idx++) {
      mod = parts[idx][0];
      if (mod in codes) {
        switch (mod) {
          case 'V':
            result[parts[idx].slice(1)] = buffer.readUInt32LE(offset);
            offset += 4;
            break;
          case 'v':
            result[parts[idx].slice(1)] = buffer.readUInt16LE(offset);
            offset += 2;
            break;
          case 'a':
            lenStr = /\d+/g.exec(parts[idx])[0];
            len = parseInt(lenStr, 10);
            result[parts[idx].slice(1 + lenStr.length)] = buffer.toString('ascii', offset, len);
            offset += len;
            break;
          default:
            util.puts(parts[idx] + ' ' + offset);
            break;
        }
      }
    }
    
    return result;
  } else {
    let result = [];
    do {
      let obj = {};
      mod = format[0];
      if (mod in codes) {
        switch (mod) {
          case 'V':
            obj = buffer.readUInt32LE(offset);
            offset += 4;
            break;
          case 'v':
            obj = buffer.readUInt16LE(offset);
            offset += 2;
            break;
          case 'a':
            lenStr = /\d+/g.exec(format)[0];
            len = parseInt(lenStr, 10);
            obj = buffer.toString('ascii', offset, len);
            offset += len;
            break;
          default:
            util.puts(format);
            break;
        }
      }
      result.push(obj);
    } while (offset < buffer.length);
    
    return result;
  }
};

php.unserialize = phpunserialize;

php.ord = function ord (str, idx) {
  if (!Buffer.isBuffer(str)) {
    str = Buffer.from(str);
  }
  
  idx = (!_.isUndefined(idx) && _.isNumber(idx) && idx < str.length) ? idx : 0;
  
  return str[idx];
};

php._substr = php.substr; // safe
/**
 * @param {String|Buffer} str
 * @param {Number} start
 * @param {Number} [len]
 * @returns {string|Buffer|boolean}
 */
php.substr = function php$substr (str, start, len) {
  let end;
  
  if (Buffer.isBuffer(str)) {
    end = str.length;
    start = (start < 0) ? start + end : start;
    end = typeof len === 'undefined' ? end : (len < 0 ? len + end : len + start);
    
    return (start >= str.length || start < 0 || start > end) ? false : str.slice(start, end);
  }
  
  return php._substr.apply(php._substr, arguments);
};

// /**
//  * @param raw
//  * @returns {String|null}
//  */
// function detectEncoding (raw) {
//   let buffer, result;
//   if (Buffer.isBuffer(raw)) {
//     buffer = raw;
//   } else {
//     raw = (_.isString(raw)) ? raw : raw +'';
//     buffer = Buffer.from(raw, 'binary');
//   }
//
//   result = jschardet.detect(buffer);
//
//   return (result.encoding) ? result.encoding : null;
// }

/**
 * @param any
 * @returns {boolean}
 */
function isStringifyedNumber (any) {
  let int = _.toInteger(any);
  
  if (int === 0 && any !== '0') {
    return false;
  }
  
  return any == int;
}
/**
 * @param something
 * @param [encoding='utf-8']
 * @returns {Buffer|*}
 */
function toBuffer (something, encoding = 'utf-8') {
  let retVal = something;
  
  if (_.isArray(something)) {
    retVal = _.map(something, item => toBuffer(item, encoding));
  } else
  if (Buffer.isBuffer(something)) {
    retVal = something;
  } else
  if (_.isString(something)) {
    retVal = Buffer.from(something, encoding);
  } else
  if (_.isPlainObject(something)) {
    let obj = _.clone(something);
    _.forEach(obj, (val, key) => obj[key] = toBuffer(val, encoding));
    
    retVal = obj;
  }
  
  return retVal;
}

/**
 * @param something
 * @param {String} [encoding='utf8']
 * @returns {string|*}
 */
function buffer2str (something, encoding = 'utf8') {
  return (Buffer.isBuffer(something)) ? something.toString(encoding) : something;
}

/**
 * @param something
 * @returns {Array}
 */
function str2ascii (something) {
  let retVal = [];
  let buffer = (!Buffer.isBuffer(something)) ? Buffer.from(something, 'binary') : something;
  
  for (let i = 0, length = buffer.length; i < length; i++) {
    retVal.push(buffer[i]);
  }
  
  return retVal;
}

/**
 * @param something
 * @returns {String}
 */
function str2hex (something) {
  let retVal = (!Buffer.isBuffer(something)) ? Buffer.from(something, 'binary') : something;
  
  return retVal.toString('hex');
}

function clone (instance) {
  return _.merge({}, Object.create(Object.getPrototypeOf(instance)), instance);
}

export {
  onShutdown,
  castArray,
  logger,
  inspect,
  // detectCharset,
  // convert,
  php,
  // detectEncoding,
  isStringifyedNumber,
  toBuffer,
  buffer2str,
  str2ascii,
  str2hex,
  clone
};
