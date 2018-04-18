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
org_knime_js_base_node_quickform_input_string = function() {
	var stringInput = {
			version: "1.0.0"
	};
	stringInput.name = "String input";
	var input;
	var errorMessage;
	var viewRepresentation;
	var viewValid = false;

	stringInput.init = function(representation) {
		if (checkMissingData(representation)) {
			return;
		}
		viewRepresentation = representation;
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		if (representation.editorType == "Multi-line") {
			// Text area (multi-line)
			input = $('<textarea>');
			input.attr('cols', representation.multilineEditorWidth);
			input.attr('rows', representation.multilineEditorHeight);
		} else {
			// Text input (single-line)
			input = $('<input>');
			input.attr("type", "text");
			if (representation.regex) {
				input.attr("pattern", representation.regex);
			}
			input.attr("class", "standard-sizing");
		}
		input.attr("aria-label", representation.label);
		var stringValue = representation.currentValue.string;
		input.val(stringValue);
		qfdiv.attr("title", representation.description);
		qfdiv.attr("aria-label", representation.label);
		qfdiv.append('<div class="label">' + representation.label + '</div>');
		qfdiv.append(input);
		qfdiv.append($('<br>'));
		errorMessage = $('<span>');
		errorMessage.css('display', 'none');
		errorMessage.css('color', 'red');
		errorMessage.css('font-style', 'italic');
		errorMessage.css('font-size', '75%');
		errorMessage.attr('role', 'alert');
		qfdiv.append(errorMessage);
		input.blur(callUpdate);
		resizeParent();
		viewValid = true;
	};

	stringInput.validate = function() {
		if (!viewValid) {
			return false;
		}
		var regex = input.attr("pattern");
		if (regex != null && regex.length > 0) {
			var valid = matchExact(regex, input.val());
			if (!valid) {
				stringInput.setValidationErrorMessage(viewRepresentation.errormessage.split('?').join(input.val()));
			} else {
				stringInput.setValidationErrorMessage(null);
			}
			return valid;
		} else {
			return true;
		}
	};
	
	stringInput.setValidationErrorMessage = function(message) {
		if (!viewValid) {
			return;
		}
		if (message != null) {
			errorMessage.text(message);
			errorMessage.css('display', 'inline');
		} else {
			errorMessage.text('');
			errorMessage.css('display', 'none');
		}
		resizeParent();
	}

	stringInput.value = function() {
		if (!viewValid) {
			return null;
		}
		var viewValue = new Object();
		viewValue.string = input.val();
		return viewValue;
	};
	
	function matchExact(r, str) {
		var match = str.match(r);
		return match != null && str == match[0];
	}
	
	return stringInput;
	
}();
