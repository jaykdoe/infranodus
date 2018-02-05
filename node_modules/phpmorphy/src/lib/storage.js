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
import { php } from '../utils';
import { STORAGE_FILE, STORAGE_MEM } from './constants';

class Morphy_Storage {

  constructor (fileName = '') {
    if (fileName) {
      this.file_name = fileName;
      this.resource = this.open(fileName);
    }
  }

  getFileName () {
    return this.file_name;
  }

  getResource () {
    return this.resource;
  }

  getTypeAsString () {
    return this.getType();
  }

  /**
   * @param {number} offset
   * @param {number} len
   * @param {boolean} [exactLength=true]
   * @returns {*}
   */
  read (offset, len, exactLength = true) {
    if (offset >= this.getFileSize()) {
      throw new Error(`Can't read ${ len } bytes beyond end of '${ this.getFileName() }' file, offset = ${ offset }, file_size = ${ this.getFileSize() }`);
    }

    let result;
    try {
      result = this.readUnsafe(offset, len);
    } catch (e) {
      throw new Error(`Can't read ${ len } bytes at ${ offset } offset, from '${ this.getFileName() }' file: ${ e.message }`);
    }

    if (exactLength && result.length < len) {
      throw new Error(`Can't read ${ len } bytes at ${ offset } offset, from '${ this.getFileName() }' file`);
    }

    return result;
  }

  readUnsafe (offset, len) {}

  getFileSize () {}

  getType () {}

  open (fileName) {}

}

class Morphy_Storage_Proxy extends Morphy_Storage {

  constructor (type, fileName, factory) {
    super();
    this.file_name = fileName;
    this.type = type;
    this.factory = factory;
    this.___obj = null;
  }

  getFileName () {
    return this.__obj.getFileName();
  }

  getResource () {
    return this.__obj.getResource();
  }

  getFileSize () {
    return this.__obj.getFileSize();
  }

  getType () {
    return this.__obj.getType();
  }

  readUnsafe (offset, len) {
    return this.__obj.readUnsafe(offset, len);
  }

  open (fileName) {
    return this.__obj.open(fileName);
  }

  get __obj () {
    if (!this.___obj) {
      this.___obj = this.factory.open(this.type, this.file_name, false);

      delete this.file_name;
      delete this.type;
      delete this.factory;
    }

    return this.___obj;
  }
  
  set __obj (value) {
    this.___obj = (!_.isUndefined(value)) ? value : null;
  }

}

class Morphy_Storage_File extends Morphy_Storage {

  constructor () {
    super(...arguments);
  }

  getType () {
    return STORAGE_FILE;
  }

  getFileSize () {
    const stat = fs.fstatSync(this.resource);
    if (stat === false) {
      throw new Error(`Can't invoke fs.fstatSync for '${ this.file_name }' file`);
    }

    return stat['size'];
  }

  readUnsafe (offset, len) {
    const buf = Buffer.alloc(len);
    fs.readSync(this.resource, buf, 0, len, offset);

    return buf;
  }

  open (fileName) {
    const fh = fs.openSync(fileName, 'r');
    if (fh === false) {
      throw new Error(`Can't open '${ this.file_name }' file`);
    }

    return fh;
  }

}

class Morphy_Storage_Mem extends Morphy_Storage {

  constructor () {
    super(...arguments);
  }

  getType () {
    return STORAGE_MEM;
  }

  getFileSize () {
    return this.resource.length;
  }

  readUnsafe (offset, len) {
    return php.substr(this.resource, offset, len);
    //return this.resource.slice(offset, offset + len - 1);
  }

  open (fileName) {
    const buffer = fs.readFileSync(fileName);
    if (buffer === false) {
      throw new Error(`Can't read '${ fileName }' file`);
    }

    return buffer;
  }

}

class Morphy_Storage_Factory {
  
  static get storages () {
    return {
      Morphy_Storage_File,
      Morphy_Storage_Mem
    };
  }

  open (type, fileName, lazy) {
    switch (type) {
      case STORAGE_FILE:
      // downfall
      case STORAGE_MEM:
        break;
      default:
        throw new Error(`Invalid storage type '${ type }' specified`);
    }

    if (lazy) {
      return new Morphy_Storage_Proxy(type, fileName, this);
    }

    const className = 'Morphy_Storage_' + php.ucfirst(type.toLowerCase());

    return new Morphy_Storage_Factory.storages[className](fileName);
  }

}

export {
  Morphy_Storage,
  Morphy_Storage_Proxy,
  Morphy_Storage_File,
  Morphy_Storage_Mem,
  Morphy_Storage_Factory
};
