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
import fs from 'fs';
import path from 'path';
import { php } from '../../utils';

class Morphy_GramInfo_Interface {

  /**
   * Returns language for graminfo file
   * @returns {string}
   */
  getLocale () {}

  /**
   * Return encoding for graminfo file
   * @returns {string}
   */
  getEncoding () {}

  /**
   * Return size of character (cp1251 - 1, utf8 - 1, utf16 - 2, utf32 - 4 etc)
   * @returns {number}
   */
  getCharSize () {}

  /**
   * Return end of string value (usually string with \0 value of char_size + 1 length)
   * @returns {string}
   */
  getEnds () {}

  /**
   * Reads graminfo header
   *
   * @param {number} offset
   * @returns {[]}
   */
  readGramInfoHeader (offset) {}

  /**
   * Returns size of header struct
   */
  getGramInfoHeaderSize () {}

  /**
   * Read ancodes section for header retrieved with readGramInfoHeader
   *
   * @param {[]} info
   * @returns {[]}
   */
  readAncodes (info) {}

  /**
   * Read flexias section for header retrieved with readGramInfoHeader
   *
   * @param {[]} info
   * @returns {[]}
   */
  readFlexiaData (info) {}

  /**
   * Read all graminfo headers offsets, which can be used latter for readGramInfoHeader method
   * @returns {[]}
   */
  readAllGramInfoOffsets () {}

  getHeader () {}

  readAllPartOfSpeech () {}

  readAllGrammems () {}

  readAllAncodes () {}

}

class Morphy_GramInfo extends Morphy_GramInfo_Interface {
  
  static get HEADER_SIZE () {
    return 128;
  }

  /**
   * @param {Morphy_Storage} storage
   * @param {boolean} lazy
   * @returns {*}
   */
  static create (storage, lazy) {
    if (lazy) {
      return new Morphy_GramInfo_Proxy(storage);
    }
  
    const { readHeader, validateHeader, HEADER_SIZE } = Morphy_GramInfo;
    const header = readHeader(storage.read(0, HEADER_SIZE));

    if (!validateHeader(header)) {
      throw new Error('Invalid graminfo format');
    }

    const storage_type = storage.getTypeAsString();
    const className = `Morphy_GramInfo_${ php.ucfirst(storage_type) }`;
    const graminfoAccess = require('./access/graminfo_'+ storage_type);
    
    return new graminfoAccess[className](storage.getResource(), header);
  }

  static readHeader (headerRaw) {
    const header = php.unpack([
      'Vver',
      'Vis_be',
      'Vflex_count_old',
      'Vflex_offset',
      'Vflex_size',
      'Vflex_count',
      'Vflex_index_offset',
      'Vflex_index_size',
      'Vposes_offset',
      'Vposes_size',
      'Vposes_count',
      'Vposes_index_offset',
      'Vposes_index_size',
      'Vgrammems_offset',
      'Vgrammems_size',
      'Vgrammems_count',
      'Vgrammems_index_offset',
      'Vgrammems_index_size',
      'Vancodes_offset',
      'Vancodes_size',
      'Vancodes_count',
      'Vancodes_index_offset',
      'Vancodes_index_size',
      'Vchar_size',
      ''
    ].join('/'), headerRaw);

    let offset = 24 * 4;
    let len = php.ord(php.substr(headerRaw, offset++, 1));

    header['lang'] = php.rtrim(php.substr(headerRaw, offset, len));
    offset += len;
    len = php.ord(php.substr(headerRaw, offset++, 1));
    header['encoding'] = php.rtrim(php.substr(headerRaw, offset, len));

    return header;
  }

  static validateHeader (header) {
    return (header['ver'] == 3 || header['is_be'] != 1);
  }

  constructor (resource, header) {
    super(...arguments);
    
    this.resource = resource;
    this.header = header;
    //this.ends      = php.str_repeat('\0', header['char_size'] + 1);
    //this.ends_size = php.strlen(this.ends);
    const buf = Buffer.alloc(header['char_size'] + 1);
    this.ends = buf.fill('\0');
    this.ends_size = buf.length;
  }

  getLocale () {
    return this.header['lang'];
  }

  getEncoding () {
    return this.header['encoding'];
  }

  getCharSize () {
    return this.header['char_size'];
  }

  getEnds () {
    return this.ends;
  }

  getHeader () {
    return this.header;
  }

  cleanupCString (string) {
    //var pos = php.strpos(string, this.ends);
    //if (pos !== false) {
    //  string = php.substr(string, 0, pos);
    //}

    let stringBuf = (Buffer.isBuffer(string)) ? string : Buffer.from(string);
    const pos = this.ends.indexOf(stringBuf);
    if (pos >= 0) {
      stringBuf = stringBuf.slice(0, pos);
    }

    return stringBuf.toString();
  }

  readSectionIndex (offset, count) {}

  readSectionIndexAsSize (offset, count, total_size) {
    // todo
    if (!count) {
      return [];
    }

    const index = this.readSectionIndex(offset, count);
    index[count] = index[0] + total_size;

    for (let i = 0; i < count; i++) {
      index[i] = index[i + 1] - index[i];
    }

    delete index[count];

    return index;
  }

}

class Morphy_GramInfo_Decorator extends Morphy_GramInfo_Interface {

  /**
   * @param {Morphy_GramInfo_Interface} info
   */
  constructor (info) {
    super(...arguments);
    this.info = info;
  }

  readGramInfoHeader (...args) {
    return this.info.readGramInfoHeader(...args);
  }

  getGramInfoHeaderSize (...args) {
    return this.info.getGramInfoHeaderSize(...args);
  }

  readAncodes (...args) {
    return this.info.readAncodes(...args);
  }

  readFlexiaData (...args) {
    return this.info.readFlexiaData(...args);
  }

  readAllGramInfoOffsets (...args) {
    return this.info.readAllGramInfoOffsets(...args);
  }

  readAllPartOfSpeech (...args) {
    return this.info.readAllPartOfSpeech(...args);
  }

  readAllGrammems (...args) {
    return this.info.readAllGrammems(...args);
  }

  readAllAncodes (...args) {
    return this.info.readAllAncodes(...args);
  }

  getLocale (...args) {
    return this.info.getLocale(...args);
  }

  getEncoding (...args) {
    return this.info.getEncoding(...args);
  }

  getCharSize (...args) {
    return this.info.getCharSize(...args);
  }

  getEnds (...args) {
    return this.info.getEnds(...args);
  }
  
  getHeader (...args) {
    return this.info.getHeader(...args);
  }

}

class Morphy_GramInfo_Proxy extends Morphy_GramInfo_Decorator {

  /**
   * @param {Morphy_Storage} $storage
   */
  constructor ($storage) {
    super(...arguments);
    
    this.storage = $storage;
    this._info   = null;
  }

  get info () {
    if (!this._info) {
      this._info = Morphy_GramInfo.create(this.storage, false);
      delete this.storage;
    }

    return this._info;
  }
  
  set info (value) {
    this._info = (!_.isUndefined(value)) ? value : null;
  }

}

class Morphy_GramInfo_Proxy_WithHeader extends Morphy_GramInfo_Decorator {

  /**
   * @param {Morphy_Storage} $storage
   * @param $cacheFile
   */
  constructor ($storage, $cacheFile) {
    super(...arguments);
    
    this.storage = $storage;
    this._info = null;
    this.cache = this.readCache($cacheFile);
    //this.ends = php.str_repeat('\0', this.getCharSize() + 1);
    const buf = Buffer.alloc(this.getCharSize() + 1);
    this.ends = buf.fill('\0');
  }

  readCache (fileName) {
    let result = fs.readFileSync(fileName);

    result = /\(([\s\S]*)\)/igm.exec(result.toString())[1];
    result = result
      .replace(/\s/igm, '')
      .replace(/,$/, '')
      .replace(/=>/g, ':')
      .replace(/'/g, '"')
    ;

    result = ['{', result, '}'].join('');

    let parsingGood = true;
    try {
      result = JSON.parse(result);
      parsingGood = _.isPlainObject(result);
    } catch (e) {
      parsingGood = false;
    }

    if (!parsingGood) {
      throw new Error('Can`t get header cache from "' + fileName +'" file');
    }

    return result;
  }

  getLocale () {
    return this.cache['lang'];
  }

  getEncoding () {
    return this.cache['encoding'];
  }

  getCharSize () {
    return this.cache['char_size'];
  }

  getEnds () {
    return this.ends;
  }

  getHeader () {
    return this.cache;
  }

  get info () {
    if (!this._info) {
      this._info = Morphy_GramInfo.create(this.storage, false);
      delete this.storage;
    }

    return this._info;
  }
  
  set info (value) {
    this._info = (!_.isUndefined(value)) ? value : null;
  }

}

class Morphy_GramInfo_RuntimeCaching extends Morphy_GramInfo_Decorator {

  constructor (...args) {
    super(...args);
    this.$ancodes = {};
    this.$flexia_all = {};
  }

  readFlexiaData (info) {
    const offset = info['offset'];

    if (!php.isset(this.$flexia_all[offset])) {
      this.$flexia_all[offset] = this.info.readFlexiaData(info);
    }

    return this.$flexia_all[offset];
  }

}

class Morphy_GramInfo_AncodeCache extends Morphy_GramInfo_Decorator {

  /**
   * @param {Morphy_GramInfo_Interface} inner
   * @param resource
   */
  constructor (inner, resource) {
    super(...arguments);

    this.hits  = 0;
    this.miss  = 0;
    this.cache = null;

    this.cache = php.unserialize(resource.read(0, resource.getFileSize()).toString());
    if (this.cache === false) {
      throw new Error("Can`t read ancodes cache");
    }
  }

  readAncodes (info) {
    const $offset = info['offset'];

    // todo: проверить доступ по индекс
    if (php.isset(this.cache[$offset])) {
      this.hits++;
      return this.cache[$offset];
    }

    // in theory misses never occur
    this.miss++;

    return super.readAncodes(info);
  }

}

export {
  Morphy_GramInfo_Interface,
  Morphy_GramInfo,
  Morphy_GramInfo_Decorator,
  Morphy_GramInfo_Proxy,
  Morphy_GramInfo_Proxy_WithHeader,
  Morphy_GramInfo_RuntimeCaching,
  Morphy_GramInfo_AncodeCache
};
