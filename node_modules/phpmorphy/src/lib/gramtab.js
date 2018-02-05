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
import { php } from '../utils';

class Morphy_GramTab_Interface  {

  getGrammems (ancodeId) {}

  getPartOfSpeech (ancodeId) {}

  resolveGrammemIds (ids) {}

  resolvePartOfSpeechId (id) {}

  includeConsts () {}
  
  /**
   * @param ancodeId
   * @param {*} [commonAncode=null]
   */
  ancodeToString (ancodeId, commonAncode = null) {}

  stringToAncode (string) {}

  toString (partOfSpeechId, grammemIds) {}

}

class Morphy_GramTab_Empty extends Morphy_GramTab_Interface {

  getGrammems (ancodeId) {
    return [];
  }

  getPartOfSpeech (ancodeId) {
    return 0;
  }

  resolveGrammemIds (ids) {
    return php.is_array(ids) ? {} : '';
  }

  resolvePartOfSpeechId (id) {
    return '';
  }

  includeConsts () {}

  ancodeToString (ancodeId, commonAncode) {
    return '';
  }

  stringToAncode (string) {
    return null;
  }

  toString (partOfSpeechId, grammemIds) {
    return '';
  }

}

class Morphy_GramTab_Proxy extends Morphy_GramTab_Interface {

  /**
   * @param {Morphy_Storage} storage
   */
  constructor (storage) {
    super();
    this.storage = storage;
    this.___obj  = null;
  }

  getGrammems (...args) {
    return this.__obj.getGrammems(...args);
  }

  getPartOfSpeech (...args) {
    return this.__obj.getPartOfSpeech(...args);
  }

  resolveGrammemIds (...args) {
    return this.__obj.resolveGrammemIds(...args);
  }

  resolvePartOfSpeechId (...args) {
    return this.__obj.resolvePartOfSpeechId(...args);
  }

  includeConsts (...args) {
    return this.__obj.includeConsts(...args);
  }

  ancodeToString (...args) {
    return this.__obj.ancodeToString(...args);
  }

  stringToAncode (...args) {
    return this.__obj.stringToAncode(...args);
  }

  toString (...args) {
    return this.__obj.toString(...args);
  }

  get __obj () {
    if (!this.___obj) {
      this.___obj = Morphy_GramTab.create(this.storage);
      delete this.storage;
    }

    return this.___obj;
  }
  
  set __obj (value) {
    this.___obj = (!_.isUndefined(value)) ? value : null;
  }

}

class Morphy_GramTab extends Morphy_GramTab_Interface {

  /**
   * @param {Morphy_Storage} $storage
   * @returns {Morphy_GramTab}
   */
  static create ($storage) {
    return new Morphy_GramTab($storage);
  }

  /**
   * @param {Morphy_Storage} storage
   */
  constructor (storage) {
    super();
    
    this.data = php.unserialize(storage.read(0, storage.getFileSize()).toString());
    if (this.data == false) {
      throw new Error('Broken gramtab data');
    }

    this.grammems       = this.data['grammems'];
    this.poses          = this.data['poses'];
    this.ancodes        = this.data['ancodes'];
    this.___ancodes_map = null;
  }

  getGrammems (ancodeId) {
    if (!php.isset(this.ancodes[ancodeId])) {
      throw new Error(`Invalid ancode id '${ ancodeId }'`);
    }
    
    return this.ancodes[ancodeId]['grammem_ids'];
  }

  getPartOfSpeech (ancodeId) {
    if (!php.isset(this.ancodes[ancodeId])) {
      throw new Error(`Invalid ancode id '${ ancodeId} '`);
    }
    
    return this.ancodes[ancodeId].pos_id;
  }

  resolveGrammemIds (ids) {
    if (php.is_array(ids)) {
      const result = [];

      _.forEach(ids, id => {
        if (!php.isset(this.grammems[id])) {
          throw new Error(`Invalid grammem id '${ id }'`);
        }

        result.push(this.grammems[id]['name']);
      });

      return result;
    }

    if (!php.isset(this.grammems[ids])) {
      throw new Error(`Invalid grammem id '${ ids }'`);
    }

    return this.grammems[ids]['name'];
  }

  resolvePartOfSpeechId (id) {
    if (!php.isset(this.poses[id])) {
      throw new Error(`Invalid part of speech id '${ id }'`);
    }

    return this.poses[id]['name'];
  }

  includeConsts () {
    /** todo: вот те самые константы */
    return require('./gramtab_consts');
  }

  ancodeToString (ancodeId, commonAncode) {
    commonAncode = (!_.isUndefined(commonAncode)) ? commonAncode : null;

    if (php.isset(commonAncode)) {
      commonAncode = this.getGrammems(commonAncode).join(',') + ',';
    }

    return [
      this.getPartOfSpeech(ancodeId),
      ' ',
      (commonAncode ? commonAncode : ''),
      this.getGrammems(ancodeId).join(',')
    ].join('');
  }

  findAncode (partOfSpeech, grammems) {}

  stringToAncode (string) {
    if (!php.isset(string)) {
      return null;
    }

    if (!php.isset(this.__ancodes_map[string])) {
      throw new Error(`Ancode with '${ string }' graminfo not found`);
    }

    return this.__ancodes_map[string];
  }

  /**
   * @param partOfSpeechId
   * @param grammemIds
   * @returns {string}
   */
  toString (partOfSpeechId, grammemIds) {
    return partOfSpeechId + ' ' + php.implode(',', grammemIds);
  }

  buildAncodesMap () {
    const result = {};

    _.forEach(this.ancodes, (data, ancode_id) => {
      const key = this.toString(data['pos_id'], data['grammem_ids']);

      result[key] = ancode_id;
    });

    return result;
  }

  get __ancodes_map () {
    if (!this.___ancodes_map) {
      this.___ancodes_map = this.buildAncodesMap();
    }

    return this.___ancodes_map;
  }

  set __ancodes_map (value) {
    this.___ancodes_map = (!_.isUndefined(value)) ? value : null;
  }

}

export {
  Morphy_GramTab_Interface,
  Morphy_GramTab_Empty,
  Morphy_GramTab_Proxy,
  Morphy_GramTab
};
