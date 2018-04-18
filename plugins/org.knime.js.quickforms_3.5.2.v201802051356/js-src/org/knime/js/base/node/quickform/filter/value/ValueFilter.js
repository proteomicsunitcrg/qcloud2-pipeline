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
org_knime_js_base_node_quickform_filter_value = function() {
	var valueFilter = {
			version: "1.0.0"
	};
	valueFilter.name = "Value filter";
	var viewRepresentation;
	var colselection;
	var selector;
	var viewValid = false;

	valueFilter.init = function(representation) {
		if (checkMissingData(representation)) {
			return;
		}
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		qfdiv.attr('title', representation.description);
		qfdiv.attr("aria-label", representation.label);
		qfdiv.append('<div class="label">' + representation.label + '</div>');
		viewRepresentation = representation;
		if (viewRepresentation.possibleValues == null) {
			qfdiv.append("Error: No data available");
		} else {
			var columnSelection = viewRepresentation.currentValue.column;
			if (!viewRepresentation.possibleValues[columnSelection]) {
				// get first column from possibleValues if spec changed
				for(var col in viewRepresentation.possibleValues) break;
				columnSelection = col;
			}
			if (!columnSelection) {
				qfdiv.append("Error: No column available for selection.");
				return;
			}
			if (!viewRepresentation.lockColumn) {
				colselection = $('<select>');
				colselection.addClass('dropdown');
				colselection.css('margin', '0px 0px 5px 0px');
				qfdiv.append(colselection);
				qfdiv.append($('<br>'));
				for ( var key in viewRepresentation.possibleValues) {
					var option = $('<option>' + key + '</option>');
					option.appendTo(colselection);
					if (key == columnSelection) {
						option.prop('selected', true);
					}
					option.blur(callUpdate);
				}
				colselection.change(selectionChanged);
			}
			if (viewRepresentation.type == 'Check boxes (vertical)') {
				selector = new checkBoxesMultipleSelections(true);
			} else if (viewRepresentation.type == 'Check boxes (horizontal)') {
				selector = new checkBoxesMultipleSelections(false);
			} else if (viewRepresentation.type == 'List') {
				selector = new listMultipleSelections();
			} else {
				selector = new twinlistMultipleSelections();
			}
			qfdiv.append(selector.getComponent());
			if ((representation.type == 'List' || representation.type == 'Twinlist') && representation.limitNumberVisOptions) {
				selector.setChoices(viewRepresentation.possibleValues[columnSelection], representation.numberVisOptions);				
			} else {
				selector.setChoices(viewRepresentation.possibleValues[columnSelection]);
			}
			selector.setSelections(viewRepresentation.currentValue.values);
			selector.addValueChangedListener(callUpdate);
		}
		resizeParent();
		viewValid = true;
	};

	valueFilter.value = function() {
		if (!viewValid) {
			return null;
		}
		var viewValue = new Object();
		viewValue.values = selector.getSelections();
		if (!viewRepresentation.lockColumn) {
			viewValue.column = colselection.find(':selected').text();
		} else {
			viewValue.column = viewRepresentation.currentValue.column;
		}
		return viewValue;
	};

	function selectionChanged() {
		var col = colselection.find(':selected').text();
		selector.setChoices(viewRepresentation.possibleValues[col]);
		selector.setSelection([]);
	}
	
	return valueFilter;
	
}();
