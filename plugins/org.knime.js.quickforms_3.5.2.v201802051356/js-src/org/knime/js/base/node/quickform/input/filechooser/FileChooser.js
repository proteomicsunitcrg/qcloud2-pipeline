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
 *   Mar 24, 2016 (Christian Albrecht, KNIME AG, Zurich, Switzerland): created
 */
org_knime_js_base_node_quickform_input_filechooser = function() {
	var fileChooser = {
			version: "1.0.0"
	};
	fileChooser.name = "File chooser";
	var m_representation = null;
	var m_value = null;
	var m_viewValid = false;
	var m_errorMessage = null;

	fileChooser.init = function(representation, value) {
		if (checkMissingData(representation)) {
			return;
		}
		m_representation = representation;
		m_value = representation.currentValue;
		// erase default selection when running on server
		if (representation.runningOnServer) {
			m_value.items = [];
		}
		
		//define startsWith function on strings
		if (!String.prototype.startsWith) {
		    String.prototype.startsWith = function(searchString, position){
		      position = position || 0;
		      return this.substr(position, searchString.length) === searchString;
		  };
		}
		
		var qfdiv = $('<div class="quickformcontainer">');
		$('body').append(qfdiv);
		
		qfdiv.attr("title", representation.description);
		qfdiv.attr("aria-label", representation.label);
		qfdiv.append('<div class="label">' + representation.label + '</div>');
		
		if (!representation.tree || representation.tree.length < 1) {
			var errorText = 'No items found for selection. ';
			errorText += representation.runningOnServer ? 
					'Check your settings.' : 
					'View selection only possible on server.';
			representation.tree = [{
				'id': 'emptyTree',
				'text': errorText,
				'icon': null,
				'state': {
					'opened' : false,
					'disabled' : true,
					'selected' : false
				},
				'children': []
			}]
		}
		
		qfdiv.append('<div id="treeContainer" aria-label="' + representation.label + '">');
		$('#treeContainer').jstree({
				'core' : {
					'data' : representation.tree,
					'multiple' : representation.multipleSelection
				}
		});
		
		$('#treeContainer').on("changed.jstree", function (e, data) {
			var selectedItems = [];
			for (var i = 0; i < data.selected.length; i++) {
				var path = data.selected[i];
				var type = getTypeFromSelectedItem(null, path);
				if (m_representation.prefix) {
					path = m_representation.prefix + path;
				}
				var item = {"path": encodeURI(path), "type": type};
				selectedItems.push(item);
			}
			m_value.items = selectedItems;
		});
		
		qfdiv.append($('<br>'));
		m_errorMessage = $('<span>');
		m_errorMessage.css('display', 'none');
		m_errorMessage.css('color', 'red');
		m_errorMessage.css('font-style', 'italic');
		m_errorMessage.css('font-size', '75%');
		m_errorMessage.attr("role", "alert");
		qfdiv.append(m_errorMessage);
		
		resizeParent();
		m_viewValid = true;
	}
	
	getTypeFromSelectedItem = function(node, path) {
		var childNodes;
		if (!node) {
			childNodes = m_representation.tree;
		} else {
			childNodes = node.children;
		}
		if (node && node.id === path) {
			return node.type;
		}
		for (var i = 0; i < childNodes.length; i++) {
			if (path.startsWith(childNodes[i].id)) {
				return getTypeFromSelectedItem(childNodes[i], path);
			}
		}
		return "UNKNOWN";
	}
	
	fileChooser.validate = function() {
		if (!m_viewValid) {
			return false;
		}
		if (m_value.items && m_value.items.length > 0 && m_value.items[0].path) {
			return true;
		} else {
			fileChooser.setValidationErrorMessage("Select at least one item to proceed.");
			return false;
		}
	}
	
	fileChooser.setValidationErrorMessage = function(message) {
		if (!m_viewValid) {
			return;
		}
		if (message != null) {
			m_errorMessage.text(message);
			m_errorMessage.css('display', 'inline');
		} else {
			m_errorMessage.text('');
			m_errorMessage.css('display', 'none');
		}
		resizeParent();
	}
	
	fileChooser.value = function() {
		if (!m_viewValid) {
			return null;
		}
		return m_value;
	}
	
	return fileChooser;
}();