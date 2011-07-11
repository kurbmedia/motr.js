(function(){
	
	if( typeof jQuery == 'undefined' ){
		throw("motr.js requires the jQuery library");
	}
	
	var root = this,
		motr = root.motr = {};
		
	motr.config = {};
	
	// Setup default options for an entire library
	motr.setup = function( name, options ){
		motr.config[name] = motr.config[name] || {};
		motr.config[name] = jQuery.extend({}, motr.config[name], options);
		return motr.config[name];
	};
	
	jQuery.motr = root.motr;
	jQuery.motr.version = "0.0.1";
	
}).call(this);