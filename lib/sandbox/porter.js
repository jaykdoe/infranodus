var natural = require('natural');

console.log(("Deutsch perfekt berichtet über ”aktuelle #Themen – Alltag genauso wie Kultur und Gesellschaft – aus Deutschland, Österreich und der Schweiz. Alle Texte sind speziell für Deutschlerner geschrieben. Erklärungen zu schwierigen Wörtern machen das Leseverstehen einfacher und helfen Ihnen, Ihren Wortschatz zu vergrößern. Spezielle Übungen zum Leseverstehen finden Sie außerdem hier.").replace(/[^a-zA-Z0-9\u00C0-\u00FF]+/g, ' ').split(' '));


function germanTokenizer(word){
	var eRx = ['', ''];

	word = word.toLowerCase().replace(/ß/g, 'ss').replace(/[^a-zäöüéç]/g, '').replace(/([aeiouyäöü])u([aeiouyäöü])/g, '$1U$2').replace(/([aeiouyäöü])y([aeiouyäöü])/g, '$1Y$2');

	var res,
	    R1 = ((/[aeiouyäöü][^aeiouyäöü]/.exec(' '+word) || eRx).index || 1000) + 1,
	    R2 = (((/[aeiouyäöü][^aeiouyäöü]/.exec(' '+word.substr(R1)) || eRx).index || 1000)) + R1 + 1;

	R1 = Math.max(3, R1);


	// step 1
	var sfx = /(ern|em|er|(en|es|e)|[bdfghklmnrt](s))$/.exec(word);
	if(sfx){
		var g2 = !!sfx[2];
		sfx = sfx[3] || sfx[2] || sfx[1];
		if(word.indexOf(sfx, R1) >= 0){
			word = word.substr(0, word.length - sfx.length);
			if(g2 && /niss$/.test(word)){
				word = word.substr(0, word.length - 1);
			}
		}
	}


	// step 2
	var res, ending;
	if(res = /(est|en|er)$/.exec(word)){
		ending = res[1];
	}else if(/...[bdfghklmnt]st$/.test(word)){
		ending = 'st';
	}
	if(ending && (word.indexOf(ending, R1) >= 0)){
		word = word.substr(0, word.length - ending.length);
	}


	// step 3
	var res;
	if(res = /(end|ung)$/.exec(word)){
		if(word.indexOf(res[1], R2) >= 0){
			word = word.substr(0, word.length - res[1].length);
			if(/[^e]ig$/.test(word) && /ig$/.test(word.substr(R2))){
				word = word.substr(0, word.length - 2);
			}
		}
	}else if(res = /(isch|ig|ik)$/.exec(word)){
		if(/[^e](isch|ig|ik)$/.test(word) && /(isch|ig|ik)$/.test(word.substr(R2))){
			word = word.substr(0, word.length - res[1].length);
		}
	}else if(res = /(lich|heit)$/.exec(word)){
		if(word.indexOf(res[1], R2) >= 0){
			word = word.substr(0, word.length - res[1].length);
			if(/(er|en)$/.test(word.substr(R1))){
				word = word.substr(0, word.length - 2);
			}
		}
	}else if(res = /(keit)$/.exec(word)){
		if(word.indexOf(res[1], R2) >= 0){
			word = word.substr(0, word.length - res[1].length);
			if((res = /(lich|ig)$/.exec(word)) && /(lich|ig)$/.test(word.substr(R2))){
				word = word.substr(0, word.length - res[1].length);
			}
		}
	}

	word = word.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');

	return word;
}
