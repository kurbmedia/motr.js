(function(jQuery, undefined){
	
	var motr = window.motr,
		valid_expr   	= ':input:not(:disabled,[readonly]):not([type="hidden"],:button,:reset,:submit)',
		html5_inputs 	= [ 'email', 'url', 'number', 'range', 'date' ],
		ValidityState,
		validity_states = [
			'valueMissing',
			'typeMismatch',
			'patternMismatch',
			'tooLong',			
			'rangeUnderflow',
			'rangeOverflow',
			'stepMismatch',						
			'customError',
			'unavailable'
		],
		patterns = {
			email: /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
			number: /^-?[0-9]*(\.[0-9]+)?$/,
			url: /^(https?:\/\/)?[\da-z\.\-]+\.[a-z\.]{2,6}[#&+_\?\/\w \.\-=]*$/i
		},
		fn;
	
	motr.validity   = {};
		
	motr.setup('validity', {
		events: ['submit', 'blur']		
	});
	
	motr.validity.errors = {
		typeMismatch: function( element ){
			return 'invalid ' + element.attr('type');
		},		
		rangeUnderflow: function( elem ) {
			return 'must be greater than ' + element.attr('min');
		},
		rangeOverflow: function(elem) {
			return 'must be less than ' + $(elem).attr('max');
		},
		stepMismatch: 'invalid value',
		tooLong: function( element ) {
			return 'must be less than ' + element.attr('maxlength') + ' characters';
		},
		patternMismatch: function( element ){
			return 'invalid value';
		},
		valueMissing: 'this field is required',
		customError: function( element ) {
			return 'invalid value';
		},
		unavailable: function( element ){
			return 'this ' + element.attr('name') + 'is not available';
		}
	};
	
	motr.validity.fn = fn = {};
	
	fn.type = function( element ){
		if( jQuery.isFunction( fn[element.attr('type')] ) )
			return fn[element.attr('type')]( element );
		return true;
	};
	
	fn.email = function( element ){
		return patterns.email.test( element.val() );
	};
	
	fn.number = function( element ){
		return patterns.number.test( element.val() );
	};
	
	fn.url = function( element ){
		return patterns.url.test( element.val() );
	};
	
	fn.min = function( element ){
		if( jQuery.type( element.attr('min') ) == 'undefined' ) return true;
		return ( parseFloat( element.val() ) >= parseFloat( element.attr("min") ) );
	};
	
	fn.max = function( element ){
		if( jQuery.type( element.attr('max') ) == 'undefined' ) return true;
		return ( parseFloat( element.val() ) <= parseFloat( element.attr("max") ) );
	};
	
	fn.length = function( element ){
		var maxlen = element.attr('maxlength');	
		if( maxlen && (maxlen > 0) ) return ( maxlen >= element.val().length );
		return true;
	};
	
	fn.pattern = function( element ){
		var pattern = element.attr('pattern'),
			value   = element.val(),
			expr;
			
		if( (pattern || (pattern == 0)) && (value != '') ){
			expr = new RegExp('^(?:' + pattern + ')$');
			return expr.test(value);
		}
		
		return true;
	};
	
	fn.required = function( element ){
		
		if( element.is(":required")){
			if( element.is(":checkbox") ) return element.is(":checked");
			return !!element.val();
		}
		return true;
	};
	
	fn.unavailable = function( element ){
		
	};
	
	function should_validate( element ){
		return jQuery(element).is(valid_expr);
	}
	
	// Loop through the validity states in order of priority,
	// setting the first valid message.
	
	function trigger_error( element, errors ){
		var message = "invalid element", i,
			options = element.data('validation'),
			node    = element.get(0),
			current;			
		for( i = 0; i < validity_states.length; i++ ){
			if( element.validity()[validity_states[i]] == true ){
				current = motr.validity.errors[validity_states[i]];
				message = jQuery.isFunction(current) ? current( element ) : current;
				break;
			}
		}				
		if( node.checkValidity ){
			node.setCustomValidity(message);
		}else{
			node.validationMessage = message;			
		}
		
		element.trigger('invalid');
	}
	
	function clear_error( element ){
		var node = element.get(0);
		
		if( node.checkValidity ){
			node.setCustomValidity('');
		}else{
			node.validationMessage = undefined;
		}
		element.trigger('valid');
	}

	ValidityState = function( element ){
		
		var self	= this,
			options = element.data('validation'),
			states  = validity_states,
			i, valid = true;
			
		options = jQuery.extend({}, options, motr.config.validity);
		
		jQuery.extend( self, {
			typeMismatch: !motr.validity.fn.type( element ),
			rangeUnderflow: !motr.validity.fn.min( element ),
			rangeOverflow: !motr.validity.fn.max( element ),
			stepMismatch: false,
			tooLong: !motr.validity.fn.length( element ),
			patternMismatch: !motr.validity.fn.pattern( element ),
			valueMissing: !motr.validity.fn.required( element ),
			customError: false,
			unavailable: false
		});
		
		for( i = 0; i < states.length; i++ ){
			if( self[states[i]] === true ){
				valid = false;
				break;
			}
		}
		
		jQuery.extend(self, {valid: valid });
		return self;
		
	};

	
	jQuery.fn.validate = function( options ){
		
		this.each(function(){
			var self = jQuery(this),
				conf = self.data('validation') || motr.config.validity;
				
			// Only target input elements
			if( self.not(':input') || should_validate( self ) ){
				
				self.data('validation', conf);
				self.unbind('.validate');
				
				jQuery.each(conf.events, function(i, evt){
					var evt_name;
					if( evt == 'submit' ) return true;
					evt_name = evt + ".validate";

					if( conf[evt] && jQuery.isFunction( conf[evt] ) ) self.bind(evt_name, conf[evt]);
					else self.bind(evt_name, function(event){ self.checkValidity(); });
					return true;
				});
			}			
			
			return true;
		});
		
		return this;
	};
	
	jQuery.fn.validity = function(){
		var self, instance;

		if( this.length ) self = jQuery(this).eq(0);
		else self = jQuery(this);
		
		instance = self.data('validity');
		if( instance ) return instance;

		// Only target input elements 
		if( self.is(":input") && should_validate( self ) ){
			instance = new ValidityState( jQuery(self) );
			self.data('validity', instance);
			return instance;
		}
		
		return this;			
	};
	
	jQuery.fn.checkValidity = function(){		
		
		var self,
			valid = true;
		
		if( this.length ) self = jQuery(this).eq(0);
		else self = jQuery(this);
	
		if( self.is('form') ){
			jQuery(valid_expr, self).each(function() {
				valid = jQuery(this).checkValidity() && valid;
			});
			
			if( !valid ) jQuery(':invalid:eq(0)', self)[0].focus();
			return valid;
		
		}else{
			// Remove an existing ValidityState
			self.removeData('validity');
			
			// Update ValidityState and capture valid value.
			valid = self.validity().valid;
			conf  = self.data('validation');
			if( !valid ) trigger_error(self);
			else clear_error( self );
			return valid;
		}
	};
	
	
	jQuery.extend(jQuery.expr[':'], { 		
		valid: function(el){ return jQuery(el).validity().valid;  },
		invalid: function(el){ return !jQuery(el).validity().valid;  },
		required: function( el ){
			var self = jQuery(el);
			if( jQuery.type( self.attr('required') ) === 'undefined' || self.attr('required').toString() === 'false' ) return false;
			return true;
		}
	});
	
	jQuery(function(){		
		jQuery('form:not([novalidate])')
			.submit(function(event){
				return jQuery(this).checkValidity();
			})
			.attr('novalidate', 'true');

		jQuery(valid_expr).validate();
		
	});

})(jQuery);
