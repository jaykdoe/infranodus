import _ from 'lodash';
import encoding from 'encoding';
import { php } from '../../utils';

class Morphy_GrammemsProvider_Interface {
  getGrammems (partOfSpeech) {}
}

class Morphy_GrammemsProvider_Decorator extends Morphy_GrammemsProvider_Interface {

  /**
   * @param {Morphy_GrammemsProvider_Interface} inner
   */
  constructor (inner) {
    super(...arguments);

    this.inner = inner;
  }

  getGrammems (partOfSpeech) {
    return this.inner.getGrammems(partOfSpeech);
  }

}

class Morphy_GrammemsProvider_Base extends Morphy_GrammemsProvider_Interface {
  
  static flatizeArray (array) {
    return _.flatten(_.values(array));
  }

  constructor () {
    super(...arguments);
  
    this.grammems = {};
    this.all_grammems = Morphy_GrammemsProvider_Base.flatizeArray(this.getAllGrammemsGrouped());
  }

  getAllGrammemsGrouped () {}

  includeGroups (partOfSpeech, names) {
    const grammems = this.getAllGrammemsGrouped();
    names = (!_.isArray(names)) ? [names] : names;
    names = php.array_flip(names);

    _.forEach(php.array_keys(grammems), key => {
      if (!php.isset(names[key])) {
        delete grammems[key];
      }
    });

    this.grammems[partOfSpeech] = Morphy_GrammemsProvider_Base.flatizeArray(grammems);

    return this;
  }

  excludeGroups (partOfSpeech, names) {
    const grammems = this.getAllGrammemsGrouped();
    names = (!_.isArray(names)) ? [names] : names;

    _.forEach(names, key => delete grammems[key]);
    
    this.grammems[partOfSpeech] = Morphy_GrammemsProvider_Base.flatizeArray(grammems);

    return this;
  }

  resetGroups (partOfSpeech) {
    delete this.grammems[partOfSpeech];

    return this;
  }

  resetGroupsForAll () {
    this.grammems = {};

    return this;
  }

  getGrammems (partOfSpeech) {
    if (php.isset(this.grammems[partOfSpeech])) {
      return this.grammems[partOfSpeech];
    }

    return this.all_grammems;
  }

}

class Morphy_GrammemsProvider_Empty extends Morphy_GrammemsProvider_Base {

  constructor () {
    super(...arguments);
  }

  getAllGrammemsGrouped () {
    return {};
  }

  getGrammems (partOfSpeech) {
    return false;
  }

}

class Morphy_GrammemsProvider_ForFactory extends Morphy_GrammemsProvider_Base {

  constructor (enc) {
    super(...arguments);
    this.encoded_grammems = this.encodeGrammems(this.getGrammemsMap(), enc);
  
    // а как по-другому?
    // кроме как копипастой кода родительского конструктора
    // и чтобы аккуратно - никак
    this.grammems = {};
    this.all_grammems = Morphy_GrammemsProvider_Base.flatizeArray(this.getAllGrammemsGrouped());
  }

  getGrammemsMap () {}

  getAllGrammemsGrouped () {
    return this.encoded_grammems;
  }

  encodeGrammems (grammems, enc) {
    const from_enc = this.getSelfEncoding();
    const result = {};

    if (from_enc == enc) {
      return grammems;
    }

    _.forEach(grammems, (ary, key) => {
      const keyBuffer = Buffer.from(key);
      const keyBufferConverted = encoding.convert(keyBuffer, enc, from_enc);
      const new_key = keyBufferConverted.toString();
      const new_value = [];

      _.forEach(ary, value => {
        const valueBuffer = Buffer.from(value);
        const valueBufferConverted = encoding.convert(valueBuffer, enc, from_enc);

        new_value.push(valueBufferConverted.toString());
      });

      result[new_key] = new_value;
    });

    return result;
  }

}

const Morphy_GrammemsProvider_Factory_included = new Map;

class Morphy_GrammemsProvider_Factory {
  /**
   * @param {phpMorphy} morphy
   * @returns {*}
   */
  static create (morphy) {
    const locale = morphy.getLocale().toLowerCase();
  
    if (!Morphy_GrammemsProvider_Factory_included.has(morphy)) {
      Morphy_GrammemsProvider_Factory_included.set(morphy, {});
    }
    
    const included = Morphy_GrammemsProvider_Factory_included.get(morphy);
    
    if (_.isUndefined(included[locale])) {
      const className = `Morphy_GrammemsProvider_${ locale }`;
      let grammemsProviders = {};
      
      try {
        grammemsProviders = require('./'+ locale);
      } catch (err) {
        included[locale] = new Morphy_GrammemsProvider_Empty(morphy);
        return included[locale];
      }
  
      if (_.isFunction(grammemsProviders[className])) {
        included[locale] = grammemsProviders[className].instance(morphy);
      } else {
        throw new Error("Class '" + className + "' not found");
      }
    }
  
    return included[locale];
  }
}

export {
  Morphy_GrammemsProvider_Interface,
  Morphy_GrammemsProvider_Decorator,
  Morphy_GrammemsProvider_Base,
  Morphy_GrammemsProvider_Empty,
  Morphy_GrammemsProvider_ForFactory,
  Morphy_GrammemsProvider_Factory
};
