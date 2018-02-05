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
import { php } from '../../../utils';
import { Morphy_GramInfo } from '../graminfo';

class Morphy_GramInfo_Mem extends Morphy_GramInfo {

  constructor (...args) {
    super(...args);
  }

  getGramInfoHeaderSize () {
    return 20;
  }

  readGramInfoHeader (offset) {
    const mem = this.resource;
    const result = php.unpack([
      'vid',
      'vfreq',
      'vforms_count',
      'vpacked_forms_count',
      'vancodes_count',
      'vancodes_offset',
      'vancodes_map_offset',
      'vaffixes_offset',
      'vaffixes_size',
      'vbase_size'
    ].join('/'), php.substr(mem, offset, 20));

    result['offset'] = offset;

    return result;
  }

  readAncodesMap (info) {
    const mem = this.resource;
    const forms_count = info['packed_forms_count'];
    // TODO: this can be wrong due to aligning ancodes map section
    const offset = info['offset'] + 20 + info['forms_count'] * 2;

    return php.unpack('v' + forms_count, php.substr(mem, offset, forms_count * 2));
  }

  splitAncodes (ancodes, map) {
    const result = [];

    let k;
    let kc;
    let j = 0;
    _.forEach(map, mapItem => {
      const res = [];

      for (k = 0, kc = mapItem; k < kc; k++, j++) {
        res.push(ancodes[j]);
      }

      result.push(res);
    });

    return result;
  }

  readAncodes (info) {
    const mem = this.resource;
    const forms_count = info['forms_count'];
    // TODO: this can be wrong due to aligning ancodes section
    const offset = info['offset'] + 20;
    const ancodes = php.unpack('v' + forms_count, php.substr(mem, offset, forms_count * 2));
    const map = this.readAncodesMap(info);

    return this.splitAncodes(ancodes, map);
  }

  readFlexiaData (info) {
    const mem  = this.resource;
    let offset = info['offset'] + 20;

    if (php.isset(info['affixes_offset'])) {
      offset += info['affixes_offset'];
    } else {
      offset += info['forms_count'] * 2 + info['packed_forms_count'] * 2;
    }

    return php.substr(
      mem,
      offset,
      info['affixes_size'] - this.ends_size
    ).toString().split(this.ends.toString());
  }

  readAllGramInfoOffsets () {
    return this.readSectionIndex(this.header['flex_index_offset'], this.header['flex_count']);
  }

  readSectionIndex (offset, count) {
    const mem = this.resource;

    return php.array_values(php.unpack('V' + count, php.substr(mem, offset, count * 4)));
  }

  readAllFlexia () {
    const result = {};
    let offset = this.header['flex_offset'];

    _.forEach(
      this.readSectionIndexAsSize(
        this.header['flex_index_offset'],
        this.header['flex_count'],
        this.header['flex_size']
      ),
      size => {
        const header = this.readGramInfoHeader(offset);
        const affixes = this.readFlexiaData(header);
        const ancodes = this.readAncodes(header, true);

        result[header['id']] = {
          header: header,
          affixes: affixes,
          ancodes: ancodes
        };
  
        offset += size;
      }
    );

    return result;
  }

  readAllPartOfSpeech () {
    const mem = this.resource;
    const result = {};
    let offset = this.header['poses_offset'];
    let res;

    _.forEach(
      this.readSectionIndexAsSize(
        this.header['poses_index_offset'],
        this.header['poses_count'],
        this.header['poses_size']
      ),
      $size => {
        res = php.unpack('vid/Cis_predict', php.substr(mem, offset, 3));
  
        result[res['id']] = {
          name: this.cleanupCString(php.substr(mem, offset + 3, $size - 3)),
          is_predict: !!res['is_predict']
        };
  
        offset += $size;
      }
    );

    return result;
  }

  readAllGrammems () {
    const mem = this.resource;
    const result = {};
    let offset = this.header['grammems_offset'];
    let res;

    _.forEach(
      this.readSectionIndexAsSize(
        this.header['grammems_index_offset'],
        this.header['grammems_count'],
        this.header['grammems_size']
      ),
      size => {
        res = php.unpack('vid/Cshift', php.substr(mem, offset, 3));
  
        result[res['id']] = {
          'shift': res['shift'],
          'name':  this.cleanupCString(php.substr(mem, offset + 3, size - 3))
        };
  
        offset += size;
      }
    );

    return result;
  }

  readAllAncodes () {
    const mem = this.resource;
    const result = {};
    let offset = this.header['ancodes_offset'];
    let res;
    let grammems_count;
    let grammem_ids;

    for (let $i = 0; $i < this.header['ancodes_count']; $i++) {
      res = php.unpack('vid/vpos_id', php.substr(mem, offset, 4));
      offset += 4;

      grammems_count = php.unpack('v', php.substr(mem, offset, 2))[1];
      offset += 2;

      grammem_ids = (grammems_count)
        ? php.array_values(php.unpack('v' + grammems_count, php.substr(mem, offset, grammems_count * 2)))
        : [];

      result[res['id']] = {
        offset,
        grammem_ids,
        pos_id: res['pos_id']
      };

      offset += grammems_count * 2;
    }

    return result;
  }

}

export { Morphy_GramInfo_Mem };
