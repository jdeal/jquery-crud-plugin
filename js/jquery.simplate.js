(function( $ ){

	var templateElements = {};
	var templateTypes = [];

	function addTemplate(templateList,templateElement){
		var index = 0;
		var condition = templateElement.attr("template-type-if") || "";
		condition = condition.trim();
		for (var i = 0; i < templateList.length; i++){
			var item = templateList[i];
			if (item.condition === condition){
				item.templates.push(templateElement);
				return;
			}
		}
		templateList.push({condition:condition,templates:[templateElement]});
	}

	var methods = {
		init: function(options){
			this.hide();
			templateElements = this.data("templateElements") || {}
			this.find('[template-type]').each(function(){
				var self = this;
				$( $(self).attr("template-type").split(/ +/) ).each(function(i,type){
					if (!(type in templateElements)){
						templateElements[type] = [];
						templateTypes.push(type);
						$.simplate.hasTemplates = true;
					}
					if (!$(self).hasClass("template-remove")){
						//templateElements[type].push($(self));
						addTemplate(templateElements[type],$(self));
					}
				})
				$(this).remove();
			});
			this.html("");
			this.data("templateElements",templateElements);
			return this;
		},
		tag: function(name){
			var tags = this.data("tags");
			if (typeof(tags) === 'object' && name in tags){
				var tagElement = tags[name];
				return tagElement;
			}
			return $([]);
		}
	}
	
	var contentFunctions = {
		"default": {
			init: function(contentType){
				this.jqueryHtml = this.html;
				this.html = contentFunctions["default"].html;
				this.jqueryAppend = this.append;
				this.append = contentFunctions["default"].append;
				this.myAppend = contentFunctions[contentType].append;
				contentFunctions[contentType].init.apply(this);
				this.data("contentElements",[]);
				this.data("contentType",contentType);
			},
			html: function(elements){
				if (typeof(elements)==='undefined'){
					var htmlParts = []
					$(this.data("contentElements")).each(function(i,element){
						htmlParts.push(element.html());
					});
					return htmlParts.join('');
				} else {
					$(this.data("contentElements")).each(function(i,element){
						element.remove();
					});
					this.data("contentElements",[]);
					this.reset();
					this.append(elements);
				}
			},
			append: function(elements){
				var content = $(elements)
				this.data("contentElements").push(content);
				this.myAppend(content);
			}
		},
		prepend: {
			init: function(){
				this.data("originalContent",this.children(":first"));
			},
			append: function(content){
				if (this.data("originalContent") && this.data("originalContent").length > 0){
					this.data("originalContent").before(content);
				} else {
					this.jqueryAppend(content);
				}
			},
			reset: function(){}
		},
		append: {
			init: function(){
			},
			append: function(content){
				this.jqueryAppend(content);
			},
			reset: function(){}
		},
		before: {
			init: function(){
			},
			append: function(content){
				this.before(content);
			},
			reset: function(){}
		},
		after: {
			init: function(){
				this.data("prevContent",this);
			},
			append: function(content){
				this.data("prevContent").after(content);
				this.data("prevContent",content);
			},
			reset: function(){
				this.data("prevContent",this);
			}
		}
	}

	// Break apart an element into templates. Store templates in map.
	$.fn.simplate = function(method){
		if (arguments.length === 0){
			return methods.init.apply(this,[]);
		} else if (method === 'content' || method.startsWith("content-")){
			var args = Array.prototype.slice.call(arguments,1);
			args.unshift("template-" + method);
			return methods.content.apply(this, args);
		} else if (method in methods){
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if (typeof method === 'object') {
			return methods.init.apply(this,arguments);
		} else {
			$.error( 'Helper method ' +	method + ' does not exist on jQuery.simplate' );
		}
	}
	
	function evalExpression(expression,options,returnBoolean){
		try {
			var result = eval(expression);
			if (returnBoolean){
				return result ? true : false;
			}
			return result;
		} catch (e) {
			console.log("Problem evaluating expression:\n" + expression);
			if (typeof this.attr === 'function'){
				this.attr("template-eval-error","Problem evaluationg expression.");
			}
			if (returnBoolean){
				return false;
			}
		}
	}
	
	//  If map has a template for this type, return a clone of it.
	$.simplate = function(type,options){
		if ($.type(type) === 'array'){
			var types = type;
			$(types).each(function(i,type){
				var template = $.simplate(type,options);
				if (template){
					return template;
				}
			});
		} else {
			if (typeof options === 'undefined'){
				options = {};
			}
			if (type in templateElements){
				var element = null;
				var templateDefList = templateElements[type];
				// choose template list based on condition
				var dataIndex = 0;
				if ('index' in options){
					// translate from 1-indexing, per css, back to 0-index
					dataIndex = options.index - 1;
				}
				for (var i = 0; i < templateDefList.length; i++){
					var templateDef = templateDefList[i];
					var templateList = templateDef.templates;
					var templateIndex = dataIndex % templateList.length;
					var template = templateList[templateIndex];
					var condition = templateDef.condition;
					if (condition === ''){
						element = template.clone();
						break;
					}
					var result = evalExpression.apply(template,[condition,options,true]);
					// give up if there are errors; otherwise quit if condition passes
					if (typeof result === 'undefined' || result){
						element = template.clone();
						break;
					}
				}
				
				if (!element){
					return null;
				}

				// prepare tags
				tags = {};
				element.findAndFilter("[template-tag]").each(function(i,tagElement){
					var obj = $(tagElement);
					var tagNames = obj.attr("template-tag");
					$(tagNames.split(/ +/)).each(function(i,tagName){
						tags[tagName] = obj;
					});
					if (obj.attr("template-content")){
						var contentType = obj.attr("template-content");
						if (contentType in contentFunctions){
							contentFunctions["default"].init.call(obj,contentType);
						}
					}
				});
				if (!('content' in tags)){
					innerElement = element;
					while ((next = innerElement.children(':first')).length > 0){
						innerElement = next;
					}
					tags['content'] = $(innerElement);
					var obj = tags['content']
					if (obj.attr("template-content")){
						var contentType = obj.attr("template-content");
						if (contentType in contentFunctions){
							contentFunctions["default"].init.call(obj,contentType);
						}
					}
				}
				element.data("tags",tags);
				
				/*
				element.find("[class|=if]").each(function(){
					
				})
				*/
				element.findAndFilter("[template-eval]").each(function(){
					var obj = $(this);
					evalExpression.apply(obj,[obj.attr("template-eval"),options]);
				});
				return element;
			}
		}
		return null;
	}
	
	$.simplate.hasTemplates = false;

})( jQuery );