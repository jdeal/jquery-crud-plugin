(function($)
{
	if (!$.dform.converters){
		$.dform.converters = {}
	}

	$.dform.converters.jsonSchema = function(options){
		SchemaUtils.alreadyReferencedSchemaIds = [];
		var schema = SchemaUtils.loadCompleteSchema(options.schema);
		ConverterUtils.data = options.data;
		var dformSchema = ConverterUtils.dformSchema(schema,options.data);
		dformSchema.type = "form";
		return dformSchema;
	}
	
})(jQuery);


var ConverterUtils = {

		data:null,
		
		dformSchema: function(schema,data,propertyName,property,elementName){
			if (!schema.type){
				if (schema.items){
					schema.type = "array";
				} else {
					schema.type = "object";
				}
			}
			if (schema.type === 'object' && !schema.properties){
				schema.properties = {};
			} else if (schema.type === 'array' && !schema.items){
				schema.items = {type:"any"}
			}
			
			if (!elementName){
				elementName = "";
			}

			if (typeof propertyName === 'number'){
				elementName += ("[]." + propertyName);
			} else if (propertyName && propertyName != ""){
				// put in some placeholders for special characters
				var name = propertyName.replace(/\./g,"__dot__").replace(/\[/g,"__lb__").replace(/\]/g,"__rb__");
				elementName += ("." + name);
			}

			if (elementName.substring(0,1) == '.'){
				elementName = elementName.substring(1);
			}

			if (typeof data === 'undefined'){
				if (typeof schema["default"] === 'undefined'){
					data = "";
				} else {
					data = schema["default"];
				}
			}
			
			var dform = {};
			var type = "any";
			dform.schema = schema;
			if (("convert_" + schema.type) in ConverterUtils){
				type = schema.type;
			}
			if (("convert_" + type) in ConverterUtils){
				$.extend(dform,ConverterUtils["convert_" + type](schema,data,schema.type,propertyName,property,elementName));
			}
			ConverterUtils.addCaption(property,propertyName,dform);
			dform.required = schema.required || false;
			if (schema._isFromData){
				dform.isFromData = true;
			} 
			return dform;
		},
		convert_string: function(schema,data,type,propertyName,property,elementName){
			var element =
			{
				"type" : "text",
				"name" : elementName,
				"value": data,
				"dataType": type
			};
			ConverterUtils.addValidation(property,element);
			return element;
		},
		convert_integer: function(schema,data,type,propertyName,property,elementName){
			var element =
			{
				"type" : "text",
				"name" : elementName,
				"value": data,
				"dataType": type
			};
			ConverterUtils.addValidation(property,element);
			return element;
		},
		convert_boolean: function(schema,data,type,propertyName,property,elementName){
			var element =
			{
				"type" : "checkbox",
				"name" : elementName,
				"value": data,
				"dataType": type
			};
			return element;
		},
		convert_object: function(schema,data,type,propertyName,property,elementName){
			var element =
			{
				"type" : "fieldset",
				"name" : elementName,
				"elements" : [],
				"dataType": type
			};
			
			var hasProperties = false;
			var groupToElement = {};
			for (p in schema.properties){
				if (schema.properties.hasOwnProperty(p)){
					var propertySchema = schema.properties[p];
					var propertyElement = ConverterUtils.dformSchema(propertySchema,data[p],p,propertySchema,elementName);
					propertyElement.isProperty = true;
					if (propertySchema._input && propertySchema._input.group){
						var group = propertySchema._input.group;
						if (!groupToElement[group]){
							groupToElement[group] = {
								"type": "group",
								"elements": []
							}
							element.elements.push(groupToElement[group]);
						}
						propertyElement.group = group;
						propertyElement.description = propertySchema.description || "";
						var groupItemElement = {
							"type": "group-item",
							"description": propertySchema.description || "",
							"elements": [propertyElement]
						}
						groupToElement[group].elements.push(groupItemElement);
					} else {
						element.elements.push(propertyElement);
					}
					hasProperties = true;
				}
			}
						
			if ($.type(schema.additionalProperties) === 'object'){
				element.propertySchema = schema.additionalProperties;
			} else if (hasProperties) {
				// assume we don't want additional properties
			} else {
				element.propertySchema = {type:"any"};
			}

			if (typeof element.propertySchema === 'object'){
				var propertySchema = $.extend({},element.propertySchema);
				if ("title" in propertySchema){
					delete propertySchema.title;
				}
				for (p in data){
					if (data.hasOwnProperty(p) && typeof schema.properties[p] === 'undefined'){
						var propertyElement = ConverterUtils.dformSchema(propertySchema,data[p],p,propertySchema,elementName);
						propertyElement.isProperty = true;
						propertyElement.isFromData = true;
						element.elements.push(propertyElement);
					}	
				}
			}
			//if (typeof element.propertySchema === 'undefined'){
			//	element.propertySchema = {"type":"any"}
			//}
			
			return element;
		},
		convert_array: function(schema,data,type,propertyName,property,elementName){
			var element =
			{
				"type" : "list",
				"name" : elementName,
				"elements" : [],
				"dataType": type,
				"itemSchema" : schema.items
			};
			
			var nextIndex = 0;
			
			if ($.type(data) === 'array'){
				$(data).each(function(i,item){
					var itemElement = ConverterUtils.dformSchema(schema.items,item,i,schema.items,elementName);
					itemElement.isItem = true;
					element.elements.push(itemElement);
					nextIndex++;
				});
			}
			
			element.index = nextIndex;
			
			return element;
		},
		convert_any: function(schema,data,type,propertyName,property,elementName){
			var dataSchema;
			if (typeof data !== 'undefined'){
				var dataSchema = $.crud("jsonToSchema",data);
			}
			if (dataSchema.type != "any"){
				return ConverterUtils.dformSchema(dataSchema,data,propertyName,dataSchema,elementName);
			} else {
				var element =
				{
					"type": "any",
					"name": elementName,
					"dataType": type
				}
				return element;
			}
		},
		addCaption: function(property,propertyName,element){
			if (typeof element === 'object' && typeof property === 'object' && typeof propertyName === 'string'){
				var caption = property.title;
				if (typeof caption === 'undefined'){
					caption = (propertyName ? propertyName : "").toCaption().toTitleCase();
				}
				element.caption = caption;
			}
		},
		addValidation: function(property,element){

			var validationMap = {};

			if(property.required)
				validationMap.required = true;

			if(property.minLength)
				validationMap.minlength = property.minLength;

			if(property.maxLength)
				validationMap.maxlength = property.maxLength;

			if(property.format)
				validationMap[property.format] = true;

			if(!$.isEmptyObject(validationMap))
				element.validate = validationMap;
		}
	}
	var SchemaUtils = {

		/* All the JSON Schema related code goes below */

		schemaMap : {},
		idSchemaMap : {},
		alreadyReferencedSchemaIds:[],
		loadCompleteSchema : function(node,newNode){

			if(!newNode)
				newNode = {};
			
			for(var key in node){	
				var cNode = node[key];

				switch(key)
				{
					case "type":
						newNode.type = cNode;
						break;
					case "items":
						if(!newNode.items)
							newNode.items = {};
						$.extend(newNode.items,SchemaUtils.loadCompleteSchema(cNode,newNode.items));
						break;
					case "properties":
						if(!newNode.properties)
							newNode.properties = {};
						$.extend(newNode.properties,SchemaUtils.loadCompleteSchema(cNode,newNode.properties));					
						break;
					case "extends":
						if($.isArray(cNode)){

							$.each(cNode, function(index,refs){

								SchemaUtils.loadReferencedSchemas(refs,newNode);
							});
						}else{
							SchemaUtils.loadReferencedSchemas(cNode,newNode);
						}
						break;
					case "$ref":
						var ref = {};
						ref["$ref"] = cNode;
						SchemaUtils.loadReferencedSchemas(ref,newNode);
						break;
					case "enum":
						newNode.enum = cNode;
						break;
					default:		
						if($.type(cNode)== "object" || $.type(cNode)== "array"){
							if(!newNode[key])
								newNode[key] = {};
							$.extend(newNode[key],SchemaUtils.loadCompleteSchema(cNode,newNode[key]));
						}else{
							if(key == "id")
								SchemaUtils.idSchemaMap[cNode] = node;
							newNode[key] = cNode;
						}
						break;
					
				}
			}

			return newNode;
		},
		loadReferencedSchemas : function(refNode,newNode){

			var schemaURI = refNode["$ref"];
			var childSchema = {};
			
			if($.inArray(schemaURI,SchemaUtils.alreadyReferencedSchemaIds)== -1){

				if(schemaURI.indexOf("http") != -1){
									
					if(schemaURI.indexOf("#") == -1)
						schemaURI += "#";

					childSchema = SchemaUtils.schemas()[schemaURI];

				}else{

					childSchema = (SchemaUtils.idSchemaMap[schemaURI]) ? SchemaUtils.idSchemaMap[schemaURI] : {};	
				}
				SchemaUtils.alreadyReferencedSchemaIds.push(schemaURI);
				SchemaUtils.loadCompleteSchema(childSchema,newNode);
								
			}
		},
		schemas : function(schemaMap){
			if (typeof schemaMap === 'undefined'){
				return SchemaUtils.schemaMap;
			}
			SchemaUtils.schemaMap = schemaMap;
		}
		
	}

if (typeof(SchemaToHtmlUtils) === 'undefined'){
	SchemaToHtmlUtils = {loadSchemaMap:SchemaUtils.schemas};
}
