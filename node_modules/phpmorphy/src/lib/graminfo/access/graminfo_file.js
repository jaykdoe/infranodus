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
import { php } from '../../../utils';
import { Morphy_GramInfo } from '../graminfo';

class Morphy_GramInfo_File extends Morphy_GramInfo {

  constructor (...args) {
    super(...args);

    // todo: вместо магической константы, хаотично распиханной по методам, подставить эту переменную
    this.header_size = 20;
  }

  getGramInfoHeaderSize () {
    return 20;
  }

  readGramInfoHeader (offset) {
    const fh = this.resource;
    let buf = Buffer.alloc(20);
    
    fs.readSync(fh, buf, 0, 20, offset);

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
    ].join('/'), buf);

    result['offset'] = offset;

    return result;
  }

  readAncodesMap (info) {
    const fh = this.resource;
    // TODO: this can be wrong due to aligning ancodes map section
    const offset = info['offset'] + 20 + info['forms_count'] * 2;
    const forms_count = info['packed_forms_count'];
    const buf = Buffer.alloc(forms_count * 2);
    fs.readSync(fh, buf, 0, forms_count * 2, offset);

    return php.unpack('v'+ forms_count, buf);
  }

  splitAncodes (ancodes, map) {
    const result = [];
  
    let k;
    let kc;
    let j = 0;
    _.forEach(map, function (mapItem) {
      const res = [];

      for (k = 0, kc = mapItem; k < kc; k++, j++) {
        res.push(ancodes[j]);
      }

      result.push(res);
    });

    return result;
  }

  readAncodes (info) {
    const fh = this.resource;
    // TODO: this can be wrong due to aligning ancodes section
    const offset = info['offset'] + 20;
    const forms_count = info['forms_count'];
    const buf = Buffer.alloc(forms_count * 2);
    fs.readSync(fh, buf, 0, forms_count * 2, offset);
    const ancodes = php.unpack('v' + forms_count, buf);

    // if (!expand) { return ancodes; }

    const map = this.readAncodesMap(info);

    return this.splitAncodes(ancodes, map);
  }

  readFlexiaData (info) {
    const fh = this.resource;
    let offset = info['offset'] + 20;

    if (php.isset(info['affixes_offset'])) {
      offset += info['affixes_offset'];
    } else {
      offset += info['forms_count'] * 2 + info['packed_forms_count'] * 2;
    }

    const buf = Buffer.alloc(info['affixes_size'] - this.ends_size);
    fs.readSync(fh, buf, 0, info['affixes_size'] - this.ends_size, offset);

    return buf.toString().split(this.ends.toString());
  }

  readAllGramInfoOffsets () {
    return this.readSectionIndex(this.header['flex_index_offset'], this.header['flex_count']);
  }

  readSectionIndex (offset, count) {
    const buf = Buffer.alloc(count * 4);
    fs.readSync(this.resource, buf, 0, count * 4, offset);

    return _.values(php.unpack('V'+ count, buf));
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

        // todo: проверить полученные переменные
        result[header['id']] = {
          'header': header,
          'affixes': affixes,
          'ancodes': ancodes
        };
  
        offset += size;
      }
    );

    return result;
  }

  readAllPartOfSpeech () {
    const fh = this.resource;
    const result = {};
    let offset = this.header['poses_offset'];
    let buf;
    let res;

    _.forEach(
      this.readSectionIndexAsSize(
        this.header['poses_index_offset'],
        this.header['poses_count'],
        this.header['poses_size']
      ),
      size => {
        buf = Buffer.alloc(3);
        fs.readSync(fh, buf, 0, 3, offset);
        res = php.unpack('vid/Cis_predict', buf);
  
        buf = Buffer.alloc(size - 3);
        fs.readSync(fh, buf, 0, size - 3, offset);
  
        result[res['id']] = {
          name: this.cleanupCString(buf),
          is_predict: !!res['is_predict']
        };
  
        offset += size;
      }
    );

    // todo: сверить result
    return result;
  }

  readAllGrammems () {
    const fh = this.resource;
    const result = {};
    let offset = this.header['grammems_offset'];
    let buf;
    let res;

    _.forEach(
      this.readSectionIndexAsSize(
        this.header['grammems_index_offset'],
        this.header['grammems_count'],
        this.header['grammems_size']
      ),
      size => {
        buf = Buffer.alloc(3);
        fs.readSync(fh, buf, 0, 3, offset);
        res = php.unpack('vid/Cshift', buf);
  
        buf = Buffer.alloc(size - 3);
        fs.readSync(fh, buf, 0, size - 3, offset);
  
        result[res['id']] = {
          name: this.cleanupCString(buf),
          shift: res['shift']
        };
  
        offset += size;
      }
    );

    return result;
  }

  readAllAncodes () {
    const fh = this.resource;
    const result = {};
    let offset = this.header['ancodes_offset'];
    let res;
    let grammems_count;
    let grammem_ids;
    let buf;

    for (let i = 0; i < this.header['ancodes_count']; i++) {
      buf = Buffer.alloc(4);
      fs.readSync(fh, buf, 0, 4, offset);
      res = php.unpack('vid/vpos_id', buf);

      offset += 4;

      buf = Buffer.alloc(2);
      fs.readSync(fh, buf, 0, 2, offset);
      grammems_count = php.unpack('v', buf)[1];

      offset += 2;

      if (grammems_count) {
        buf = Buffer.alloc(grammems_count * 2);
        fs.readSync(fh, buf, 0, grammems_count * 2, offset);
        grammem_ids = _.values(php.unpack('v' + grammems_count, buf));
      } else {
        grammem_ids = [];
      }

      result[res['id']] = {
        pos_id: res['pos_id'],
        offset: offset,
        grammem_ids: grammem_ids
      };

      offset += grammems_count * 2;
    }

    return result;
  }

}

export { Morphy_GramInfo_File };
