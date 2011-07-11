(function(jQuery, undefined){
	
	var motr = window.motr,
		inputs = [ 'email', 'url', 'number', 'range', 'date' ],
		numericKeys = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 190, 8],
		NumberInput,
		Placeholder;		
	
	motr.forms = {
		enable: inputs,
		support: {}
	};
	
	// Extend jquery expressions to support various html5 elements

	jQuery.each(inputs, function(i, key) {
		motr.forms.support[key] = null;
		jQuery.expr[':'][key] = function(el) {
			return ( jQuery(el).is(":input") && el.getAttribute("type") === key );
		};
	});
	
	
	//
	// Check to see if a particular input type is available
	function has_native( type ){
		
		var element = jQuery('#__test_input_field').get(0);
			tester  = "(wee);";	

		if( motr.forms.support[type] != null ) return motr.forms.support[type];
			
		element.setAttribute('type', type);		
		
		if( element.type !== 'text' ){			
			//
			// If the element doesn't support checkValidity, 
			// its a pretty safe bet its not a HTML5 element.
			//
			if( !( 'checkValidity' in element ) ) return false;
			
			// Theres no way to double check these right now (?) so just assume we're good
			if( /^(search|tel)$/.test( type ) ) return true;
						
			element.value = tester;
			
			if( /^(url|email)$/.test(type) ) 
				return (element.checkValidity && element.checkValidity() === false);
			return element.value != tester;			
		}				
		return false;
	}
	
	NumberInput = function( element, options ){
		var self = this,
			node = element.get(0),
			btn_up   = jQuery('<a class="inner-spin-button" style="text-decoration:none; text-align:center;" aria-role="button" href="#">&#x25B2;</a>'),
			btn_down = jQuery('<a class="outer-spin-button" style="text-decoration:none; text-align:center;" aria-role="button" href="#">&#x25BC;</a>'),
			active   = false;
			
		jQuery.each([btn_up, btn_down], function(){
			var rect = (element.outerHeight() / 2);
			jQuery(this)
				.css({ 
					position:'fixed', 
					width: rect + "px", 
					height: rect + "px",
					textDecoration: 'none'
				})
				.hide();
			jQuery(this)
				.insertAfter(element)
				.bind('focus mouseover hover', function(event){
					active = true;
				})
				.bind('click.num', function(event){
					event.preventDefault();
				});
		});
		
		element.bind('keydown keyup', function(event){						
			if( jQuery.inArray( event.which, numericKeys ) === -1 ){
				event.preventDefault();
				return false;
			}
		});
		
		element.bind('focus.num', function(event){
			var pos  = element.offset(),
				diff = (element.outerWidth() - btn_up.outerWidth());
			btn_up.css({ top: pos.top, left: pos.left + diff });
			btn_down.css({ top: pos.top + (element.outerHeight() - btn_down.outerHeight()), left: pos.left + diff });
			btn_up.css({display:'block'});
			btn_down.css({display:'block'});
		});
		
		element.bind('blur.num', function(event){
			if( event.currentTarget == btn_up || event.currentTarget == btn_down || active ) return true;
			active = false;
			btn_up.hide();
			btn_down.hide();
			return true;
		});
		
		
	};
	
	jQuery.fn.numberinput = function( options ){
		
		this.each(function(){
			var self = jQuery(this),
				instance = self.data('NumberInput');
				
			if( !self.attr('type') == 'number' ) return true;
			if( jQuery.type(instance) != 'undefined' ) return instance;
			self.data('NumberInput', new NumberInput( jQuery(self), options ) );
			return true;
			
		});
		
	};
	
	
	// On ready, determine native form support.
	
	jQuery( function(){
		var tester = jQuery(document.createElement('input'));
		tester.css({ visibility:'hidden' })
			.attr('id', '__test_input_field')
			.appendTo(jQuery('body'));
		
		jQuery.each(inputs, function(i, key) {
			motr.forms.support[key] = has_native(key);
		});
		
		jQuery('#__test_input_field').remove();	
			
		jQuery.each(motr.forms.enable, function(i, ele){
			if( jQuery.isFunction(jQuery.fn[ele + "input"]) ){
				jQuery(":"+ele)[ele + "input"]();
			}
		});
		
	});
	

})(jQuery);