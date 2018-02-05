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
import { Morphy_State } from './fsa_state';
import { php } from '../../utils';

class Morphy_Fsa_Interface {

  /**
   * Return root transition of fsa
   * @return {[]}
   */
  getRootTrans () {}

  /**
   * Returns root state object
   * @return {*}
   */
  getRootState () {}

  /**
   * Returns alphabet i.e. all chars used in automat
   * @return {[]}
   */
  getAlphabet () {}

  /**
   * Return annotation for given transition(if annotation flag is set for given trans)
   *
   * @param {[]} trans
   * @return {string}
   */
  getAnnot (trans) {}
  
  /**
   * Find word in automat
   *
   * @param {*} trans starting transition
   * @param {string} word
   * @param {boolean} [readAnnot=true] read annot or simple check if word exists in automat
   * @return {boolean} TRUE if word is found, FALSE otherwise
   */
  walk (trans, word, readAnnot = true) {}

  /**
   * Traverse automat and collect words
   * For each found words callback function invoked with follow arguments:
   * call_user_func(callback, word, annot)
   * when `readAnnot` is FALSE then `annot` arg is always NULL
   *
   * @param {*} startNode
   * @param {*} callback callback function(in php format callback i.e. string or array(obj, method) or array(class,
   *   method)
   * @param {boolean} [readAnnot=true] read annot
   * @param {string} [path=] string to be append to all words
   */
  collect (startNode, callback, readAnnot = true, path = '') {}

  /**
   * Read state at given index
   *
   * @param {number} index
   * @return {[]}
   */
  readState (index) {}

  /**
   * Unpack transition from binary form to array
   *
   * @param {*} rawTranses may be array for convert more than one transitions
   * @return {[]}
   */
  unpackTranses (rawTranses) {}

}

class Morphy_Fsa extends Morphy_Fsa_Interface {
  
  static get HEADER_SIZE () {
    return 128;
  }
  
  /**
   * @param {Morphy_Storage} storage
   * @param {boolean} lazy
   * @returns {*}
   */
  static create (storage, lazy) {
    if (!!lazy) {
      return new Morphy_Fsa_Proxy(storage);
    }
    
    const { readHeader, validateHeader, HEADER_SIZE } = Morphy_Fsa;
    const header = readHeader(storage.read(0, HEADER_SIZE, true));

    if (!validateHeader(header)) {
      throw new Error('Invalid fsa format');
    }

    let type;
    if (header['flags']['is_sparse']) {
      type = 'sparse';
    } else
    if (header['flags']['is_tree']) {
      type = 'tree';
    } else {
      throw new Error('Only sparse or tree fsa`s supported');
    }

    const storage_type = storage.getTypeAsString();
    const className = `Morphy_Fsa_${ php.ucfirst(type) }_${ php.ucfirst(storage_type) }`;
    const fsaAccess = require('./access/fsa_'+ type +'_'+ storage_type);
    
    return new fsaAccess[className](storage.getResource(), header);
  }
  
  static readHeader (headerRaw) {
    const { HEADER_SIZE } = Morphy_Fsa;

    if (headerRaw.length != HEADER_SIZE) {
      throw new Error('Invalid header string given');
    }

    const header = php.unpack([
      'a4fourcc',
      'Vver',
      'Vflags',
      'Valphabet_offset',
      'Vfsa_offset',
      'Vannot_offset',
      'Valphabet_size',
      'Vtranses_count',
      'Vannot_length_size',
      'Vannot_chunk_size',
      'Vannot_chunks_count',
      'Vchar_size',
      'Vpadding_size',
      'Vdest_size',
      'Vhash_size'
    ].join('/'), headerRaw);

    if (header === false) {
      throw new Error('Can`t unpack header');
    }

    const flags          = {};
    const raw_flags      = header['flags'];
    flags['is_tree']   = !!(raw_flags & 0x01);
    flags['is_hash']   = !!(raw_flags & 0x02);
    flags['is_sparse'] = !!(raw_flags & 0x04);
    flags['is_be']     = !!(raw_flags & 0x08);

    header['flags'] = flags;

    header['trans_size'] = header['char_size'] + header['padding_size'] + header['dest_size'] + header['hash_size'];

    return header;
  }

  static validateHeader (header) {
    return !(
      header['fourcc'] != 'meal' ||
      header['ver'] != 3 ||
      header['char_size'] != 1 ||
      header['padding_size'] > 0 ||
      header['dest_size'] != 3 ||
      header['hash_size'] != 0 ||
      header['annot_length_size'] != 1 ||
      header['annot_chunk_size'] != 1 ||
      header['flags']['is_be'] ||
      header['flags']['is_hash'] ||
      1 == 0
    );
  }

  constructor (resource, header) {
    super(...arguments);
    this.resource   = resource;
    this.header     = header;
    this.fsa_start  = header['fsa_offset'];
    this.root_trans = this.readRootTrans();
    this.alphabet   = null;
  }

  getRootTrans () {
    return this.root_trans;
  }

  getRootState () {
    return this.createState(this.getRootStateIndex());
  }

  getAlphabet () {
    if (!php.isset(this.alphabet)) {
      //this.alphabet = php.str_split(this.readAlphabet());

      const alphabet = this.readAlphabet();
      const alphabetBuf = Buffer.from(alphabet);
      const result = [];

      for (let i = 0, length = alphabetBuf.length; i < length; i++) {
        result.push(alphabetBuf.slice(i, i+1).toString());
      }

      this.alphabet = result;
    }

    return this.alphabet;
  }

  createState (index) {
    return new Morphy_State(this, index);
  }

  getRootStateIndex () {}

  readRootTrans () {}

  readAlphabet () {}

}

class Morphy_Fsa_WordsCollector {

  constructor (collectLimit) {
    this.limit = collectLimit;
    this.items = {};
  }

  collect (word, annot) {
    if (_.size(this.items) < this.limit) {
      this.items[word] = annot;
      return true;
    }

    return false;
  }

  getItems () {
    return this.items;
  }

  clear () {
    this.items = {};
  }

  getCallback () {
    return [this, 'collect'];
  }

}

class Morphy_Fsa_Decorator extends Morphy_Fsa_Interface {

  /**
   * @param {Morphy_Fsa_Interface} fsa
   */
  constructor (fsa) {
    super(...arguments);
    this.fsa = fsa;
  }

  getRootTrans (...args) {
    return this.fsa.getRootTrans(...args);
  }

  getRootState (...args) {
    return this.fsa.getRootState(...args);
  }

  getAlphabet (...args) {
    return this.fsa.getAlphabet(...args);
  }

  getAnnot (...args) {
    return this.fsa.getAnnot(...args);
  }

  walk (...args) {
    return this.fsa.walk(...args);
  }

  collect (...args) {
    return this.fsa.collect(...args);
  }

  readState (...args) {
    return this.fsa.readState(...args);
  }

  unpackTranses (...args) {
    return this.fsa.unpackTranses(...args);
  }

}

class Morphy_Fsa_Proxy extends Morphy_Fsa_Decorator {

  /**
   * @param {Morphy_Storage} storage
   */
  constructor (storage) {
    super(...arguments);
    this.storage = storage;
    this._fsa    = null;
  }

  get fsa () {
    if (!this._fsa) {
      this._fsa = Morphy_Fsa.create(this.storage, false);
      delete this.storage;
    }

    return this._fsa;
  }
  
  set fsa (value) {
    this._fsa = (!_.isUndefined(value)) ? value : null;
  }

}

export {
  Morphy_Fsa_Interface,
  Morphy_Fsa,
  Morphy_Fsa_WordsCollector,
  Morphy_Fsa_Decorator,
  Morphy_Fsa_Proxy
};
