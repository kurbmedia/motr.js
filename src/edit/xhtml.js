var XHTMLParser = (function(){
	
	var XHTMLParser,
	tagInline = ["a", "abbr", "acronym", "address", "b", "big", "br", "button", "caption", "cite", "code", "del", "em", "font", "hr", "i", "input", "img", "ins", "label", "legend", "map", "q",
        		"samp", "select", "small", "span", "strong", "sub", "sup","tt", "var"],

	tagDisallowNest 	= ["h1", "h2", "h3", "h4", "h5", "h6", "p", "th", "td"],
	tagAllowEmpty 		= ["th", "td"],
	tagRequiredParent 	= [ null, "li", ["ul", "ol"], "dt", ["dl"], "dd", ["dl"], "td", ["tr"], "th", ["tr"], "tr", ["table", "thead", "tbody", "tfoot"], "thead", ["table"],
        				  "tbody", ["table"], "tfoot", ["table"] ],

	tagProtect 			= ["script", "style", "pre", "code"],
	
    // tags which self close e.g. <br />
    tagSelfClosing 		= ["br", "hr", "img", "link", "meta"],
    // tags which do not close
	tagNonClosing = ["!doctype", "?xml"],
    // attributes allowed on tags
	tagAttributes = [ ["class"],
            "?xml", [],
            "!doctype", [],
            "a", ["accesskey", "class", "href", "name", "title", "rel", "rev", "type", "tabindex"],
            "abbr", ["class", "title"],
            "acronym", ["class", "title"],
            "blockquote", ["cite", "class"],
            "button", ["class", "disabled", "name", "type", "value"],
            "del", ["cite", "class", "datetime"],
            "form", ["accept", "action", "class", "enctype", "method", "name"],
            "input", ["accept", "accesskey", "alt", "checked", "class", "disabled", "ismap", "maxlength", "name", "size", "readonly", "src", "tabindex", "type", "usemap", "value"],
            "img", ["alt", "class", "height", "src", "width"],
            "ins", ["cite", "class", "datetime"]
            // "label", ["accesskey", "class", "for"],
            // "legend", ["accesskey", "class"],
            // "link", ["href", "rel", "type"],
            // "meta", ["content", "http-equiv", "name", "scheme"],
            // "map", ["name"],
            // "optgroup", ["class", "disabled", "label"],
            // "option", ["class", "disabled", "label", "selected", "value"],
            // "q", ["class", "cite"],
            // "script", ["src", "type"],
            // "select", ["class", "disabled", "multiple", "name", "size", "tabindex"],
            // "style", ["type"],
            // "table", ["class", "summary"],
            // "th", ["class", "colspan", "rowspan"],
            // "td", ["class", "colspan", "rowspan"],
            // "textarea", ["accesskey", "class", "cols", "disabled", "name", "readonly", "rows", "tabindex"]
        ],
	
	tagAttributesRequired = [[], "img", ["alt"]],    
	// white space chars
	whitespace = ["Â ", " ", "\t", "\n", "\r", "\f"];
	
	
	XHTMLParser = function(){
		var self = this;
		
		jQuery.extend(self,{
			whitelist: [],
			blacklist: [],
			classlist: []
		});
		
		this.clean = function( html ){
			var tags_reg  = /<(\/)?(\w+:)?([\w]+)([^>]*)>/gi,
				attrs_reg = /(\w+)=(".*?"|'.*?'|[^\s>]*)/gi,
				tagMatch,
				attrMatch,
				lastIndex,
				options,
				text,
				add,
				renderParent,
				i,
				tag,
				element,
				root 	  = new Element(),
				stack	  = [root],
				container = root,
				protect   = false;
				
			options = {};
			options.replace = [ [["b", "big"], "strong"], [["i"], "em"] ];
			
			// styles to replace with tags, multiple style matches supported, inline tags are replaced by the first match blocks are retained
		    options.replaceStyles = [
	            [ new RegExp(/font-weight:\s*bold/i), "strong"],
	            [ new RegExp(/font-style:\s*italic/i), "em"],
	            [ new RegExp(/vertical-align:\s*super/i), "sup"],
	            [ new RegExp(/vertical-align:\s*sub/i), "sub"]
	        ];

			// ensure last element/text is found
	        html = html.concat("<xxx>");
	        while( tagMatch = tags_reg.exec( html )){
		
				tag = new Tag( tagMatch[3], tagMatch[1], tagMatch[4], options );

	            // add the text
				text = html.substring( lastIndex, tagMatch.index );
				
	            if( text.length > 0 ) {
					child = container.children[container.children.length - 1];					
	                if (container.children.length > 0 && is_text(child = container.children[container.children.length - 1]))
						container.children[container.children.length - 1] = child.concat(text);
					else container.children.push(text);
	            }
	
	            lastIndex = tags_reg.lastIndex;

	            if( tag.isClosing ) {
		
	                // find matching container
	                if( pop( stack, [tag.name] ) ){
	                    stack.pop();
	                    container = stack[stack.length - 1];
	                }
	
	            }else{
	                
					// create a new element
					element = new Element(tag);

	                // add attributes
	                while( attrMatch = attrs_reg.exec(tag.rawAttributes) ) {
	                    // check style attribute and do replacements
	                    if( attrMatch[1].toLowerCase() == "style" ){
							renderParent = !tag.isInline;
	                        
							for( i = 0; i < options.replaceStyles.length; i++ ){
	                            if( options.replaceStyles[i][0].test(attrMatch[2]) ){
	                                if (!renderParent){
	                                    tag.render = false;
	                                    renderParent = true;
	                                }

	                                container.children.push(element); // assumes not replaced
	                                stack.push(element);
	                                container = element; // assumes replacement is a container
	                                // create new tag and element
	                                tag 	= new Tag( options.replaceStyles[i][1], "", "", options );
	                                element = new Element(tag);
	                            }
	                        }
	                    }

	                    if( tag.allowedAttributes != null && (tag.allowedAttributes.length == 0 || in_array(attrMatch[1], tag.allowedAttributes)))
							element.attributes.push(new Attribute(attrMatch[1], attrMatch[2]));
	                }
	
	                // add required empty ones
	                jQuery.each( tag.requiredAttributes, function(){
	                    	var name = this.toString();
	                    	if( !element.hasAttribute(name) ) element.attributes.push(new Attribute(name, ""));
	                });

	                // check for replacements
	                for( var repIndex = 0; repIndex < options.replace.length; repIndex++ ) {
	                    for( var tagIndex = 0; tagIndex < options.replace[repIndex][0].length; tagIndex++ ){
	                        var byName = jQuery.type( options.replace[repIndex][0][tagIndex] ) == "string";
	                        
							if( (byName && options.replace[repIndex][0][tagIndex] == tag.name) || (!byName && options.replace[repIndex][0][tagIndex].test(tagMatch) ) ) {
	                            // don't render this tag
	                            tag.render = false;
	                            container.children.push(element);
	                            stack.push(element);
	                            container = element;

	                            // render new tag, keep attributes
	                            tag = new Tag(options.replace[repIndex][1], tagMatch[1], tagMatch[4], options);
	                            element = new Element(tag);
	                            element.attributes = container.attributes;

	                            repIndex = options.replace.length; // break out of both loops
	                            break;
	                        }
	                    }
	                }

	                // check container rules
	                add = true;
	                if( !container.isRoot ) {
	                    if( container.tag.isInline && !tag.isInline ) add = false;
						else if( container.tag.disallowNest && tag.disallowNest && !tag.requiredParent ) add = false;
	                    else if( tag.requiredParent ){
	                        if( add = pop(stack, tag.requiredParent) ) container = stack[stack.length - 1];
	                    }
	                }

	                if( add ){
						container.children.push(element);
						if( tag.toProtect ){
	                        // skip to closing tag
							while( tagMatch2 = tags_reg.exec(html) ) {
	                            var tag2 = new Tag(tagMatch2[3], tagMatch2[1], tagMatch2[4], options);
	                            if( tag2.isClosing && tag2.name == tag.name ){
	                                element.children.push(RegExp.leftContext.substring(lastIndex));
	                                lastIndex = tags_reg.lastIndex;
	                                break;
	                            }
	                        }
	                    }else{
							// set as current container element
							if( !tag.isSelfClosing && !tag.isNonClosing ){
								stack.push(element);
								container = element;
	                        }
	                    }
	                }
	            }
	        }

	        // render doc
	        return render(root, options).join("");
		};
		
	};
	
	
	function applyFormat(element, options, output, indent) {
		var i;
	    if (!element.tag.isInline && output.length > 0) {
	        output.push("\n");
	        for (i = 0; i < indent; i++) output.push("\t");
	    }
	}
	
	function should_render( element ){
		return ( in_array( element.tag.name, XHTMLParser.whitelist ) && !in_array( element.tag.name, XHTMLParser.blacklist ) );
	}
	
	function in_array( item, array ){
		return (jQuery.inArray( item, array ) > -1);
	}
	
	// trim off white space, doesn't use regex
    function trim( text ) {
        return trimStart(trimEnd(text));
    }
    function trimStart( text ) {
        return text.substring(trimStartIndex(text));
    }

    function trimStartIndex( text ){
        for (var start = 0; start < text.length - 1 && is_white(text.charAt(start)); start++);
        return start;
    }

 	function trimEnd( text ) {
        return text.substring(0, trimEndIndex(text));
    }

	function trimEndIndex( text ){
        for (var end = text.length - 1; end >= 0 && is_white(text.charAt(end)); end--);
        return end + 1;
    }

	function starts_with_white(item) {
        while (is_element(item) && item.children.length > 0) { item = item.children[0]; }
        return is_text(item) && item.length > 0 && is_white(item.charAt(0));
    }
    function ends_with_white(item) {
        while ( is_element(item) && item.children.length > 0) { item = item.children[item.children.length - 1]; }
        return is_text(item) && item.length > 0 && is_white(item.charAt(item.length - 1));
    }
    function is_text(item) { return item.constructor == String; }
    function is_inline(item) { return is_text(item) || item.tag.isInline; }
    function is_element(item) { return item.constructor == Element; }
    function text_clean(text) {
        return text
            .replace(/&nbsp;|\n/g, " ")
            .replace(/\s\s+/g, " ");
    }

    // checks a char is white space or not
    function is_white(c){ return in_array(c, whitespace); }
	
	function render(element, options) {

		var output = [], 
			empty 	   = element.attributes.length == 0, 
			openingTag = this.name.concat(element.tag.rawAttributes == undefined ? "" : element.tag.rawAttributes),
			matcher,
			value,
			i,
			child,
			text,
			outputChildren,
			renders = should_render( element ),
			quot;
	
		if( !element.isRot && renders ){
			output.push("<");
	        output.push(element.tag.name);
	
			jQuery.each( element.attributes, function(){
	            if( !in_array(this.name, options.removeAttrs) ) {
					matcher = RegExp(/^(['"]?)(.*?)['"]?$/).exec(this.value);
	                value 	= matcher[2];
	                quot 	= matcher[1] || "'";

	                // check for classes allowed
	                if (this.name == "class") {
	                    value = jQuery.grep( value.split(" "), function(c){
	                            return jQuery.grep(XHTMLParser.classlist, function(a){
	                                return a[0] == c && (a.length == 1 || in_array(element.tag.name, a[1]));
	                            }).length > 0;
	                        }).join(" ");
	                    
							quot = "'";
	                }
	
	                if( value != null && ( value.length > 0 || in_array( this.name, element.tag.requiredAttributes )) ){
	                    output.push(" ");
	                    output.push(this.name);
	                    output.push("=");
	                    output.push(quot);
	                    output.push(value);
	                    output.push(quot);
	                }
	            }
	
				return true;
				
	        });
		}
		
		if( element.tag.isSelfClosing ){
			// self closing 
	        if(renders) output.push(" />");
			empty = false;
			
	    }else if( element.tag.isNonClosing ) empty = false;
	    
		else {
			
			if( !element.isRoot && renders ) output.push(">");	        
			// render children
	        if( element.tag.toProtect ){
	            outputChildren = trim(element.children.join("")).replace(/<br>/ig, "\n");
	            output.push(outputChildren);
	            empty = outputChildren.length == 0;
	        }else{
	            outputChildren = [];
	
	            for( i = 0; i < element.children.length; i++ ){
					child = element.children[i];
					text  = trim( text_clean( is_text(child) ? child : child.childrenToString() ) );

	                if( is_inline( child ) ){
	                    if( i > 0 && text.length > 0 && ( starts_with_white( child ) || ends_with_white( element.children[i - 1] ) ) ) outputChildren.push(" ");
	                }
	                if (is_text(child)) {
	                    if( text.length > 0 ) outputChildren.push(text);
	                } else {
	                    // don't allow a break to be the last child
						if( i != element.children.length - 1 || child.tag.name != "br" ) outputChildren = outputChildren.concat( render(child, options) );
	                }
	            }

	            if( outputChildren.length > 0 ) {
	                output = output.concat(outputChildren);
	                empty = false;
	            }
	        }

	        if( !element.isRoot && renders ){
	            // render the closing tag
	            output.push("</");
	            output.push(element.tag.name);
	            output.push(">");
	        }
	    }

	    // check for empty tags
	    if( !element.tag.allowEmpty && empty ) { return []; }
	    return output;
	}
	
	// find a matching tag, and pop to it, if not do nothing
    function pop(stack, tag_names, index) {
        index = index || 1;
        if( in_array( stack[stack.length - index].tag.name, tag_names)) return true;

		if( stack.length - (index + 1) > 0 && pop(stack, tag_names, index + 1)){
            stack.pop();
            return true;
        }
        return false;
    }
	
	// Element Object
    function Element(tag) {
        if (tag) {
            this.tag = tag;
            this.isRoot = false;
        } else {
            this.tag = new Tag("root");
            this.isRoot = true;
        }
        this.attributes = [];
        this.children = [];

        this.hasAttribute = function (name) {
            for (var i = 0; i < this.attributes.length; i++) {
                if (this.attributes[i].name == name) return true;
            }
            return false;
        };

        this.childrenToString = function () {
            return this.children.join("");
        };

        return this;
    }

    // Attribute Object
    function Attribute(name, value) {
        this.name = name;
        this.value = value;

        return this;
    }

    // Tag object
    function Tag(name, close, rawAttributes, options) {
        this.name = name.toLowerCase();

        this.isSelfClosing = in_array( this.name, tagSelfClosing );
        this.isNonClosing = in_array( this.name, tagNonClosing );
        this.isClosing = (close != undefined && close.length > 0);

        this.isInline = in_array( this.name, tagInline );
        this.disallowNest = in_array( this.name, tagDisallowNest );
        this.requiredParent = tagRequiredParent[ jQuery.inArray( this.name, tagRequiredParent ) + 1];
        this.allowEmpty = in_array(this.name, tagAllowEmpty);

        this.toProtect = in_array(this.name, tagProtect);

        this.rawAttributes = rawAttributes;
        this.allowedAttributes = tagAttributes[ jQuery.inArray(this.name, tagAttributes) + 1 ];
        this.requiredAttributes = tagAttributesRequired[ jQuery.inArray( this.name, tagAttributesRequired ) + 1 ];

        this.render = options && jQuery.inArray(this.name, options.notRenderedTags) == -1;
        return this;
    }
	
	XHTMLParser = new XHTMLParser();
	return XHTMLParser;
	
	
})();