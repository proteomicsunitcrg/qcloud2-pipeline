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
 *   Sep 28, 2016 (Christian Albrecht, KNIME.com Gmbh, Konstanz, Germany): created
 */
org_knime_js_base_node_quickform_input_slider = function() {
	var sliderInput = {
			version: "1.0.0"
	};
	sliderInput.name = "Slider input";
	var viewRepresentation;
	var errorMessage;
	var viewValid = false;
	var slider;

	sliderInput.init = function(representation) {
		if (checkMissingData(representation) && checkMissingData(representation.sliderSettings)) {
			return;
		}
		viewRepresentation = representation;
		var settings = representation.sliderSettings;
		var body = $('body');
		var qfdiv = $('<div class="quickformcontainer">');
		body.append(qfdiv);
		qfdiv.attr("title", representation.description);
		qfdiv.append('<div class="label">' + representation.label + '</div>');
		var sliderContainer = $('<div class="slidercontainer">');
		qfdiv.append(sliderContainer);
		slider = $('<div>').appendTo(sliderContainer).get(0);
		setNumberFormatOptions(settings);
		noUiSlider.create(slider, settings);
		if (settings.orientation == 'vertical') {
			//TODO: make configurable
			slider.style.height = '500px';
			var pad = document.getElementsByClassName('noUi-handle')[0].offsetHeight / 2 + 'px';
			sliderContainer.css({'padding-top': pad, 'padding-bottom': pad});
		}
		var maxTipWidth = 0;
		var maxTipHeight = 0;
		if (settings.tooltips && settings.tooltips.length > 0) {
			var tip = document.getElementsByClassName('noUi-tooltip')[0];
			// assume that the maximum length of the tooltip is either at the minimum or maximum
			slider.noUiSlider.set([settings.range.min]);
			var tipStyle = getComputedStyle(tip);
			var tipBorderHor = parseFloat(tipStyle.borderLeftWidth) + parseFloat(tipStyle.borderRightWidth);
			var tipBorderVer = parseFloat(tipStyle.borderTopWidth) + parseFloat(tipStyle.borderBottomWidth);
			maxTipWidth = Math.max(maxTipWidth, tip.offsetWidth + tipBorderHor);
			maxTipHeight = Math.max(maxTipHeight, tip.offsetHeight + tipBorderVer);
			
			slider.noUiSlider.set([settings.range.max]);
			tipStyle = getComputedStyle(tip);
			tipBorderHor = parseFloat(tipStyle.borderLeftWidth) + parseFloat(tipStyle.borderRightWidth);
			tipBorderVer = parseFloat(tipStyle.borderTopWidth) + parseFloat(tipStyle.borderBottomWidth);
			maxTipWidth = Math.max(maxTipWidth, tip.offsetWidth + tipBorderHor);
			maxTipHeight = Math.max(maxTipHeight, tip.offsetHeight + tipBorderVer);

			if (settings.orientation == 'vertical') {
				//account for 120% right
				sliderContainer.css('padding-left', (1.2 * maxTipWidth) + 'px');
			} else {
				//TODO: calculate based on tooltip height?
				sliderContainer.css('padding-top', '38px');
				var padSide = Math.max(parseFloat(getComputedStyle(sliderContainer.get(0)).paddingLeft), maxTipWidth/2) + 'px';
				sliderContainer.css({'padding-left': padSide, 'padding-right': padSide});
			}
		}
		var maxLabelWidth = 0;
		if (settings.pips && settings.pips.mode) {
			var testElem = [document.getElementsByClassName('noUi-value')[0]];
			testElem.push(Array.prototype.slice.call(document.getElementsByClassName('noUi-value'), -1)[0]);
			maxLabelWidth = Math.max(testElem[0].offsetWidth, testElem[1].offsetWidth);
			if (settings.orientation == 'vertical') {
				//TODO: right-padding?
			} else {
				sliderContainer.css('padding-bottom', '40px');
				//select first element
				var padSide = Math.max(parseFloat(getComputedStyle(sliderContainer.get(0)).paddingLeft), maxLabelWidth / 2) + 'px';
				sliderContainer.css({'padding-left': padSide, 'padding-right': padSide});
			}
		}
		var doubleValue = representation.currentValue.double;
		slider.noUiSlider.set([doubleValue]);
		qfdiv.append($('<br>'));
		errorMessage = $('<span>');
		errorMessage.css('display', 'none');
		errorMessage.css('color', 'red');
		errorMessage.css('font-style', 'italic');
		errorMessage.css('font-size', '75%');
		qfdiv.append(errorMessage);
		resizeParent();
		viewValid = true;
	};
	
	setNumberFormatOptions = function(settings) {
		if (settings.tooltips) {
			for (var i = 0; i < settings.tooltips.length; i++) {
				if (typeof settings.tooltips[i] == 'object') {
					for (var key in settings.tooltips[i]) {
						if (typeof settings.tooltips[i][key] === 'string') {
							// replace all whitespace characters with no breaking space
							settings.tooltips[i][key] = settings.tooltips[i][key].replace(/\s/g,"&nbsp;");
						}
					}
					settings.tooltips[i] = wNumb(settings.tooltips[i]);
				}
			}
		}
		if (settings.pips && settings.pips.format) {
			for (var key in settings.pips.format) {
				if (typeof settings.pips.format[key] === 'string') {
					// replace all whitespace characters with no breaking space
					settings.pips.format[key] = settings.pips.format[key].replace(/\s/g,"&nbsp;");
				}
			}
			settings.pips.format = wNumb(settings.pips.format);
		}
	}
	
	sliderInput.validate = function() {
		if (!viewValid) {
			return false;
		}
		var min = viewRepresentation.sliderSettings.range.min[0];
		var max = viewRepresentation.sliderSettings.range.max[0];
		var value = slider.noUiSlider.get();
		if (!$.isNumeric(value)) {
			doubleInput.setValidationErrorMessage('The set value is not a double');
			return false;
		}
		value = parseFloat(value);
		if (viewRepresentation.usemin && value<min) {
			sliderInput.setValidationErrorMessage("The set double " + value + " is smaller than the allowed minimum of " + min);
			return false;
		} else if (viewRepresentation.usemax && value>max) {
			sliderInput.setValidationErrorMessage("The set double " + value + " is bigger than the allowed maximum of " + max);
			return false;
		} else {
			sliderInput.setValidationErrorMessage(null);
			return true;
		}
	};
	
	sliderInput.setValidationErrorMessage = function(message) {
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
	};

	sliderInput.value = function() {
		if (!viewValid) {
			return null;
		}
		var viewValue = new Object();
		viewValue.double = slider.noUiSlider.get();
		return viewValue;
	};
	
	return sliderInput;
	
}();
