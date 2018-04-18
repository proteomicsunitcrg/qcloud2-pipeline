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
org_knime_js_base_node_quickform_input_credentials = function() {
	var credentialsInput = {
			version: "1.0.0"
	};
	credentialsInput.name = "Credentials input";
	var user_input;
	var password_input;
	var errorMessage;
	var viewRepresentation;
	var viewValid = false;

	credentialsInput.init = function(representation) {
		if (checkMissingData(representation)) {
			return;
		}
		viewRepresentation = representation;
		if (knimeService && knimeService.isRunningInWebportal() 
				&& representation.useServerLoginCredentials 
				&& representation.noDisplay) {
			resizeParent();
			viewValid = true;
			return;
		}
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		qfdiv.attr("title", representation.description);
		qfdiv.append('<div class="label">' + representation.label + '</div>');
		qfdiv.attr("aria-label", representation.label);
		
		if (representation.promptUsername) {
			var user_label = $('<label style="display:block;" for="user_input">');
			user_label.append('User');
			qfdiv.append(user_label);
			user_input = $('<input id="user_input" type="text">');
			user_input.css("margin-bottom", "5px");
			user_input.attr("class", "standard-sizing");
			user_input.attr("aria-label", 'User');
			//user_input.width(400);
			var usernameValue = representation.currentValue.username;
			user_input.val(usernameValue);
			qfdiv.append(user_input);
			user_input.blur(callUpdate);
		}
		
		password_input = $('<input>');
		password_input.attr('id', 'pw_input');
		password_input.attr("type", "password");
		password_input.attr("class", "standard-sizing");
		password_input.attr("aria-label", 'Password');
		//password_input.width(400);
		var passwordValue = representation.currentValue.password;
		password_input.val(passwordValue);
		var password_label = $('<label style="display:block;" for="pw_input">');
		password_label.append('Password');
		qfdiv.append(password_label);
		qfdiv.append(password_input);
		
		errorMessage = $('<div>');
		errorMessage.css('display', 'none');
		errorMessage.css('color', 'red');
		errorMessage.css('font-style', 'italic');
		errorMessage.css('font-size', '75%');
		errorMessage.attr("role", "alert");
		qfdiv.append(errorMessage);
		password_input.blur(callUpdate);
		resizeParent();
		viewValid = true;
	};

	credentialsInput.validate = function() {
		if (!viewValid) {
			return false;
		}
		return true;
	};
	
	credentialsInput.setValidationErrorMessage = function(message) {
		if (!viewValid) {
			return;
		}
		if (message != null) {
			errorMessage.text(message);
			errorMessage.css('display', 'block');
		} else {
			errorMessage.text('');
			errorMessage.css('display', 'none');
		}
		resizeParent();
	}

	credentialsInput.value = function() {
		if (!viewValid) {
			return null;
		}
		var viewValue = viewRepresentation.currentValue;
		if (viewRepresentation.promptUsername && user_input) {
			viewValue.username = user_input.val();
		}
		if (password_input) {
			viewValue.password = password_input.val();
		}
		return viewValue;
	};
	
	return credentialsInput;
	
}();
