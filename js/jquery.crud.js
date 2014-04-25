(function( $ ){
	
	var my = {
		elementId: 0,
		schemaMap: {},
		loadedSchemaMapUrls: {},
		configuration: {
			"default": {}
		}
	};
	
	// generates IDs if necessary for dynamic elements
	function nextId(){
		my.elementId = my.elementId + 1;
		return my.elementId;
	}
	
	function isBlank(value){
		if (typeof(value) === 'undefined' || value === '' || value === null){
			return true;
		}
		return false;
	}
	
	// get data directly from parameter value, or load from url represented by value
	function getData(urlOrData){
		var args = Array.prototype.slice.call(arguments,1,arguments.length - 1);
		var callback = arguments[arguments.length - 1];
		if (urlOrData === null || typeof urlOrData === 'undefined'){
			callback({});
		} else if (typeof urlOrData === 'object'){
			callback(urlOrData);
		} else {
			if (typeof urlOrData === 'function'){
				urlOrData = urlOrData.apply(this,args);
			}
			if (typeof urlOrData !== 'string'){
				callback(urlOrData);
			} else {
				$.ajax({
					url: urlOrData,
					dataType: 'json',
					success: function(data){
						callback(data);
					},
					error: function(xhr, status, error){
						$.error("Problem (" + status + ") fetching data from " + urlOrData + '.');
					}
				});
			}
		}
	}
	
	function loadSchemaMap(schemaMap,callback){
		if (typeof schemaMap === 'string' && schemaMap in my.loadedSchemaMapUrls){
			callback(my.schemaMap);
		}
		var schemas = my.schemaMap;
		if (typeof SchemaUtils !== 'undefined'){
			$.extend(schemas,SchemaUtils.schemas());
		}
		if ($.type(schemaMap) === 'object'){
			$.extend(schemas,schemaMap);
		}
		function finished(loadedSchemas){
			$.extend(schemas,loadedSchemas)
			SchemaUtils.schemas(schemas);
			my.schemaMap = schemas;
			callback(schemas);
		}
		if ($.type(schemaMap) === 'string'){
			getData(schemaMap,function(loadedSchemas){
				my.loadedSchemaMapUrls[schemaMap] = true;
				finished(loadedSchemas);
			});
		} else {
			finished(schemas);
		}
	}
	
	// get schema from option, from data, or from url
	function loadSchema(schema,schemaMap,data,callback){
		loadSchemaMap(schemaMap,function(schemas){
			if (schema === null || typeof schema === 'undefined'){
				callback(jsonToSchema(data));
			} else if (typeof schema === 'string' && schema in schemas){
				callback(schemas[schema]);
			} else {
				getData(schema,callback);
			}
		});
	}
	
	// get appropriate template or fallback to a tag
	function templateOrElement(type,options,name){
		if (typeof name === 'undefined'){
			name = 'div'
			if (typeof options == 'string'){
				name = options;
				options = {};
			}
		}
		if (typeof options === 'undefined'){
			options = {}
		}
		var template = $.simplate(type,options);
		if (template != null){
			return template;
		}
		console.log("No template found for type " + type + ".");
		return $('<' + name + ' class="no_template_found_for_' + type + '"/>');
	}
	
	var messageTypes = ['create-success','create-error','update-success','update-error'];
	
	function showMessage(options,messageType){
		var self = this;
		if (options.hasCustomTemplate){
			
		} else {
			var message = this.simplate("tag","message-" + messageType);
			if (message.length === 0){
				console.log("No message container found for message type " + messageType + ".");
			}
			$(messageTypes).each(function(i,thisMessageType){
				if (messageType !== thisMessageType){
					self.simplate("tag","message-" + thisMessageType).hide();
				}
			})
			if (message.length > 0){
				if (!message.is(":visible")){
					message.show();
				} else {
					message.animate({opacity:.25},250,function(){
						message.animate({opacity:1},250);
					});
				}
			}
		}
		if (typeof options.success === 'function'){
			if (messageType === 'create-success'){
				options.success('create');
			} else if (messageType === 'update-success'){
				options.success('update');
			}
		}
		if (typeof options.error === 'function'){
			if (messageType === 'create-error'){
				options.error('create');
			} else if (messageType === 'update-error'){
				options.error('update');
			}
		}
	}
	
	// create form and wire up save button
	function buildForm(options,mode,item){
		var self = this;
		loadSchema(options.schema,options.schemas,item,function(schema){
			$.dform.crudMode = mode;
			$.dform.crudOptions = options;
			var submitButton = null;
			var formContainer = null;
			if (options.hasCustomTemplate){
				if (self.children().length === 0){
					console.log("Custom form is empty.");
				}
				// TODO: fill in custom form with data
				submitButton = self.find("input[type=submit]");
				if (submitButton.length > 0){
					submitButton = $(submitButton[0]);
				} else {
					if (mode !== 'read'){
						console.log("No submit button found.");
					}
					submitButton = $('<input type="submit"></input>');
				}
				formContainer = self;
			} else {
				self.formElement({schema:schema,data:item,crudMode:mode},"jsonSchema");
				formContainer = $(self.children()[0])
				submitButton = formContainer.simplate("tag","button-submit");
			}
			var form = self.findAndFilter("form");
			if (form.length > 0){
				form = $(form[0]);
				$.dform.crudForm = form;
				if (mode === 'read'){
					submitButton.hide();
				} else {
					var inputButton = submitButton;
					inputButton.data('mode',mode);
					inputButton.data('prevData',item);
					(function(form,inputButton){
						var clickHandler = function(){
						
							inputButton.attr("disabled","disabled");
							
							var isValid = true;
							
							if (typeof form.validate === 'function'){
								var validator = form.validate();
								isValid = validator.form();
							}
							
							if (!isValid){
								inputButton.removeAttr("disabled");
								return false;
							}
							
							try {
						
								var url = ''
								var mode = inputButton.data('mode');
								var prevData = inputButton.data('prevData');
								var item = form.crud("toObject");
								var method = 'PUT';
								if (mode === 'create' && 'saveCreate' in options){
									url = valueForOption(options.saveCreate,item,[prevData]);
									method = 'POST';
								} else {
									url = valueForOption(options.saveUpdate,item,[prevData]);
								}
								var item = convertOutputData(options,item);
								if (typeof options.form === 'object'){
									var action = valueForOption(options.form.action);
									var method = valueForOption(options.form.method);
									$(form).attr("action",action);
									if (method != ""){
										$(form).attr("method",method);
									}
									inputButton.removeAttr("disabled");
									return true;
								} else if (typeof url === 'undefined' || url === null || url === ''){
									if (typeof options.submit !== 'undefined'){
										options.submit.apply(item);
										inputButton.removeAttr("disabled");
									} else {
										alert(JSON.stringify(item));
										inputButton.removeAttr("disabled");
									}
								} else {
									$.ajax({
										data: JSON.stringify(item),
										dataType: "json",
										contentType: "application/json; charset=utf-8",
										success: function(data){
											inputButton.data('prevData',item);
											inputButton.data('mode','update');
											inputButton.removeAttr("disabled");
											var messageType = (mode === 'create') ? 'create-success' : 'update-success'
											showMessage.call(formContainer,options,messageType);
										},
										error: function(xhr){
											//if (typeof xhr.responseText !== 'undefined'){
											//}
											var messageType = (mode === 'create') ? 'create-error' : 'update-error'
											showMessage.call(formContainer,options,messageType);
											inputButton.removeAttr("disabled");
										},
										type: method,
										url: url
									});
								}
							} catch (e) {
								
								alert("Problem saving.");
							}
				
							return false;
						};
						//inputButton.click(clickHandler);
						form.submit(clickHandler);
					})(form,inputButton);
				}
			}
		});
	}
	
	// if modifier function exists in options, use it to modify element
	function modifyElement(options,name,element,parameters){
		var modify = options.modify;
		if (typeof modify !== 'undefined'){
			var f = modify[name];
			if (typeof f === 'function'){
				f.apply(element,parameters);
			}
		}
	}
	
	/*
	// get option out as string, or value in data, or as return value of function
	function valueForOption(options,optionKey,data,args){
		if (optionKey in options){
			if (typeof options[optionKey] === 'function'){
				args = args || [];
				return options[optionKey].apply(data,args);
			} else if (options[optionKey] in data){
				return data[options[optionKey]];
			} else {
				return options[optionKey];
			}
		}
		return ""
	}
	*/
	
	function valueForOption(option,data,args,lookAtData){
		data = data || {}
		lookAtData = lookAtData || false;
		if (typeof option === 'function'){
			args = args || [];
			return option.apply(data,args);
		} else if (lookAtData && option in data){
			return data[option];
		} else if (typeof option !== 'undefined'){
			return option;
		}
		return "";
	}
	
	function valueForOptionOrData(option,data,args){
		return valueForOption(option,data,args,true);
	}
	
	// methods for different list formats
	var listFormats = {
		list: function(options,items,parentElement){
			var itemsContainer = templateOrElement('list');
			var itemsContainerContentTag = itemsContainer.simplate("tag","content");
			$(items).each(function(i){
				var item = this;
				var itemContainer = templateOrElement('list-item');
				itemsContainerContentTag.append(itemContainer);
				var link = $('<a/>');
				link.html(valueForOption(options.content,item));
				link.attr('href',valueForOption(options.link,item));
				itemContainer.simplate("tag","content").html(link)
			})
			return itemsContainer;
		},
		table: function(options,items,parentElement){
			var modify = options.modify || {};
			var id = "crud-list-table-" + nextId();
			var columns = [];
			var columnKeySet = {};
			var printableTypeSet = {"string":true,"number":true,"boolean":true};
			if (options.columns){
				$(options.columns).each(function(i){
					var column = this;
					var get = column.get || column.content || function(){
						if (typeof column.key !== 'undefined'){
							if (column.key in this){
								return this[column.key];
							}
						}
						return "";
					}
					// get ended up pointing to a key instead of a function
					if (typeof get === 'string'){
						var key = get;
						get = function(){
							if (key in this){
								return this[key];
							}
							return "";
						}
					}
					var title = "";
					if (typeof column.title !== 'undefined'){
						title = column.title;
					} else if (typeof column.key !== 'undefined'){
						title = column.key;
					}
					columns[i] = {
						get: get,
						key: column.key || null,
						title: title,
						link: column.link,
						width: column.width
					}
				});
			} else {
				$(items).each(function(){
					var item = this;
					for (k in item){
						if (!(k in columnKeySet)){
							if (typeof (printableTypeSet[typeof item[k]]) !== 'undefined'){
								columnKeySet[k] = true;
								columns[columns.length] = {
									get:function(k){
										return function(){
											if(!(k in this)){
												return null;
											}
											return this[k];
										}
									}(k),
									title:k
								};
							}
						}
					}
				})
			}
			var templateOptions = {crud:options,numColumns:columns.length,title:options.title,numRows:items.length,itemName:options.itemName,pluralItemName:options.pluralItemName};
			var table = templateOrElement('table',templateOptions);
			if (options.newLink){
				table.simplate("tag","button-new").click(function(){
					document.location.href = valueForOption(options.newLink);
				});
			} else {
				table.simplate("tag","button-new").hide();
			};
			var theadContentTag = table.simplate("tag","head");
			$(columns).each(function(i,column){
				var th = templateOrElement('table-head-cell',templateOptions);
				th.simplate("tag","content").html(column.title);
				theadContentTag.append(th);
			})
			var tbodyContentTag = table.simplate("tag","body");
			$(items).each(function(rowIndex,item){
				var item = this;
				var tr = templateOrElement("table-body-row",$.extend({index:rowIndex+1},templateOptions));
				tbodyContentTag.append(tr);
				var trContentTag = tr.simplate("tag","content");
				$(columns).each(function(columnIndex,column){
					var value = column.get.apply(item);
					if (typeof value === 'undefined' || value === null){
						value = "";
					}
					var td = templateOrElement("table-body-cell",$.extend({value:value,index:columnIndex+1},templateOptions));
					if (typeof column.link !== 'undefined'){
						var link = $('<a/>');
						link.attr('href',valueForOption(column.link,item));
						link.html(value);
						td.simplate("tag","content").html(link);
					} else {
						td.simplate("tag","content").html(value);
					}
					if (column.width){
						td.css("width",column.width);
					}
					trContentTag.append(td);
				})
			})
			var prevButton = table.simplate("tag","button-previous-page");
			var nextButton = table.simplate("tag","button-next-page");
			if (prevButton.length > 0){
				if (options.index){
					var newIndex = options.index - options.pageSize;
					if (newIndex < 0){
						newIndex = 0;
					}
					var newOptions = $.extend({},options);
					newOptions.index = newIndex;
					(function(newOptions){
						prevButton.click(function(){
							buildListView.call(parentElement,newOptions,"table");
						});
					})(newOptions);
				} else {
					prevButton.hide();
				}
			}
			if (nextButton.length > 0){
				if (options.total > options.index + items.length){
					// hook up next button
					var newIndex = options.index + items.length;
					var newOptions = $.extend({},options);
					newOptions.index = newIndex;
					(function(newOptions){
						nextButton.click(function(){
							buildListView.call(parentElement,newOptions,"table");
						});
					})(newOptions);
				} else {
					nextButton.hide();
				}
			}
			if (options.width){
				table.css("width",options.width);
			}
			return table;
		}
	}
	
	var crudTemplateContainerId = "__crud_template_container__";
	var crudTemplateSelector = "#" + crudTemplateContainerId;
	
	// load templates from url or element selector
	function getTemplateContainer(urlOrSelector,callback){
		if (typeof urlOrSelector === 'undefined'){
			callback(null);
			return;
		}
		var firstCharacter = urlOrSelector.substring(0,1);
		if (firstCharacter === '#' || firstCharacter === '.'){
			if ($(urlOrSelector).length > 0){
				callback($(urlOrSelector));
				return;
			} else {
				$.error("Template selector did not match any elements.");
			}
		} else {
			if ($(crudTemplateSelector).length === 0){
				$("body").append('<div style="display:none" id="' + crudTemplateContainerId + '"></div>');
			}
			$(crudTemplateSelector).load(urlOrSelector,function(text, status){
				if (status === 'error'){
					$.error("Problem loading template " + urlOrSelector + '.');
				}
				callback($(crudTemplateSelector));
			});
		}
	}
	
	// load templates and rip apart with simplate
	function loadTemplates(urlOrSelector,callback){
		getTemplateContainer(urlOrSelector,function(templateContainer){
			if (templateContainer != null){
				templateContainer.simplate();
			}
			callback();
		});
	}	
	
	function makeFieldCompare(key){
		return function(a,b){
			var aValue = (key in a) ? a[key] : "";
			var bValue = (key in b) ? b[key] : "";
			
			aValue = aValue !== null ? aValue : "";
			bValue = bValue !== null ? bValue : "";
			
			if (typeof aValue === "string" && typeof bValue === "string"){
				if (aValue.toLowerCase() > bValue.toLowerCase()){
					return 1;
				} else if (aValue.toLowerCase() < bValue.toLowerCase()){
					return -1;
				}
			}
			
			return (aValue > bValue) ? 1 : ((aValue < bValue) ? -1 : 0)
		}
	}
	
	function convertInputData(options,data){
		if (typeof options.modifyInput === 'function'){
			var result = options.modifyInput.apply(data);
			if (typeof result !== 'undefined'){
				data = result;
			}
		}
		return data;
	}

	function convertOutputData(options,data){
		if (typeof options.modifyOutput === 'function'){
			var result = options.modifyOutput.apply(data);
			if (typeof result !== 'undefined'){
				data = result;
			}
		}
		return data;
	}
	
	function getDataAndModify(options,callback){
		getData(options.data,options.index || 0,function(data){
			callback(convertInputData(options,data));
		});
	};
	
	// create a list view
	function buildListView(options,format){
		var self = this;
		
		self.html("");

		if ($.type(options) !== 'object'){
			$.error("Options object required for list view.");
		}
		
		if (!options.data){
			$.error("Array of data required for list view.");
		}
		
		if (! (format in listFormats)){
			$.error("Invalid format for list view: " + format);
		}
		
		var index = valueForOption(options.index);
		if (isBlank(index)){
			index = 0;
		}
		options.index = index;
		
		var itemName = valueForOption(options.itemName);
		var pluralItemName = valueForOption(options.pluralItemName);
		if (isBlank(itemName)){
			itemName = "item";
		}
		options.itemName = itemName;
		if (isBlank(pluralItemName)){
			if (itemName.endsWith("s")){
				pluralItemName = itemName + "es";
			} else if (itemName.endsWith("y")){
				pluralItemName = itemName + "ies";
			} else {
				pluralItemName = itemName + "s";
			}
		}
		options.pluralItemName = pluralItemName;

		loadTemplates(options.template,function(){
			getDataAndModify(options,function(items){
				var listField = valueForOption(options.list);
				var totalField = valueForOption(options.total);
				if (!isBlank(totalField)){
					if (totalField in items){
						options.total = items[totalField];
					}
				}
				var pageSize = valueForOption(options.pageSize);
				if (!isBlank(listField)){
					if (listField in items){
						items = items[listField];
					} else {
						$.error("List property '" + listField + "' not found in data.");
					}
				}
				options.total = options.total || items.length;
				if (isBlank(pageSize)){
					pageSize = items.length;
				}
				options.pageSize = pageSize;
				if (items.length > options.pageSize){
					options.pageSize = items.length;
				}
				if (typeof options.sort === 'string'){
					items.sort(makeFieldCompare(options.sort));
				}
				self.each(function(){
					var selfElement = $(this);
					var newElement = listFormats[format](options,items,selfElement);
					selfElement.append(newElement);
				})
			});
		});
		return self;
	}
	
	function requireData(options){
		if (typeof options.data === 'undefined'){
			console.log("Data required.");
		}
	}
	
	function requireDataHasTemplate(options){
		if (typeof options.data !== 'undefined'){
			if (typeof options.load === 'undefined' && typeof options.template === 'undefined'){
				console.log("No load function or template specified for data.");
			}
		}
	}
	
	function requireSchemaHasTemplate(options){
		if (typeof options.schema !== 'undefined'){
			if (typeof options.template === 'undefined'){
				console.log("No template specified for schema.");
			}
		}
	}
	
	// create an update form
	function buildFormView(options,type){
		var self = this;

		if ($.type(options) !== 'object'){
			$.error("Options object required for form view.");
		}
		
		options.hasCustomTemplate = false;
		if (typeof options.template === 'undefined' && !$.simplate.hasTemplates){
			options.hasCustomTemplate = true;
		}
		if (!options.hasCustomTemplate){
			self.html("");
		}
		
		switch (type){
			case 'search':
				break;
			case 'read':
				requireData(options);
				break;
			case 'create':
				break;
			case 'update':
				requireData(options);
				break;
			default:
				requireSchemaHasTemplate(options);
				requireDataHasTemplate(options);
				break;
		}
		
		loadTemplates(options.template,function(){
			getDataAndModify(options,function(item){
				if (typeof options.load === 'function'){
					options.load.apply(item);
				}
				self.each(function(){
					var selfElement = $(this);
					//selfElement.append(buildForm(options,type,item));
					buildForm.call(selfElement,options,type,item);
				});
			});
		});
		
		return self;
	}
	
	function argsForMode(mode,options){
		return [extendOptions(mode,options),mode];
	}
	
	// export methods for crud plugin
	var methods = {
		init : function( options ) {},
		search : function( options ) {
			buildFormView.apply(this,argsForMode("search",options));
		},
		list : function( options ) {
			buildListView.apply(this,argsForMode("list",options));
		},
		table : function( options ) {
			buildListView.apply(this,argsForMode("table",options));
		},
		view : function( options ) {
			buildFormView.apply(this,argsForMode("read",options));
		},
		read : function( options ) {
			buildFormView.apply(this,argsForMode("read",options));
		},
		update : function( options ) {
			buildFormView.apply(this,argsForMode("update",options));
		},
		edit : function( options ) {
			buildFormView.apply(this,argsForMode("update",options));
		},
		create: function( options ) {
			buildFormView.apply(this,argsForMode("create",options));
		},
		// convert form to json object or array
		toObject: function(){
			var arrayIndexMap = {};
			var nextArrayIndexMap = {};
			var rootObject;
			$("input, select, textarea",this).each(function(){
				var obj = $(this);
				if (obj.attr('name') && obj.data('ignore') !== true){
					var name = obj.attr('name');
					var nameParts = name.split('.');
					if (nameParts.length > 0){
						if (typeof rootObject === 'undefined'){
							if (nameParts[0] === '[]'){
								rootObject = [];
							} else {
								rootObject = {};
							}
						}
						// will map array index to new indexes as ordered by form
						var arrayIndexKey = "";
						// indexes stored in a map keyed by previous object
						var prevArrayIndexKey = "";
						var isPrevArray = false;
						// if root is an array, pull that off
						if (nameParts[0] == '[]'){
							arrayIndexKey = nameParts.shift();
							isPrevArray = true;
						}
						if (nameParts.length > 0){
							var prevObject = rootObject;
							var value;
							if (obj.attr('type') === 'checkbox'){
								value = this.checked ? true : false;
							} else { 
								value = obj.val();
								var dataType = obj.data("dataType");
								if (dataType === 'integer' || dataType === 'float' || dataType === 'number'){
									value = value - 0;
								}
							}
							for (var i = 0; i < nameParts.length; i++){
								var namePart = nameParts[i]
								arrayIndexKey += "." + namePart;
								var isArray = (namePart.substring(namePart.length - 2,namePart.length) === '[]');
								var currentObject;
								if (i === nameParts.length - 1){
									currentObject = value;
								} else if (isArray){
									namePart = namePart.substring(0,namePart.length - 2);
									currentObject = [];
								} else {
									currentObject = {};
								}
								// if we already had an object, set currentObject to that
								if (isPrevArray){
									// map index in form to next array index, in case indexes get moved around
									if (!(arrayIndexKey in arrayIndexMap)){
										if (!(prevArrayIndexKey in nextArrayIndexMap)){
											nextArrayIndexMap[prevArrayIndexKey] = 0;
										}
										arrayIndexMap[arrayIndexKey] = nextArrayIndexMap[prevArrayIndexKey];
										prevObject[arrayIndexMap[arrayIndexKey]] = currentObject;
										nextArrayIndexMap[prevArrayIndexKey]++;
									}
									currentObject = prevObject[arrayIndexMap[arrayIndexKey]];
								} else {
									// convert placeholders to special characters
									var propertyName = namePart.replace(/__dot__/g,".").replace(/__lb__/g,"[").replace(/__rb__/g,"]");
									if (typeof prevObject[propertyName] === 'undefined'){
										prevObject[propertyName] = currentObject
									}
									currentObject = prevObject[propertyName];
								}
								prevObject = currentObject;
								isPrevArray = isArray;
								prevArrayIndexKey = arrayIndexKey;
							}
						}
					}
				}
			});
			if (typeof rootObject == 'undefined'){
				rootObject = {};
			}
			return rootObject;
		}
	};

	$.fn.crud = function( method ) {
	
		if (this.length === 0){
			console.log("Nothing matched by crud selector. Make sure element exists.");
		}
	
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +	method + ' does not exist on jQuery.crud' );
		}		
	
	};
	
	// convert a javascript object to a json schema
	function jsonToSchema(json,depth){
		var depth = depth || 0;
		switch($.type(json)){
			case "object":
				var props = {};
				var obj = {_isFromData: true, type:"object",properties:props};
				for (k in json){
					if (json.hasOwnProperty(k)){
						props[k] = jsonToSchema(json[k],depth + 1);
					}
				}
				return obj;
			case "array":
				var array = {_isFromData: true, type:"array",items:{type:"any"}};
				return array;
			case "number":
				if (Math.round(json)===json){
					return {_isFromData: true, type:"integer"}
				} else {
					return {_isFromData: true, type:"number"}
				}
			case "boolean":
				return {_isFromData: true, type:"boolean"}
			case "string":
				var input = {};
				if (json.indexOf("\n") >= 0){
					input.rows = json.split("\n").length;
				} else {
					input.size = json.length;
				}
				return {_isFromData: true, type:"string", _input: input}
		}
		return {_isFromData: true, "type":"any"}
	}
	
	function configure(modes,options){
		if (arguments.length === 0){
			return;
		}
		if (typeof options === 'undefined'){
			options = modes;
			modes = ['default'];
		}
		if ($.type(options) !== 'object'){
			return;
		}
		if ($.type(modes) === 'string'){
			modes = [modes];
		}
		if ($.type(modes) !== 'array'){
			return;
		}
		$(modes).each(function(i,mode){
			if (!(mode in my.configuration)){
				my.configuration[mode] = {};
			}
			$.extend(my.configuration[mode],options);
		});
	}
	
	function extendOptions(mode,options){
		if (arguments.length === 0 || typeof mode !== 'string'){
			return {};
		}
		if (typeof options === 'undefined'){
			options = {};
		}
		var newOptions = {};
		$.extend(newOptions,my.configuration["default"]);
		if (mode in my.configuration){
			$.extend(newOptions,my.configuration[mode]);
		}
		$.extend(newOptions,options);
		return newOptions;
	}
	
	var helperMethods = {
		jsonToSchema: jsonToSchema,
		config: configure,
		configure: configure
	};
	
	$.crud = function( method ) {
		// Method calling logic
		if ( helperMethods[method] ) {
			return helperMethods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return helperMethods.init.apply( this, arguments );
		} else {
			$.error( 'Helper method ' +	method + ' does not exist on jQuery.crud' );
		}		
	
	};

})( jQuery );
