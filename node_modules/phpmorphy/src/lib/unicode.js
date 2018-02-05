/**
 * This file is part of phpMorphy library
 *
 * Copyright c 2007-2008 Kamaev Vladimir <heromantor@users.sourceforge.net>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the
 * Free Software Foundation, Inc., 59 Temple Place - Suite 330,
 * Boston, MA 02111-1307, USA.
 */

import _ from 'lodash';
import { php, toBuffer, buffer2str } from '../utils';

const Morphy_UnicodeHelper_cache = {};
const Morphy_UnicodeHelper_unicodeHelpers = {};

class Morphy_UnicodeHelper {
  
  static get cache () {
    return Morphy_UnicodeHelper_cache;
  }
  
  static get unicodeHelpers () {
    return Morphy_UnicodeHelper_unicodeHelpers;
  }
  
  static create (encoding) {
    const { cache, doCreate } = Morphy_UnicodeHelper;

    encoding = encoding.toLowerCase();
    if (php.isset(cache[encoding])) {
      return cache[encoding];
    }
    
    const result = doCreate(encoding);
    cache[encoding] = result;
    
    return result;
  }
  
  static doCreate (encoding) {
    let matches = encoding.match(/^(utf|ucs)(-)?([0-9]+)(-)?(le|be)?$/);
    if (matches) {
      let tmp;
      let encoding_name;
      let className;

      let utf_type = matches[1];
      let utf_base = parseInt(matches[3], 10);
      let endiannes = '';
      
      switch (utf_type) {
        case 'utf':
          if ([8, 16, 32].indexOf(utf_base) < 0) {
          // if (!php.in_array(utf_base, [8, 16, 32])) {
            throw new Error('Invalid utf base');
          }
          
          break;
        case 'ucs':
          if ([2, 4].indexOf(utf_base) < 0) {
          // if (!php.in_array(utf_base, [2, 4])) {
            throw new Error('Invalid ucs base');
          }
          
          break;
        default:
          throw new Error('Internal error');
      }
      
      if (utf_base > 8 || 'ucs' === utf_type) {
        if (php.isset(matches[5])) {
          endiannes = matches[5] == 'be' ? 'be' : 'le';
        } else {
          tmp = php.pack('L', 1);
          endiannes = php.ord(tmp) == 0 ? 'be' : 'le';
        }
      }
      
      
      if (utf_type == 'ucs' || utf_base > 8) {
        encoding_name = utf_type + '-' + utf_base + endiannes;
      } else {
        encoding_name = utf_type + '-' + utf_base;
      }
      
      className = `Morphy_UnicodeHelper_${ php.str_replace('-', '_', encoding_name) }`;
      
      return new Morphy_UnicodeHelper.unicodeHelpers[className](encoding_name);
    } else {
      return new Morphy_UnicodeHelper_singlebyte(encoding);
    }
  }

  firstCharSize (str) {}

  strrev (str) {}

  strlen (str) {}

  fixTrailing (str) {}

}

class Morphy_UnicodeHelper_Base extends Morphy_UnicodeHelper {

  constructor (encoding) {
    super(...arguments);
    this.encoding = encoding;
  }

  strlen (str) {
    return buffer2str(str).length;
  }

  php_strlen (str) {
    return buffer2str(str).length;
  }

}

class Morphy_UnicodeHelper_MultiByteFixed extends Morphy_UnicodeHelper_Base {

  constructor (encoding, size) {
    super(...arguments);
    this.size = size;
  }

  firstCharSize (str) {
    return this.size;
  }

  strrev (str) {
    return php.implode('', php.array_reverse(php.str_split(str, this.size)));
  }

  php_strlen (str) {
    return php.strlen(str) / this.size;
  }

  fixTrailing (str) {
    const len = php.strlen(str);

    if ((len % this.size) > 0) {
      return php.substr(str, 0, Math.floor(len / this.size) * this.size);
    }

    return str;
  }

}

// single byte encoding
class Morphy_UnicodeHelper_singlebyte extends Morphy_UnicodeHelper_Base {

  constructor (encoding, size) {
    super(...arguments);
    this.size = size;
  }

  firstCharSize (str) {
    return 1;
  }

  strrev (str) {
    return toBuffer(buffer2str(str).split('').reverse().join(''));
  }

  strlen (str) {
    return buffer2str(str).length;
  }

  fixTrailing (str) {
    return str;
  }

  php_strlen (str) {
    return buffer2str(str).length;
  }

}

// utf8
class Morphy_UnicodeHelper_utf_8 extends Morphy_UnicodeHelper_Base {

  constructor (encoding) {
    super(...arguments);

    this.tails_length = this.getTailsLength();
  }

  firstCharSize (str) {
    return 1 + this.tails_length[php.ord(str)];
  }

  strrev (str) {
    return toBuffer(buffer2str(str).split('').reverse().join(''));
  }

  fixTrailing (str) {
    str = toBuffer(str);

    const strlen = str.length;

    if (!strlen) {
      return '';
    }
  
    let ord = str[strlen - 1];
    let diff;
    let seq_len;
    let miss;

    if ((ord & 0x80) == 0) {
      return str;
    }

    for (let i = strlen - 1; i >= 0; i--) {
      ord = str[i];

      if ((ord & 0xC0) == 0xC0) {
        diff    = strlen - i;
        seq_len = this.tails_length[ord] + 1;

        miss = seq_len - diff;

        if (miss) {
          return str.slice(0, -(seq_len - miss));
        } else {
          return str;
        }
      }
    }

    return '';
  }

  php_strlen (str) {
    return buffer2str(str).length;
  }

  getTailsLength () {
    return [
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
      1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,
      2,2,2,2,2,2,2,2, 2,2,2,2,2,2,2,2,
      3,3,3,3,3,3,3,3, 4,4,4,4,5,5,0,0
    ];
  }

}

// utf16
class Morphy_UnicodeHelper_utf_16_Base extends Morphy_UnicodeHelper_Base {
  
  constructor (encoding, isBigEndian) {
    super(...arguments);

    this.is_be = !!isBigEndian;
    this.char_fmt = isBigEndian ? 'n' : 'v';
  }

  firstCharSize (str) {
    const ord = php.unpack(this.char_fmt, str)[1];

    return ord >= 0xD800 && ord <= 0xDFFF ? 4 : 2;
  }

  strrev (str) {
    const count = php.strlen(str);
    const fmt = this.char_fmt + count;
    const words = php.array_reverse(php.unpack(fmt, str));

    let ord;
    let t;

    for (let i = 0; i < count; i++) {
      ord = words[i];

      if (ord >= 0xD800 && ord <= 0xDFFF) {
        // swap surrogates
        t = words[i];
        words[i] = words[i + 1];

        i++;
        words[i] = t;
      }
    }

    php.array_unshift(words, fmt);

    return php.pack(...words);
  }

  fixTrailing (str) {
    let strlen = php.strlen(str);

    if (strlen & 1) {
      strlen--;
      str = php.substr(str, 0, strlen);
    }

    if (strlen < 2) {
      return '';
    }

    let ord = php.unpack(this.char_fmt, php.substr(str, -2, 2))[1];

    if (this.isSurrogate(ord)) {
      if (strlen < 4) {
        return '';
      }

      ord = php.unpack(this.char_fmt, php.substr(str, -4, 2))[1];

      if (this.isSurrogate(ord)) {
        // full surrogate pair
        return str;
      } else {
        return php.substr(str, 0, -2);
      }
    }

    return str;
  }

  php_strlen (str) {
    let count = php.strlen(str) / 2;
    const fmt = this.char_fmt + count;

    _.forEach(php.unpack(fmt, str), ord => {
      if (ord >= 0xD800 && ord <= 0xDFFF) {
        count--;
      }
    });

    return count;
  }

  isSurrogate (ord) {
    return ord >= 0xD800 && ord <= 0xDFFF;
  }

}

class Morphy_UnicodeHelper_utf_16le extends Morphy_UnicodeHelper_utf_16_Base {

  constructor (encoding) {
    super(encoding, false);
  }

}

class Morphy_UnicodeHelper_utf_16be extends Morphy_UnicodeHelper_utf_16_Base {

  constructor (encoding) {
    super(encoding, true);
  }

}

// utf32
class Morphy_UnicodeHelper_utf_32_Base extends Morphy_UnicodeHelper_MultiByteFixed {

  constructor (encoding) {
    super(encoding, 4);
  }

}

class Morphy_UnicodeHelper_utf_32le extends Morphy_UnicodeHelper_utf_32_Base {

  constructor () {
    super(...arguments);
  }

}

class Morphy_UnicodeHelper_utf_32be extends Morphy_UnicodeHelper_utf_32_Base {

  constructor () {
    super(...arguments);
  }

}

// ucs2, ucs4
class Morphy_UnicodeHelper_ucs_2le extends Morphy_UnicodeHelper_MultiByteFixed {

  constructor (encoding) {
    super(encoding, 2);
  }

}

class Morphy_UnicodeHelper_ucs_2be extends Morphy_UnicodeHelper_MultiByteFixed {

  constructor (encoding) {
    super(encoding, 2);
  }

}

class Morphy_UnicodeHelper_ucs_4le extends Morphy_UnicodeHelper_MultiByteFixed {

  constructor (encoding) {
    super(encoding, 4);
  }

}

class Morphy_UnicodeHelper_ucs_4be extends Morphy_UnicodeHelper_MultiByteFixed {

  constructor (encoding) {
    super(encoding, 4);
  }
  
}

Object.assign(Morphy_UnicodeHelper_unicodeHelpers, {
  Morphy_UnicodeHelper_MultiByteFixed,
  Morphy_UnicodeHelper_singlebyte,
  Morphy_UnicodeHelper_utf_8,
  Morphy_UnicodeHelper_utf_16_Base,
  Morphy_UnicodeHelper_utf_16le,
  Morphy_UnicodeHelper_utf_16be,
  Morphy_UnicodeHelper_utf_32_Base,
  Morphy_UnicodeHelper_utf_32le,
  Morphy_UnicodeHelper_utf_32be,
  Morphy_UnicodeHelper_ucs_2le,
  Morphy_UnicodeHelper_ucs_2be,
  Morphy_UnicodeHelper_ucs_4le,
  Morphy_UnicodeHelper_ucs_4be
});

export {
  Morphy_UnicodeHelper,
  Morphy_UnicodeHelper_Base,
  Morphy_UnicodeHelper_MultiByteFixed,
  Morphy_UnicodeHelper_singlebyte,
  Morphy_UnicodeHelper_utf_8,
  Morphy_UnicodeHelper_utf_16_Base,
  Morphy_UnicodeHelper_utf_16le,
  Morphy_UnicodeHelper_utf_16be,
  Morphy_UnicodeHelper_utf_32_Base,
  Morphy_UnicodeHelper_utf_32le,
  Morphy_UnicodeHelper_utf_32be,
  Morphy_UnicodeHelper_ucs_2le,
  Morphy_UnicodeHelper_ucs_2be,
  Morphy_UnicodeHelper_ucs_4le,
  Morphy_UnicodeHelper_ucs_4be
};
