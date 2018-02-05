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

class Morphy_Source_Interface {

  getValue (key) {}

}

class Morphy_Source_Fsa extends Morphy_Source_Interface {

  /**
   * @param {Morphy_Fsa_Interface} fsa
   */
  constructor (fsa) {
    this.fsa = fsa;
    this.root = fsa.getRootTrans();
  }

  getFsa () {
    return this.fsa;
  }

  getValue (key) {
    const result = this.fsa.walk(this.root, key, true);
    if (result === false || !result['annot']) {
      return false;
    }

    return result['annot'];
  }

}

export {
  Morphy_Source_Interface,
  Morphy_Source_Fsa
};
