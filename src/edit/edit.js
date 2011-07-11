(function( jQuery ){
	
	var motr = window.motr, Editor, cleanup, sanitizer;
	
	motr.edit = motr.edit || {};
	motr.edit.commands = {};
	
	motr.setup('edit', {
		shortcuts:{
			'bold': ['control', 66],
			'underline': ['control', 85],
			'italic': ['control', 73],
			'undo': ['control', 90],
			'paste': ['control', 86],
			'undo': ['control', 90],
			'cut': ['control', 88]
		}
	});
	
	XHTMLParser.whitelist = ['a', 'blockquote', 'br', 'cite', 'em', 'i', 'li', 'ol', 'p', 'strike', 'strong', 'sub', 'sup', 'u', 'ul'];
	XHTMLParser.blacklist = ["basefont", "center", "dir", "font", "frame", "frameset", "iframe", "isindex", "menu", "noframes", "s", "strike", "script", "input", "form"];
	
	function semantify( element ) {
		var html = element.html();
		html = html.replace(/<i>/g, '<em>')
			.replace(/<\/i>/g, '</em>')
			.replace(/<b>/g, '<strong>')
			.replace(/<\/b>/g, '</strong>')
			.replace(/\\t/, '')
			.replace(/<br>/g, '<br />');
			
		if( jQuery.browser.msie && jQuery.browser.version >= 8 ){
			html = html.replace(/<div>/g, '<p>')
				.replace(/<\/div>/g, '</p>');
		}
		
		element.html( html );
		element.contents().each(function(){
			var node = this;
			switch( this.nodeName ){
				case '#text': // Fix unwrapped text
					if( jQuery.trim(this.text) != "" ) jQuery(node).wrap('<p></p>');
				break;
				case 'BR':
					jQuery(node).remove(); // Remove stray line breaks
				break;
				case 'DIV':
					jQuery(node.children()).unwrap(); // Remove wrapping divs
				break;				
			}
		});
    }

	function sanitize( element ){
		element.find("[style]").each(function(){
			jQuery(this).attr('style');
		});
		
		element.find("script, :input, form").each(function(){
			jQuery(this).remove();
		});
		
		return element;
	}
	
	function save_selection( element, selection ) {
		var index = 0, 
			start = 0, 
			end   = 0, 
			found = false, 
			stop  = {},
			sel   = (selection || rangy.getSelection()),
			range;

	    function traverse(node, range) {
	        var i, len;
	
			if( node.nodeType == 3 ){
				if( !found && node == sel.anchorNode ){
					start = index + sel.anchorOffset;
	                found = true;
	            }
				if( found && node == sel.focusNode ){
					end = index + sel.focusOffset;
	                throw stop;
	            }
	            
				index += node.length;
				
	        }else{
				for( i = 0, len = node.childNodes.length; i < len; ++i) 
					traverse( node.childNodes[i], range );
	        }
	    }

	    if( sel.rangeCount ){
			try{ traverse( element, sel.getRangeAt(0) ); }
			catch (ex){
	            if (ex != stop){ throw ex; }
	        }
	    }

	    return { start: start, end: end, anchorNode: sel.anchorNode, parentNode: sel.anchorNode.parentNode };
	}

	function restore_selection( element, stored_selection) {
		var index = 0, 
			found = false, 
			stop  = {},
			range = rangy.createRange();

	    function traverse(node) {
			var i, len, next_index;
		
	        if( node.nodeType == 3 ){
	            next_index = index + node.length;
	
	            if( !found && stored_selection.start >= index && stored_selection.start <= next_index){
					range.setStart( node, stored_selection.start - index );
	                found = true;
	            }
	            if( found && stored_selection.end >= index && stored_selection.end <= next_index) {
					range.setEnd( node, stored_selection.end - index );
	                throw stop;
	            }
	            
				index = next_index;
				
	        }else{
				for( i = 0, len = node.childNodes.length; i < len; ++i )
					traverse( node.childNodes[i] );
	        }
	    }

	    try{ traverse( element ); }
		catch (ex) {
	        if( ex == stop ) rangy.getSelection().setSingleRange(range);
	    }
	}
	
	function is_type(obj, type){
		return jQuery.type( obj ) === type;
	}
	
	function is_func( obj ){
		return jQuery.isFunction( obj );
	}
	
	
	Editor = function( element, options ){
		
		var self   		= this,
			mode   		= ( element.is("div") ? 'block' : 'inline'),
			active 		= false,
			node   		= self.node = element.get(0),
			config 		= motr.config.edit,
			commands	= motr.edit.commands,
			undo_stack  = new Array();
			
		if( is_type(options, 'object') ){
			config = jQuery.extend({}, options, config);
		}

		jQuery.extend(self, {
			
			api: function(){
				return self;
			},
			
			exec: function( command, args ){				
				var cmd, sel, update;
				element.focus();	
							
				
				if( command === 'undo' ){
					undo_stack.pop();
					if( undo_stack.length > 0 ){
						element.html( undo_stack[undo_stack.length - 1] );
					}
				}else{
					if( is_func(command) ) command.apply( self, args );
					else if( is_func(commands[command]) ) commands[command].apply(self, args);
					else document.execCommand(command, false, (args || null));
					
					// Store current state.
					undo_stack.push(element.html());					
				}
								
				element.trigger('change.edit');
				restore_selection( node, this.selection );
				
				return true;
				
			},
			
			init: function(){
				if( active == true ) return true;
				element.trigger('beforeedit');
				element.attr('contenteditable', true)
					.attr('contentEditable', true)
					.addClass('editing');
				element.trigger('edit');
				active = true;
				undo_stack.push(element.html());
				return true;
			},
			
			range: {},
						
			save: function( target ){				
				if( target ) target = jQuery(target);
				semantify(element);
				sanitize( element );
				element.html( jQuery.trim( XHTMLParser.clean(element.html()) ) );
				element.trigger('change');
				
				// Optionally save the html into some sort of input.
				if( target && target.is(":input") ){
					target.val( element.html() );
				}
				return element.html();
				
			},
			
			selected: {},
			selection: {}			
		});
		
		function update_selected( attrs ){
			var selection, event, updates;
			
			selection = rangy.getSelection();	
			updates   = {};
			
			if( selection.rangeCount ){
				updates.text = selection.toString();
				updates.node = selection.anchorNode;
				updates.tag  = updates.node.nodeType == 3 ? updates.node.parentNode.nodeName : updates.node.nodeName;
				updates.tag  = updates.tag.toLowerCase();
				
				self.selection = save_selection( node, selection );
				self.range 	   = rangy.getSelection().getRangeAt(0);
				
				attrs = jQuery.extend(updates, attrs);
				event = jQuery.Event('selected', attrs);
				element.trigger( event );
			}
			
			self.selected = jQuery.extend(self.selected, attrs);
			return self.selected;
		}
		
		function process_shortcut( event ){
			var control = false,
				keyval = false,
				action;
				
			jQuery.each( config.shortcuts, 
				function( command, key ){
					var value;
					
					if( is_type(key, 'array') ){
						if( key[0].toLowerCase() == 'control' ) control = true;
						value = key[1];
					}else value = key;
					if( value == event.which ){
						keyval = value;
						action = command;
					}
			});
			
			if( control && !( event.ctrlKey || event.metaKey )) return true;
			if( keyval ){				
				event.preventDefault();
				self.exec( action );
				return false;
			}
			
			return true;
		}
		
		element.unbind('.edit');
		
		element
			.bind('change.edit', 
				function( event ){
					semantify( element );					
					return true;
			})
			.bind('paste.edit', 
				function(event){
					var clipevent = event.originalEvent,
						content, selection;
					event.preventDefault();
					
					if( mode == 'inline' ){
						event.preventDefault();
						return false;
					}
					
					if( clipevent.clipboardData ) content = clipevent.clipboardData.getData('text/html');
					else content = "";

					if( content ){
						if( jQuery(content).get(0) ){
							content = jQuery("<div></div>").html(content).text();
							self.range.insertNode( content );
						}else document.execCommand('insertHTML', false, content);
					}					
					return false;
			})			
			.bind('keypress.edit', 
				function(event){				
					// Cancel carriage returns on inline editors, and prevent backspace removing all content.				
					var len;

					if( mode == 'inline' && event.which === 13){
						event.preventDefault();
						event.stopPropagation();
						return false;
		        	}
		
		 			len = jQuery.trim( element.text() ).length;
		
		        	if( event.which == 8 &&  len == 0 ){
						event.preventDefault();
						event.stopPropagation();
						if( mode == 'block' && element.is(":empty") ) element.append("<p></p>");
						return false;
		        	}
		
					return true;
			})
			.bind('keydown.edit', process_shortcut)
			.bind('mouseup.edit blur.edit mouseout.edit', 
				function(event){	
					update_selected();
					return true;
				})
			.bind('mousedown.edit', 
				function(event){
					var attrs = { node: event.target, tag: event.target.nodeName.toLowerCase() };
					update_selected(attrs);
				});

		if( options && options.init && options.init == true ){
			self.init();
		}
		
	};
	
	jQuery.fn.edit = function( method ){
		
		var instance = jQuery(this).data('editor');
				
		this.each(function(){
			
			var self = jQuery(this),
				instance = self.data('editor');
				
			if( typeof instance == 'undefined' ){
				
				instance = new Editor( jQuery(self), method );
				self.data('editor', instance);
				return self;
				
			}else{
				
				if( instance[method] ) instance[method].apply(instance, Array.prototype.slice.call( arguments, 1) );
				else if( jQuery.type(method) == 'string') 
					instance.exec( method, Array.prototype.slice.call( arguments, 1) );			
				else instance.init( method );
				
			}
			
			return true;
		});
		
		return this;
		
	};
	
	jQuery.editor = jQuery.extend({}, Editor, jQuery.edit);
	
	jQuery("[contenteditable]")
		.live('focus', 
			function(event){
	    		var self = jQuery(this);
	    		self.data('original', self.html());
	    		return self;
			})
		.live('blur keyup paste', 
			function(event){				
				if( event.type == 'keyup' && event.which == 13 ) return true;
	    		var self = jQuery(this);
	    		if( self.data('original') !== self.html() ){
	        		self.data('original', self.html() );
	        		self.trigger('change');
				}
				return self;
	    });
	
	
})(jQuery);