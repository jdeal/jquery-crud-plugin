(function( $ ){
	
	$.dform.crudMode = null;
	$.dform.crudOptions = {};
	$.dform.crudForm = null;
	
	typeMaker = function(type){
		return function(options){
			return typeTemplate(type,options);
		}
	}
	
	function typeTemplate(type,options){
		var template = null;
		var templateOptions = {
			crud: $.dform.crudOptions,
			mode: $.dform.crudMode,
			value: options.value,
			title: $.dform.crudOptions.title,
			caption: options.caption,
			schema: options.schema || {},
			group: options.group
		};
		if (options.schema && options.schema._input){
			templateOptions.input = options.schema._input;
		} else  {
			templateOptions.input = {};
		}
		var crudMode = options.crudMode || $.dform.crudMode;
		var subType = (options.schema && options.schema.enum ? "enum" : null) || (options.schema && options.schema.format ? options.schema.format : null);
		if (crudMode){
			if (subType){
				template = $.simplate(crudMode + "-" + type + "-" + subType,templateOptions);
			}
			if (!template){
				template = $.simplate(crudMode + "-" + type,templateOptions);
			}
		}
		if (!template){
			if (subType){
				template = $.simplate(type + "-" + subType,templateOptions);
			}
			if (!template){
				template = $.simplate(type,templateOptions);
			}
		}
		if (template){
			template.data("templateType",type);
			if (typeof options.dataType !== 'undefined') {
				template.simplate("tag","input").data("dataType",options.dataType);
			}
			template.simplate("tag","caption").html("");
			//if (!options.schema.required){
			if (options.isItem || options.isFromButton || options.isFromData){
				template.simplate("tag","button-remove").click(function(){
					var title = options.caption || ('this ' + (options.schema.title || (options.isItem ? 'item' : 'property')));
					if (confirm("Are you sure you want to remove " + title + '?')){	
						template.remove();
					}
				});
			} else {
				template.simplate("tag","button-remove-container").hide();
			}
		}
		if (!template){
			console.log("Template type " + type + " not found.");
		}
		return template;
	}
	
	function templateDataType(options){
		var dataType = options.dataType || 'string';
		if ($.type(dataType) === 'array'){
			dataType = 'any';
		}
		return dataType;
	}
	
	function templateType(options){
		var dataType = templateDataType(options);
		if (options.isProperty){
			return "form-property-" + dataType;
		} else if (options.isItem){
			return "form-item-" + dataType;
		} else {
			return "form-" + dataType;
		}
	}
	
	function templateFromDataType(options){
		return typeTemplate(templateType(options),options);
	}
	
	function objectOrArrayType(options){
		var type = templateType(options);
		var template = typeTemplate(type,options);
		var contentTag = template.simplate("tag","content");
		var addButtonTag = template.simplate("tag","button-add");
		var addButtonContainerTag = template.simplate("tag","button-add-container");
		var propertyNameTag = template.simplate("tag","property-name");
		var isArray = type === 'form-array' || type === 'form-item-array' || type === 'form-property-array';
		var isObject = type === 'form-object' || type === 'form-item-object' || type === 'form-property-object';
		
		var typeNameTag = null;
		var typeNameSelect = null;
		
		if (!isObject){
			propertyNameTag.hide();
		} else {
			propertyNameTag.attr("name",options.name + "__name");
			propertyNameTag.data("ignore",true);
		}
		
		var schema = false;
		var itemTitle = null;
		if (isObject || isArray){
			if (isObject && $.type(options.propertySchema) === 'object'){
				schema = $.extend({},options.propertySchema);
			} else if (isArray && $.type(options.itemSchema) === 'object'){
				schema = $.extend({},options.itemSchema);
			}
			if (schema.title){
				itemTitle = schema.title;
				if (isObject){	
					delete schema.title;
				}
			}
		}

		if (!schema){
			addButtonContainerTag.hide();			
		} else {
			typeNameTag = template.simplate("tag","type-name");
			if (typeNameTag.length > 0){
				if (schema.type === 'any'){
					typeNameTag.html(typeTemplate("form-type-select",options));
					typeNameSelect = typeNameTag.findAndFilter("select");
				} else {
					if (itemTitle) {
						typeNameTag.html(itemTitle);
					} else {
						typeNameTag.html((typeof schema.type === 'string' ? schema.type + " " : "") + (isObject ? "property" : "item"));
					}
				}
			}
		
			var localIndex = 0;
				
			addButtonTag.click(function(){
			
				var name = '';
				if (isObject){
					name = propertyNameTag.val().trim();
				} else {
					name = options.index + localIndex;
				}
				if (!isArray && name === ''){
					if (propertyNameTag.length > 0){
						var validator = $.dform.crudForm.validate();
						var fields = {};
						fields[propertyNameTag.attr("name")] = "Property name required.";
						validator.showErrors(fields);
					} else {
						alert("Please specify a property name.");
					}
					return;
				} else {
					
					if (typeNameSelect){
						schema.type = typeNameSelect.val();
					}
				
					var element = ConverterUtils.dformSchema(schema,options.defaultListValue,name,schema,options.name);
					element.isFromButton = true;
					if (isArray){
						element.isItem = true;
					} else {
						element.isProperty = true;
						
						if ($("input[name='" + element.name + "']").length > 0){
							var validator = $.dform.crudForm.validate();
							var fields = {};
							fields[propertyNameTag.attr("name")] = "Property already exists.";
							validator.showErrors(fields);
							return;
						}
					}
					
					var dformElement = $.dform.createElement(element);
					$(dformElement).runAll(element);
					
					contentTag.append(dformElement);
				}
				
				localIndex++;
			});
		}
		
		return template;
	}
	
	$.dform.removeType("form");
	$.dform.addType("form",objectOrArrayType);

	
	$.dform.removeType("text");
	$.dform.addType("text",function(options){
		var template = typeTemplate(templateType(options),options);
		if (options.schema && options.schema.format && options.schema.format === 'image-file'){
			if (options.value && options.value.length > 0){
				// need to convert value to server path
				template.simplate("tag","image").attr("src",options.value);
			} else {
				template.simplate("tag","image").hide();
			}
			template.simplate("tag","input").change(function(){
				alert("calling ajax image uploader...");
				// $.crud("upload",path,function(serverPath){
				//  template.simplate("tag",
				//	template.simplate("tag","image").show();
				//})
			});
		}
		return template;
	});

	$.dform.removeType("checkbox");
	$.dform.addType("checkbox",function(options){
		var template = typeTemplate(templateType(options),options);
		template.simplate("tag","input").attr("value","true");
		return template;
	});
	
	$.dform.removeType("fieldset");
	$.dform.addType("fieldset",objectOrArrayType);

	$.dform.removeType("list");
	$.dform.addType("list",objectOrArrayType);
	
	$.dform.removeType("group");
	$.dform.addType("group",typeMaker("form-property-group"));

	$.dform.removeType("group-item");
	$.dform.addType("group-item",function(options){
		var template = typeTemplate("form-property-group-item",options);
		template.simplate("tag","description").html(options.description);
		return template;
	});
	
	$.dform.removeType("any");
	$.dform.addType("any",function(options){
		var template = typeTemplate(templateType(options),options);
		template.simplate("tag","value").html(typeTemplate("form-item-string",options));
		template.simplate("tag","type").change(function(){
			var value = $(this).val();
			var parts = value.split(":");
			var valueTemplate = null;
			if (parts.length === 2){
				var formType = parts[0];
				var dataType = parts[1];
				valueTemplate = typeTemplate("form-" + formType,options);
				if (valueTemplate){
					template.simplate("tag","value").html(valueTemplate);
				}
			}
			if (!valueTemplate){
				template.simplate("tag","value").html("");
			}
		});
		return template;
	});
	
	$.dform.removeSubscription("elements");
	$.dform.subscribe("elements",function(options, type){
		var self = $(this);
		var contentTag = self.simplate("tag","content");
		$.each(options, function(index, nested){
			if (typeof (index) == "string"){
				nested["name"] = name;
			}
			var element = $.dform.createElement(nested);
			contentTag.append(element);
			$(element).runAll(nested);
		});
	})

	$.dform.removeSubscription("caption")
	$.dform.subscribe("caption",function(caption,type){
		this.simplate("tag","caption").html(caption);
	});
	
	$.dform.removeSubscription("schema")
	$.dform.subscribe("schema",function(schema,type){
		var self = this;
		if (type === 'text' || type === 'string'){
			if ($.type(schema.enum)==='array'){
				$.each(schema.enum,function(i,value){
					var option = $("<option/>");
					self.simplate("tag","input").append(option);
					option.attr("value",value);
					if (schema._input && schema._input.enumLabels && schema._input.enumLabels[value]){
						option.html(schema._input.enumLabels[value]);
					} else {
						option.html(value);
					}
				})
			}
		}
	});

	$.dform.removeSubscription("value")
	$.dform.subscribe("value",function(value,type){
		this.simplate("tag","input").each(function(){
			if ($(this).data("dataType")==='boolean' && $(this).attr('type')==='checkbox' && !value){
				$(this).val("true");
			} else if ($(this).attr('type') !== 'file'){
				$(this).val(value);
			}
			if (value === 'true' || value === true){
				if ($(this).attr('type')==='checkbox'){
					$(this).attr('checked','checked');
				}
			}
		});
		if (type === 'checkbox' && value === true){
			this.simplate("tag","value").html("true");
		} else if (type === 'checkbox'){
			this.simplate("tag","value").html("false");
		} else {
			this.simplate("tag","value").html(value);
		}
	});

	$.dform.removeSubscription("name")
	$.dform.subscribe("name",function(name,type){
		this.simplate("tag","input").attr("name",name);
	});
	
	$.dform.removeSubscription("validate")
	$.dform.subscribe("validate",function(options, type){
		if ($.dform.crudMode !== 'read'){
			this.simplate("tag","input").rules("add", options);
		}
	});
	
})( jQuery );
