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
org_knime_js_base_node_quickform_input_date = function() {
	var dateInput = {
			version: "1.0.0"
	};
	dateInput.name = "Date input";
	var viewRepresentation;
	var dateInput;
	var hourInput;
	var minInput;
	var errorMessage;
	var date;
	var minDate;
	var maxDate;
	var viewValid = false;

	dateInput.init = function(representation) {
		if (checkMissingData(representation)) {
			return;
		}
		viewRepresentation = representation;
		var dateValue = representation.currentValue.date;
		date = new Date(dateValue);
		minDate = viewRepresentation.usemin ? new Date(viewRepresentation.min) : null;
		maxDate = viewRepresentation.usemax ? new Date(viewRepresentation.max) : null;
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		var dateElement = $('<div style="display:inline-block">');
		var timeElement = $('<div style="display:inline-block">');
		
		dateElement.append('Date: ');
		dateInput = $('<input>');
		dateInput.attr("aria-label", representation.label + " - date field");
		qfdiv.attr("title", representation.description);
		qfdiv.attr("aria-label", representation.label);
		qfdiv.append('<div class="label">' + representation.label + '</div>');
		dateElement.append(dateInput);
		dateInput.datepicker({
			showAnim : "",
			dateFormat : "yy-mm-dd",
			changeYear : true,
			onSelect: function(dateText) {
				var newDate = $(this).datepicker('getDate');
				date.setFullYear(newDate.getFullYear());
				date.setMonth(newDate.getMonth());
				date.setDate(newDate.getDate());
				refreshTime();
				$(this).blur();
			}
		});
		if (viewRepresentation.usemin) {
			dateInput.datepicker('option', 'minDate', new Date(viewRepresentation.min));
		}
		if (viewRepresentation.usemax) {
			dateInput.datepicker('option', 'maxDate', new Date(viewRepresentation.max));
		}
		qfdiv.append(dateElement);
		qfdiv.append($('<br>'));
		
		timeElement.append('Time: ');
		hourInput = $('<input>');
		hourInput.attr("aria-label", "Hours");
		timeElement.append(hourInput);
		hourInput.spinner({
			spin: function(event, ui) {
				date.setHours(ui.value);
				refreshTime();
				return false;
			}
		});

		timeElement.append(' <b>:</b> ');
		minInput = $('<input>');
		minInput.attr("aria-label", "Minutes");
		timeElement.append(minInput);
		minInput.spinner({
			spin: function(event, ui) {
				date.setMinutes(ui.value);
				refreshTime();
				return false;
			}
		});
		
		qfdiv.append(timeElement);
		if (!representation.withtime) {
			timeElement.css('display', 'none');
		}
		qfdiv.append($('<br>'));
		errorMessage = $('<span>');
		errorMessage.css('display', 'none');
		errorMessage.css('color', 'red');
		errorMessage.css('font-style', 'italic');
		errorMessage.css('font-size', '75%');
		errorMessage.attr("role", "alert");
		qfdiv.append(errorMessage);
		
		var allInputs = $('input');
		allInputs.height(20);
		allInputs.width(20);
		dateInput.width(108);
		dateInput.css('border', '1px solid silver');
		dateInput.css('margin-bottom', '10px');
		allInputs.css('font-size', 'medium');
		allInputs.attr('readonly', 'true');
		allInputs.css('background-color', 'white');
		
		refreshTime();
		dateInput.blur(callUpdate);
		hourInput.blur(callUpdate);
		minInput.blur(callUpdate);
		resizeParent();
		// Automatically resize component on interval
		setInterval(resizeParent, 500);
		viewValid = true;
	};

	dateInput.value = function() {
		if (!viewValid) {
			return null;
		}
		var viewValue = new Object();
		viewValue.date = date.getTime();
		return viewValue;
	};
	
	function refreshTime() {
		if (minDate!=null && date<minDate) {
			date = new Date(minDate.getTime());
		} else if (maxDate!=null && date>maxDate) {
			date = new Date(maxDate.getTime());
		}
		// If datepicker is not disabled setDate will reopen the picker in IE
		dateInput.datepicker('disable');
		dateInput.datepicker('setDate', date);
		dateInput.datepicker('enable');
		hourInput.val(date.getHours());
		minInput.val(date.getMinutes());
	}
	
	return dateInput;
	
}();
