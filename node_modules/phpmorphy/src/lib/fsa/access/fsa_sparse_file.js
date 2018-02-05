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
import { php, castArray } from '../../../utils';
import { Morphy_Fsa } from '../fsa';

class Morphy_Fsa_Sparse_File extends Morphy_Fsa {

  constructor (...args) {
    super(...args);

    this.alphabet_num = null;
  }

  /**
   * @param trans
   * @param word
   * @param {boolean} [readAnnot=true]
   */
  walk (trans, word, readAnnot = true) {
    const fh = this.resource;
    const fsa_start = this.fsa_start;
    const wordBuf = Buffer.from(word);

    let prev_trans;
    let char;
    let result;
    let annot;
    let buf;
  
    let i = 0;
    let c = wordBuf.length;
    for (; i < c; i++) {
      prev_trans = trans;
      char = php.ord(wordBuf, i);

      /////////////////////////////////
      // find char in state begin
      // sparse version
      result = true;
      buf = Buffer.alloc(4);
      fs.readSync(fh, buf, 0, 4, fsa_start + ((((trans >> 10) & 0x3FFFFF) + char + 1) << 2));
      trans = php.unpack('V', buf)[0];

      if ((trans & 0x0200) || (trans & 0xFF) != char) {
        result = false;
      }
      // find char in state end
      /////////////////////////////////

      if (!result) {
        trans = prev_trans;
        break;
      }
    }

    annot = null;
    result = false;
    prev_trans = trans;

    if (i >= c) {
      // Read annotation when we walked all chars in word
      result = true;

      if (readAnnot) {
        // read annot trans
        buf = Buffer.alloc(4);
        fs.readSync(fh, buf, 0, 4, fsa_start + (((trans >> 10) & 0x3FFFFF) << 2));
        trans = php.unpack('V', buf)[0];

        if ((trans & 0x0100) == 0) {
          result = false;
        } else {
          annot = this.getAnnot(trans);
        }
      }
    }

    return {
      result,
      annot,
      walked: i,
      last_trans: trans,
      word_trans: prev_trans
    };
  }

  /**
   * @param {*} startNode
   * @param {*} callback
   * @param {boolean} [readAnnot=true]
   * @param {string} [path=]
   * @returns {number}
   */
  collect (startNode, callback, readAnnot = true, path = '') {
    const stack     = [];
    const stack_idx = [];


    let total = 0;
    let start_idx = 0;
    let state;
    let trans;
    let annot;

    stack.push(null);
    stack_idx.push(null);

    state = this.readState(((startNode) >> 10) & 0x3FFFFF);

    do {
      let i = start_idx;
      let c = _.size(state);
      for (; i < c; i++) {
        trans = state[i];

        if ((trans & 0x0100)) {
          total++;

          if (readAnnot) {
            annot = this.getAnnot(trans);
          } else {
            annot = trans;
          }

          //if (!php.call_user_func(callback, path, annot)) {
          if (!php.call_user_func(callback, null, annot)) {
            return total;
          }
        } else {
          //path += php.chr((trans & 0xFF));
          stack.push(state);
          stack_idx.push(i + 1);
          state = this.readState(((trans) >> 10) & 0x3FFFFF);
          start_idx = 0;

          break;
        }
      }

      if (i >= c) {
        state = stack.pop();
        start_idx = stack_idx.pop();
        //path = php.substr(Buffer.from(path), 0, -1).toString();
      }
    } while (!!stack.length);

    return total;
  }

  readState (index) {
    const fh = this.resource;
    const fsa_start = this.fsa_start;
    const result = [];
    
    let buf;
    let trans;
    let start_offset = fsa_start + ((index) << 2);

    // first try read annot transition
    buf = Buffer.alloc(4);
    fs.readSync(fh, buf, 0, 4, start_offset);
    trans = php.unpack('V', buf)[0];

    if ((trans & 0x0100)) {
      result.push(trans);
    }

    // read rest
    start_offset += 4;
    _.forEach(this.getAlphabetNum(), char => {
      buf = Buffer.alloc(4);
      fs.readSync(fh, buf, 0, 4, start_offset + ((char) << 2));
      trans = php.unpack('V', buf)[0];

      //if(!(trans & 0x0200) && (trans & 0xFF) == char) {
      // TODO: check term and empty flags at once i.e. trans & 0x0300
      if (!((trans & 0x0200) || (trans & 0x0100)) && (trans & 0xFF) == char) {
        result.push(trans);
      }
    });

    return result;
  }

  unpackTranses (rawTranses) {
    rawTranses = castArray(rawTranses);
    const result = [];

    _.forEach(rawTranses, rawTrans => {
      result.push({
        term:  !!(rawTrans & 0x0100),
        empty: !!(rawTrans & 0x0200),
        attr:  (rawTrans & 0xFF),
        dest:  ((rawTrans) >> 10) & 0x3FFFFF
      });
    });

    return result;
  }

  readRootTrans () {
    const fh = this.resource;
    const fsa_start = this.fsa_start;
    let trans;
    let buf;

    buf = Buffer.alloc(4);
    fs.readSync(fh, buf, 0, 4, fsa_start + 4);
    trans = php.unpack('V', buf)[0];

    return trans;
  }

  readAlphabet () {
    const fh = this.resource;
    let buf;

    buf = Buffer.alloc(this.header['alphabet_size']);
    fs.readSync(fh, buf, 0, this.header['alphabet_size'], this.header['alphabet_offset']);

    return buf.toString();
  }

  getAnnot (trans) {
    if (!(trans & 0x0100)) {
      return null;
    }

    const fh = this.resource;
    const offset = this.header['annot_offset'] + (((trans & 0xFF) << 22) | ((trans >> 10) & 0x3FFFFF));
    let len;
    let annot;
    let buf;

    buf = Buffer.alloc(1);
    fs.readSync(fh, buf, 0, 1, offset);
    len = php.ord(buf);

    if (len) {
      buf = Buffer.alloc(len);
      fs.readSync(fh, buf, 0, len, offset + 1);
      annot = buf;
    } else {
      annot = null;
    }

    return annot;
  }

  getAlphabetNum () {
    if (!php.isset(this.alphabet_num)) {
      this.alphabet_num = php.array_map(php.ord, this.getAlphabet());
    }

    return this.alphabet_num;
  }

}

export { Morphy_Fsa_Sparse_File };
