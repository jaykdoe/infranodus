import _ from 'lodash';
import { php } from '../../utils';
import { Morphy_GrammemsProvider_ForFactory } from './common';

const Morphy_GrammemsProvider_ru_ru_instances = new WeakMap;

class Morphy_GrammemsProvider_ru_ru extends Morphy_GrammemsProvider_ForFactory {
  
  static get self_encoding () {
    return 'utf-8';
  }
  
  static get grammems_map () {
    return {
      'род': [
        'МР',
        'ЖР',
        'СР'
      ],
      'одушевленность': [
        'ОД',
        'НО'
      ],
      'число': [
        'ЕД',
        'МН'
      ],
      'падеж': [
        'ИМ',
        'РД',
        'ДТ',
        'ВН',
        'ТВ',
        'ПР',
        'ЗВ',
        '2'
      ],
      'залог': [
        'ДСТ',
        'СТР'
      ],
      'время': [
        'НСТ',
        'ПРШ',
        'БУД'
      ],
      'повелительная форма': ['ПВЛ'],
      'лицо': [
        '1Л',
        '2Л',
        '3Л'
      ],
      'краткость': ['КР'],
      'сравнительная форма': ['СРАВН'],
      'превосходная степень': ['ПРЕВ'],
      'вид': [
        'СВ',
        'НС'
      ],
      'переходность': [
        'ПЕ',
        'НП'
      ],
      'безличный глагол': ['БЕЗЛ']
    };
  }
  
  /**
   * @param {phpMorphy} morphy
   * @returns {*}
   */
  static instance (morphy) {
    const key = morphy.getEncoding();
    if (!Morphy_GrammemsProvider_ru_ru_instances.has(morphy)) {
      Morphy_GrammemsProvider_ru_ru_instances.set(morphy, {});
    }
    
    const instances = Morphy_GrammemsProvider_ru_ru_instances.get(morphy);

    if (_.isUndefined(instances[key])) {
      instances[key] = new Morphy_GrammemsProvider_ru_ru(key);
    }

    return instances[key];
  }

  constructor () {
    super(...arguments);
  }

  getSelfEncoding () {
    return 'utf-8';
  }

  getGrammemsMap () {
    return Morphy_GrammemsProvider_ru_ru.grammems_map;
  }

}

export { Morphy_GrammemsProvider_ru_ru };
