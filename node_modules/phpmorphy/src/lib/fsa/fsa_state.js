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

class Morphy_Link_Base {

  /**
   * @param {Morphy_Fsa_Interface} fsa
   * @param trans
   * @param rawTrans
   */
  constructor (fsa, trans, rawTrans) {
    this.fsa       = fsa;
    this.trans     = trans;
    this.raw_trans = rawTrans;
  }

  isAnnotation () {}

  getTrans () {
    return this.trans;
  }

  getFsa () {
    return this.fsa;
  }

  getRawTrans () {
    return this.raw_trans;
  }

}

/**
 * This class represent "normal" link i.e. link that points to automat state
 */
class Morphy_Link extends Morphy_Link_Base {

  constructor (...args) {
    super(...args);
  }

  isAnnotation () {
    return false;
  }

  getDest () {
    return this.trans['dest'];
  }

  getAttr () {
    return this.trans['attr'];
  }

  getTargetState () {
    return this.createState(this.trans['dest']);
  }
  
  createState (index) {
    return new Morphy_State(this.fsa, index);
  }

}

class Morphy_Link_Annot extends Morphy_Link_Base {

  constructor (...args) {
    super(...args);
  }

  isAnnotation () {
    return true;
  }

  getAnnotation () {
    return this.fsa.getAnnot(this.raw_trans);
  }

}

class Morphy_State {

  /**
   * @param {Morphy_Fsa_Interface} fsa
   * @param index
   */
  constructor (fsa, index) {
    this.fsa         = fsa;
    this.raw_transes = fsa.readState(index);
    this.transes     = fsa.unpackTranses(this.raw_transes);
  }

  getLinks () {
    let trans;
    const result = [];

    for (let i = 0, c = this.transes.length; i < c; i++) {
      trans = this.transes[i];

      if (!trans['term']) {
        result.push(this.createNormalLink(trans, this.raw_transes[i]));
      } else {
        result.push(this.createAnnotLink(trans, this.raw_transes[i]));
      }
    }

    return result;
  }

  getSize () {
    return _.size(this.transes);
  }

  createNormalLink (trans, raw) {
    return new Morphy_Link(this.fsa, trans, raw);
  }

  createAnnotLink (trans, raw) {
    return new Morphy_Link_Annot(this.fsa, trans, raw);
  }

}

export {
  Morphy_Link_Base,
  Morphy_Link,
  Morphy_Link_Annot,
  Morphy_State
};
