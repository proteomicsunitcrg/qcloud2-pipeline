knime_generic_view = function() {
	
	view = {};
	var _representation;
	var _value;
	var SETTINGS;
	var FLOW_VARIABLES;
	
	view.init = function(representation, value) {
		_representation = representation;
		_value = value;
		if (representation.jsCode == null) {
			document.body.innerHTML = 'Error: No script available.';
		} else {
			// Define KNIME table and set data
			if (representation.table) {
				var knimeDataTable = new kt();
				knimeDataTable.setDataTable(representation.table);
			}
			// Define settings object
			SETTINGS = _value.settings ? JSON.parse(_value.settings) : {};
			// Define variables object
			extractFlowVariables();
						
			// Import style dependencies
			var head = document.getElementsByTagName('head')[0];
			if (representation.cssDependencies) {
				for ( var j = 0; j < representation.cssDependencies.length; j++) {
					var styleDep = document.createElement('link');
					styleDep.type = 'text/css';
					styleDep.rel = 'stylesheet';
					styleDep.href = representation.cssDependencies[j];
					head.appendChild(styleDep);
				}
			}
			// Import own style declaration
			var styleElement = document.createElement('style');
			styleElement.type = 'text/css';
			styleElement.appendChild(document.createTextNode(representation.cssCode));
			head.appendChild(styleElement);
			
			// Import JS dependencies and call JS code after loading
			var libs = representation.jsDependencies;
			if (!libs) {
				libs = [];
			}
			if (knimeService && knimeService.isRunningInWebportal()) {
				for (var i = 0; i < libs.length; i++) {
					libs[i] = "./VAADIN/src-js/" + libs[i];
				}
			}
			
			require(libs, function() {
				try {
				    eval(representation.jsCode);
				    view.validate();
				} catch (e) {
					var errorString = "Error in script\n";
					if (e.stack) {
						errorString += e.stack;
					} else {
						errorString += e;
					}
				    alert(errorString);
				}
			});
		}
	};
	
	view.validate = function() {
		var error = validateFlowVariables();
		if (error) {
			view.setValidationError(error);
			return false;
		}
		return true;
	};
	
	view.setValidationError = function(error) {
		alert(error);
	}
	
	view.getComponentValue = function() {
		if (!isObjectEmpty(SETTINGS)) {
			_value.settings = JSON.stringify(SETTINGS);
		}
		setFlowVariables();
		return _value;
	};
	
	extractFlowVariables = function() {
		FLOW_VARIABLES = {};
		if (_value && _value.flowVariables) {
			for (var name in _value.flowVariables) {
				var v = _value.flowVariables[name];
				var val;
				if (v.type == "INTEGER") {
					val = v.intValue;
				} else if (v.type == "DOUBLE") {
					val = v.doubleValue;
				} else {
					val = v.stringValue;
				}
				FLOW_VARIABLES[name] = val;
			}
		}
		return FLOW_VARIABLES;
	}
	
	validateFlowVariables = function() {
		if (_value && _value.flowVariables) {
			for (var name in _value.flowVariables) {
				var v = _value.flowVariables[name];
				var newV = FLOW_VARIABLES[name];
				if (typeof newV == 'undefined' || newV == null) {
					return "The flow variable " + name + " must be defined.";
				}
				if (v.type == "INTEGER") {
					if (newV != parseInt(newV, 10)) {
						return "The flow variable value (" + newV + ") for " + name + " could not be parsed as an integer.";
					}
				} else  if (v.type == "DOUBLE") {
					if (newV != parseFloat(newV)) {
						return "The flow variable value (" + newV + ") for " + name + " could not be parsed as a double.";
					}
				}
			}
		}
	}
	
	setFlowVariables = function() {
		if (_value && _value.flowVariables) {
			for (var name in _value.flowVariables) {
				var v = _value.flowVariables[name];
				var newV = FLOW_VARIABLES[name];
				var val;
				if (v.type == "INTEGER") {
					v.intValue = parseInt(newV, 10);
				} else if (v.type == "DOUBLE") {
					v.doubleValue = parseFloat(newV);
				} else {
					v.stringValue = String(newV);
				}
			}
		}
	}
	
	
	
	isObjectEmpty = function(obj) {
		return Object.keys(obj).length === 0 && obj.constructor === Object;
	} 
	
	view.getSVG = function() {
		try {
			return eval('(function() {' + _representation.jsSVGCode + '}())');
		} catch (e) {
			return null;
		}
	}
	
	return view;
}();