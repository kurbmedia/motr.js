(function( jQuery ){
	
	var motr = window.motr,
		commands;
	
	commands = motr.edit.commands || {};
	commands.italic		= 'italic';
	commands.underline 	= 'underline';
	commands.unlink 	= 'Unlink';	
	
	function closest(tag, node) {
		return jQuery(node).closest(tag);	
	}
	
	commands.bold = function(){
		document.execCommand('bold', false, null);
	};	
	
	commands.link = function(){
		var node = this.selection.parentNode,
			href,
			current  = null,
			existing = closest('a', node);
			
		if( existing.length > 0 ) current = jQuery(existing).eq(0).attr('href');		
		href = prompt('Where does this link to?', current);
		
		if( (href == null && current == null ) || ( jQuery.trim(href) == '' && current != null ) ){
			document.execCommand('Unlink', false, null);
			return true;
		}		
		document.execCommand('CreateLink', false, href);		
		return true;
	};
	
	commands.image = function( src ){
		document.execCommand('InsertImage', false, src);
	};
 	
	commands.orderedList = function(){
		document.execCommand('InsertOrderedList', false, null);
	};
	commands.unorderedList = function(){
		document.execCommand('InsertUnorderedList', false, null);
	};
	
	commands.undo = function(){
		document.execCommand('undo', '', null);
	};
	
	commands.redo = function(){
		document.execCommand('redo', '', null);
	};
	
	commands.cut = function(){
		document.execCommand('cut', '', null);
	};
	
	motr.edit.commands = commands;

})(jQuery);