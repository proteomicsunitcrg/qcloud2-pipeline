/*
 * ------------------------------------------------------------------------
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.com; Email: contact@knime.com
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License, Version 3, as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, see <http://www.gnu.org/licenses>.
 *
 *  Additional permission under GNU GPL version 3 section 7:
 *
 *  KNIME interoperates with ECLIPSE solely via ECLIPSE's plug-in APIs.
 *  Hence, KNIME and ECLIPSE are both independent programs and are not
 *  derived from each other. Should, however, the interpretation of the
 *  GNU GPL Version 3 ("License") under any applicable laws result in
 *  KNIME and ECLIPSE being a combined program, KNIME GMBH herewith grants
 *  you the additional permission to use and propagate KNIME together with
 *  ECLIPSE with only the license terms in place for ECLIPSE applying to
 *  ECLIPSE and the GNU GPL Version 3 applying for KNIME, provided the
 *  license terms of ECLIPSE themselves allow for the respective use and
 *  propagation of ECLIPSE together with KNIME.
 *
 *  Additional permission relating to nodes for KNIME that extend the Node
 *  Extension (and in particular that are based on subclasses of NodeModel,
 *  NodeDialog, and NodeView) and that only interoperate with KNIME through
 *  standard APIs ("Nodes"):
 *  Nodes are deemed to be separate and independent programs and to not be
 *  covered works.  Notwithstanding anything to the contrary in the
 *  License, the License does not apply to Nodes, you are not required to
 *  license Nodes under the License, and you are granted a license to
 *  prepare and propagate Nodes, in each case even if such Nodes are
 *  propagated with or for interoperation with KNIME.  The owner of a Node
 *  may freely choose the license terms applicable to such Node, including
 *  when such Node is propagated with or for interoperation with KNIME.
 * ------------------------------------------------------------------------
 * 
 * History
 *   Oct 14, 2013 (Patrick Winter, KNIME AG, Zurich, Switzerland): created
 */
org_knime_js_base_node_quickform_input_listbox = function() {
	var listboxInput = {
			version: "1.0.0"
	};
	listboxInput.name = "Listbox input";
	var viewRepresentation;
	var input;
	var errorMessageLine;
	var separator;
	var omitEmpty;
	var viewValid = false;

	listboxInput.init = function(representation) {
		if (checkMissingData(representation)) {
			return;
		}
		viewRepresentation = representation;
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		input = $('<textarea>');
		input.attr("aria-label", representation.label);
		qfdiv.attr("title", representation.description);
		qfdiv.attr("aria-label", representation.label);
		qfdiv.append('<div class="label">' + representation.label + '</div>');
		qfdiv.append(input);
		input.css('white-space', 'pre');
		input.css('overflow', 'auto');
		input.attr('wrap', 'off');
		input.attr('rows', representation.numberVisOptions);
		input.attr('cols', '20');
		input.attr("pattern", representation.regex);
		input.attr("class", "standard-sizing");
		//input.width(400);
		var stringValue = representation.currentValue.string;
		input.val(stringValue);
		qfdiv.append($('<br>'));
		errorMessageLine = $('<span>');
		var errorMessages = errorMessageLine;
		errorMessages.css('display', 'none');
		errorMessages.css('color', 'red');
		errorMessages.css('font-style', 'italic');
		errorMessages.css('font-size', '75%');
		errorMessages.attr('role', 'alert');
		qfdiv.append(errorMessageLine);
		if (representation.separator==null || representation.separator.length==0) {
			separator = null;
		} else {
			separator = new RegExp(getSeperatorRegex());
		}
		omitEmpty = representation.omitempty;
		input.blur(callUpdate);
		resizeParent();
		viewValid = true;
	};

	listboxInput.validate = function() {
		if (!viewValid) {
			return false;
		}
		
		var regex = input.attr("pattern");
		if (regex != null && regex.length > 0) {
			var values = [input.val()];
			if (separator) {
				values = input.val().split(separator);
			}
			listboxInput.setValidationErrorMessage(null);
			for (var i = 0; i < values.length; i++) {
				if (omitEmpty && values[i] == "") {
					continue;
				}
				var valid = matchExact(regex, values[i]);
				if (!valid) {
					var errorMessage = "Value " + (i+1) + " is not valid. ";
					errorMessage += viewRepresentation.errormessage.split('?').join(values[i]);
					listboxInput.setValidationErrorMessage(errorMessage);
					return false;
				}
			}
			// all values match
			return true;
		} else {
			return true;
		}
		
		return true;
	};

	listboxInput.setValidationErrorMessage = function(message) {
		if (!viewValid) {
			return;
		}
		if (message != null) {
			errorMessageLine.text(message);
			errorMessageLine.css('display', 'inline');
		} else {
			errorMessageLine.text('');
			errorMessageLine.css('display', 'none');
		}
		resizeParent();
	};

	listboxInput.value = function() {
		if (!viewValid) {
			return null;
		}
		var viewValue = new Object();
		viewValue.string = input.val();
		return viewValue;
	}
	
	function getSeperatorRegex() {
		var sep = viewRepresentation.separator;
		var sepRegex = '';
		if (viewRepresentation.separateeachcharacter || typeof sep == 'undefined' || sep == null || sep == '') {
			return sepRegex;
		}
		
		for (var i = 0; i < sep.length; i++) {
			if (i > 0) {
				sepRegex += '|';
			}
			var c = sep.charAt(i);
			if (c == '\\') {
				if (i + 1 < sep.length) {
					var c1 = sep.charAt(i + 1);
					if (c1 == 'n') {
						sepRegex += '\\n';
                        i++;
                    } else if (c1 == 't') {
                    	sepRegex += '\\t';
                        i++;
                    } else {
                    	var errorMessage = 'A back slash must not be followed by a char other than n or t; ignoring the separator: ' + c + c1;
                    	if (knimeService) {
                    		knimeService.setWarningMessage(errorMessage, 'invalidSeparator' + i);
                    	} else {
                    		setValidationErrorMessage(errorMessage);
                    	}
                    }
				} else {
					sepRegex += '\\\\';
				}
			} else if (c == '[' || c == '^') {
                // these symbols are not allowed in [] (see the else-block below)
				sepRegex += '\\' + c;
            } else {
                // a real, non-specific char
            	sepRegex += '[' + c + ']';
            }
		}
		return sepRegex;
	}
	
	function matchExact(r, str) {
		var match = str.match(r);
		return match != null && str == match[0];
	}
	
	return listboxInput;
	
}();
