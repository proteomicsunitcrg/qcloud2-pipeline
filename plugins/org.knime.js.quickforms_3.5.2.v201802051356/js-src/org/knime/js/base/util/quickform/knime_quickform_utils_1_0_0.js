/*
 * ------------------------------------------------------------------------
 *
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
 *  propagated with or for interoperation with KNIME. The owner of a Node
 *  may freely choose the license terms applicable to such Node, including
 *  when such Node is propagated with or for interoperation with KNIME.
 * ------------------------------------------------------------------------
 * 
 * History
 *   Oct 14, 2013 (Patrick Winter, KNIME AG, Zurich, Switzerland): created
 */

resizeParent = function(width, height) {
	if (parent != undefined && parent.KnimePageLoader != undefined) {
		parent.KnimePageLoader.autoResize(window.frameElement.id, width, height);
	}
};

callUpdate = function() {
	if (parent != undefined && parent.KnimePageLoader != undefined) {
		parent.KnimePageLoader.getPageValues();
	}
};

injectCSS = function(rule) {
	var div = $("<div />", {html: '<style>' + rule + '</style>'}).appendTo("head");    
};

isValid = function(object) {
	return object != undefined && object != null;
};

checkMissingData = function(representation) {
	if (isValid(representation)) {
		return false;
	} else {
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		var error = $("<span>Error: Data is missing, can not display view.</span>");
		error.css('color', 'red');
		qfdiv.append(error);
		resizeParent();
		return true;
	}
};

// Method to create label and representation and move a native component
insertNativeComponent = function(representation, messageNotFound, messageNotStandalone) {
	var body = document.getElementsByTagName("body")[0];
	var div = document.createElement("div");
	//set correct class attributes to be used by JS and native component's css
	div.setAttribute("class", "v-app knime quickformcontainer");
	body.appendChild(div);
	var label = document.createElement("div");
	label.setAttribute("class", "label");
	label.appendChild(document.createTextNode(representation.label));
	div.appendChild(label);
	div.setAttribute("title", representation.description);
	div.setAttribute("aria-label", representation.label);
	div.setAttribute("tabindex", 0);
	var placeHolder = null;
	// check if running on webportal
	if (knimeService && knimeService.isRunningInWebportal()) {
		//set correct class attributes on body element
		var bodyClass = parent.document.getElementsByTagName("body")[0].getAttribute("class");
		body.setAttribute("class", bodyClass);
		// find corresponding native component 
		var component = parent.document.getElementById("element_for_" + window.frameElement.id);
		if (component) {
			// reallocate native component
			div.appendChild(component);
			return component;
		} else {
			// component was not found, but expected, show error message
			placeHolder = createPlaceHolder(messageNotFound);
		}
	} else {
		// native components cannot be present in standalone mode, show message
		placeHolder = createPlaceHolder(messageNotStandalone);
	}
	if (placeHolder) {
		div.appendChild(placeHolder);
		return false;
	}
};

createPlaceHolder = function(message) {
	var element = null;
	if (message) {
		element = document.createElement("div");
		element.appendChild(document.createTextNode(message));
	}
	return element;
};