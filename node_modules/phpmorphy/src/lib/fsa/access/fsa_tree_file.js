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

class Morphy_Fsa_Tree_File extends Morphy_Fsa {

  constructor (...args) {
    super(...args);
  }

  /**
   * @param trans
   * @param word
   * @param {boolean} [readAnnot=true]
   * @returns {*}
   */
  walk (trans, word, readAnnot = true) {
    const fh = this.resource;
    const fsa_start = this.fsa_start;
    const wordBuf = Buffer.from(word);

    let prev_trans;
    let char;
    let result;
    let start_offset;
    let buf;
    let attr;
    let annot;
  
    let i = 0;
    let c = wordBuf.length;
    for (; i < c; i++) {
      prev_trans = trans;
      char = php.ord(wordBuf, i);

      /////////////////////////////////
      // find char in state begin
      // tree version
      result = true;
      start_offset = fsa_start + (((trans >> 11) & 0x1FFFFF) << 2);

      // read first trans in state
      buf = Buffer.alloc(4);
      fs.readSync(fh, buf, 0, 4, start_offset);
      trans = php.unpack('V', buf)[0];

      // If first trans is term(i.e. pointing to annot) then skip it
      if ((trans & 0x0100)) {
        // When this is single transition in state then break
        if ((trans & 0x0200) && (trans & 0x0400)) {
          result = false;
        } else {
          start_offset += 4;
          buf = Buffer.alloc(4);
          fs.readSync(fh, buf, 0, 4, start_offset);
          trans = php.unpack('V', buf)[0];
        }
      }

      // if all ok process rest transitions in state
      if (result) {
        // walk through state
        let idx = 1;
        let j = 0;
        for (;; j++) {
          attr = (trans & 0xFF);

          if (attr == char) {
            result = true;
            break;
          } else
          if (attr > char) {
            if ((trans & 0x0200)) {
              result = false;
              break;
            }

            idx = idx << 1;
          } else {
            if ((trans & 0x0400)) {
              result = false;
              break;
            }

            idx = (idx << 1) + 1;
          }

          if (j > 255) {
            throw new Error('Infinite recursion possible');
          }

          // read next trans
          buf = Buffer.alloc(4);
          fs.readSync(fh, buf, 0, 4, start_offset + ((idx - 1) << 2));
          trans = php.unpack('V', buf)[0];
        }
      }
      // find char in state end
      /////////////////////////////////

      if (!result) {
        trans = prev_trans;
        break;
      }
    }

    annot      = null;
    result     = false;
    prev_trans = trans;

    if (i >= c) {
      // Read annotation when we walked all chars in word
      result = true;

      if (readAnnot) {
        // read annot trans
        buf = Buffer.alloc(4);
        fs.readSync(fh, buf, 0, 4, fsa_start + (((trans >> 11) & 0x1FFFFF) << 2));
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
   * @param startNode
   * @param callback
   * @param {boolean} [readAnnot=true]
   * @param {string} [path=]
   * @returns {number}
   */
  collect (startNode, callback, readAnnot = true, path = '') {
    // `path` нигде не используется, даже в `Morphy_Morphier_PredictCollector.collect`,
    // куда попадает этот `path` через вызов коллбека ниже
    const stack = [];
    const stack_idx = [];
    
    let total = 0;
    let start_idx = 0;
    let state;
    let trans;
    let annot;

    stack.push(null);
    stack_idx.push(null);
    state = this.readState(((startNode) >> 11) & 0x1FFFFF);

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

          if (!php.call_user_func(callback, null, annot)) {
            return total;
          }
        } else {
          //path += php.chr((trans & 0xFF));
          stack.push(state);
          stack_idx.push(i + 1);
          state = this.readState(((trans) >> 11) & 0x1FFFFF);
          start_idx = 0;

          break;
        }
      }

      if (i >= c) {
        state = stack.pop();
        start_idx = stack_idx.pop();
        //path = php.substr(path, 0, -1);
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
    let offset = fsa_start + ((index) << 2);

    // read first trans
    buf = Buffer.alloc(4);
    fs.readSync(fh, buf, 0, 4, offset);
    trans = php.unpack('V', buf)[0];

    // check if first trans is pointer to annot, and not single in state
    if ((trans & 0x0100) && !((trans & 0x0200) || (trans & 0x0400))) {
      result.push(trans);

      buf = Buffer.alloc(4);
      fs.readSync(fh, buf, 0, 4, null);
      trans = php.unpack('V', buf)[0];
      offset += 4;
    }

    // read rest
    for (let expect = 1; expect; expect--) {
      if (!(trans & 0x0200)) {
        expect++;
      }
      if (!(trans & 0x0400)) {
        expect++;
      }

      result.push(trans);

      if (expect > 1) {
        buf = Buffer.alloc(4);
        fs.readSync(fh, buf, 0, 4, null);
        trans = php.unpack('V', buf)[0];
        offset += 4;
      }
    }

    return result;
  }

  unpackTranses (rawTranses) {
    rawTranses = castArray(rawTranses);
    const result = [];

    _.forEach(rawTranses, rawTrans => {
      result.push({
        term:  !!(rawTrans & 0x0100),
        llast: !!(rawTrans & 0x0200),
        rlast: !!(rawTrans & 0x0400),
        attr:  (rawTrans & 0xFF),
        dest:  ((rawTrans) >> 11) & 0x1FFFFF
      });
    });

    return result;
  }

  readRootTrans () {
    const fh = this.resource;
    const fsa_start = this.fsa_start;

    let buf = Buffer.alloc(4);
    fs.readSync(fh, buf, 0, 4, fsa_start + 0);
    return php.unpack('V', buf)[0];
  }

  readAlphabet () {
    const fh = this.resource;
    let buf = Buffer.alloc(this.header['alphabet_size']);
    fs.readSync(fh, buf, 0, this.header['alphabet_size'], this.header['alphabet_offset']);

    return buf.toString();
  }

  getAnnot (trans) {
    if (!(trans & 0x0100)) {
      return null;
    }

    const fh = this.resource;
    const offset = this.header['annot_offset'] + (((trans & 0xFF) << 21) | ((trans >> 11) & 0x1FFFFF));

    let annot;
    let buf = Buffer.alloc(1);
    fs.readSync(fh, buf, 0, 1, offset);
    
    let len = php.ord(buf);
    if (len) {
      buf = Buffer.alloc(len);
      fs.readSync(fh, buf, 0, len, null);
      annot = buf;
    } else {
      annot = null;
    }

    return annot;
  }

}

export { Morphy_Fsa_Tree_File };
