String.prototype.toCaption = function(){
	return this.replace(/([A-Z])/g, function($1){return " "+$1;});
}

/* To Title Case 1.1.1
 * David Gouch <http://individed.com>
 * 23 May 2008
 * License: http://individed.com/code/to-title-case/license.txt
 *
 * In response to John Gruber's call for a Javascript version of his script: 
 * http://daringfireball.net/2008/05/title_case
 */

String.prototype.toTitleCase = function() {
    return this.replace(/([\w&`'‘’"“.@:\/\{\(\[<>_]+-? *)/g, function(match, p1, index, title) {
        if (index > 0 && title.charAt(index - 2) !== ":" &&
        	match.search(/^(a(nd?|s|t)?|b(ut|y)|en|for|i[fn]|o[fnr]|t(he|o)|vs?\.?|via)[ \-]/i) > -1)
            return match.toLowerCase();
        if (title.substring(index - 1, index + 1).search(/['"_{(\[]/) > -1)
            return match.charAt(0) + match.charAt(1).toUpperCase() + match.substr(2);
        if (match.substr(1).search(/[A-Z]+|&|[\w]+[._][\w]+/) > -1 || 
        	title.substring(index - 1, index + 1).search(/[\])}]/) > -1)
            return match;
        return match.charAt(0).toUpperCase() + match.substr(1);
    });
};

String.prototype.startsWith = function(prefix) {
	if (this.substring(0,prefix.length) == prefix){
		return true;
	}
	return false;
}

String.prototype.endsWith = function(suffix) {
	if (suffix == ''){
		return true;
	}
	if (suffix == this){
		return true;
	}
	if (suffix.length > this.length){
		return false;
	}
	if (this.substring(this.length - suffix.length) == suffix){
		return true;
	}
	return false;
}

if (typeof String.prototype.trim != 'function'){
	String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };
}

if (typeof console !== 'object'){
	console = {}
}

if (typeof console.log !== 'function'){
	console.log = function(){}
}

if (typeof jQuery !== 'undefined'){(function($){
	
	if (!$.isFunction($.fn.findAndFilter)){
		$.fn.findAndFilter = function(selector){
			return this.filter(selector).add(this.find(selector));
		}
	}
	
	if (!$.isFunction($.objectWithPrototype)){
		$.objectWithPrototype = function(p){
			function F() {}
			F.prototype = p;
			return new F();
		}
	}
	
})(jQuery)}
