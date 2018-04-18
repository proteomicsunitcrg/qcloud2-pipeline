(autocomplete_input = function() {
	
	var input = {};
	var _representation, _value;
	var autocompleteOptions = [];
	var textField, errorMessage;
	var interval;
	
	input.init = function(representation, value) {
		_representation = representation;
		_value = value;
		
		var optionCol = _representation.options["autoSelect"];
		var knimeTable = new kt();
		knimeTable.setDataTable(_representation.inObjects[0]);
		var valCol = knimeTable.getColumn(optionCol);
		var valSet = {};
		if (valCol) {
			for (var i = 0; i < valCol.length; i++) {
				valSet[valCol[i]] = true;
			}
		}
		for(var key in valSet){
			autocompleteOptions.push(key);
		}
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		textField = $('<input>');
		textField.attr("type", "text");
		textField.attr("id", "textfield");
		textField.attr("class", "standard-sizing");
		//textField.width(400);
		var stringValue = _value.options["string_input"];
		textField.val(stringValue);
		qfdiv.attr("title", _representation.options["description"]);
		qfdiv.append('<div class="label">' + _representation.options["label"] + '</div>');
		qfdiv.append(textField);
		qfdiv.append($('<br>'));
		errorMessage = $('<span>');
		errorMessage.css('display', 'none');
		errorMessage.css('color', 'red');
		errorMessage.css('font-style', 'italic');
		errorMessage.css('font-size', '75%');
		qfdiv.append(errorMessage);
		$(function() {
			if (!_setAutocomplete()) {
				interval = setInterval(function () {_setAutocomplete()}, 500);
			}
		});
		
		//resizeParent();
	}
	
	_setAutocomplete = function() {
		if (typeof $("#textfield").autocomplete != 'undefined') {
			$("#textfield").autocomplete({
		    	source: autocompleteOptions
			});
			if (autocompleteOptions.length < 1) {
				$('#textfield').attr('placeholder', 'No options available, please check your settings.');
			}
			if (interval) {
				clearInterval(interval);
			}
			return true;
		}
		return false
	}
	
	input.validate = function() {
		if (_representation.options["restrict"]) {
			var match = false;
			var curValue = textField.val();
			for (var i = 0; i < autocompleteOptions.length; i++) {
				if (autocompleteOptions[i] == curValue) {
					match = true;
					break;
				}
			}
			if (!match) {
				input.setValidationError("Input needs to be one of the options given.");
				return false;
			}
		}
		input.setValidationError(null);
		return true;
	}
	
	input.setValidationError = function(message) {
		if (message != null) {
			errorMessage.text(message);
			errorMessage.css('display', 'inline');
		} else {
			errorMessage.text('');
			errorMessage.css('display', 'none');
		}
		//resizeParent();
	}
	
	input.getComponentValue = function() {
		var curValue = textField.val();
		if (curValue != '') {
			_value.flowVariables["string_input"] = curValue;
		}
		_value.options["string_input"] = curValue;
		return _value;
	}
	
	return input;
	
}());