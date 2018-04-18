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
 *  KNIME and ECLIPSE being a combined program, KNIME AG herewith grants
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
org_knime_js_base_node_quickform_filter_slider = function() {
	var sliderFilter = {
			version: "1.0.0"
	};
	sliderFilter.name = "Slider Filter";
	var _representation, _value;
	var errorMessage;
	var viewValid = false;
	var slider;

	sliderFilter.init = function(representation, value) {
		
		_representation = representation;
		_value = value;
		var settings = representation.sliderSettings;
		
		var body = document.getElementsByTagName('body')[0];
		
		var sliderContainer = document.createElement('div');
		sliderContainer.setAttribute('class', 'slidercontainer');
		
		body.appendChild(sliderContainer);
		slider = document.createElement('div');
		sliderContainer.appendChild(slider);
		setNumberFormatOptions(settings);
		setStartValuesToRange(settings);
		noUiSlider.create(slider, settings);
		if (settings.orientation == 'vertical') {
			//TODO: make configurable
			slider.style.height = '500px';
			var pad = document.getElementsByClassName('noUi-handle')[0].offsetHeight / 2 + 'px';
			sliderContainer.style.paddingTop = sliderContainer.style.paddingBottom = pad;
		}
		var maxTipWidth = 0;
		var maxTipHeight = 0;
		if (settings.tooltips && settings.tooltips.length > 0) {
			var tips = document.getElementsByClassName('noUi-tooltip');
			if (tips.length == 1) {
				slider.noUiSlider.set([settings.range.min, settings.range.min]);
			}
			for (var i = 0; i < tips.length; i++) {
				var tipStyle = getComputedStyle(tips[i]);
				var tipBorderHor = parseFloat(tipStyle.borderLeftWidth) + parseFloat(tipStyle.borderRightWidth);
				var tipBorderVer = parseFloat(tipStyle.borderTopWidth) + parseFloat(tipStyle.borderBottomWidth);
				maxTipWidth = Math.max(maxTipWidth, tips[i].offsetWidth + tipBorderHor);
				maxTipHeight = Math.max(maxTipHeight, tips[i].offsetHeight + tipBorderVer);
			}
			if (tips.length == 1) {
				slider.noUiSlider.set([settings.range.max, settings.range.max]);
				var tipStyle = getComputedStyle(tips[0]);
				var tipBorderHor = parseFloat(tipStyle.borderLeftWidth) + parseFloat(tipStyle.borderRightWidth);
				var tipBorderVer = parseFloat(tipStyle.borderTopWidth) + parseFloat(tipStyle.borderBottomWidth);
				maxTipWidth = Math.max(maxTipWidth, tips[0].offsetWidth + tipBorderHor);
				maxTipHeight = Math.max(maxTipHeight, tips[0].offsetHeight + tipBorderVer);
			}
			if (settings.orientation == 'vertical') {
				//account for 120% right
				sliderContainer.style.paddingLeft = (1.2 * maxTipWidth) + 'px';
			} else {
				//TODO: calculate based on tooltip height?
				sliderContainer.style.paddingTop = '38px';
				var padSide = Math.max(parseFloat(getComputedStyle(sliderContainer).paddingLeft), maxTipWidth/2) + 'px';
				sliderContainer.style.paddingLeft = sliderContainer.style.paddingRight = padSide;
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
				sliderContainer.style.paddingBottom = "40px";
				//select first element
				var padSide = Math.max(parseFloat(getComputedStyle(sliderContainer).paddingLeft), maxLabelWidth / 2) + 'px';
				sliderContainer.style.paddingLeft = sliderContainer.style.paddingRight = padSide;
			}
		}
		
		if (value.filter && value.filter.columns) {
			var filter = value.filter.columns[0];
			var startValue = [filter.minimum, filter.maximum];
			slider.noUiSlider.set(startValue);
		}
		
		if (representation.disabled) {
			// domain column is not present, slider would have no effect
			slider.setAttribute('disabled', true);
		} else {
			if (knimeService && knimeService.isInteractivityAvailable()) {
				if (_value.filter && _value.filter.columns) {
					knimeService.addToFilter(representation.tableId, _value.filter);
				}
				slider.noUiSlider.on('set', function() {
					if (setFilterOnValue()) {
						knimeService.addToFilter(representation.tableId, _value.filter);
					}
				});
			}
		}
		
		if (typeof representation.label == 'string' && '' != representation.label) {
			var label = document.createElement('div');
			label.setAttribute('class', 'label');
			if (settings.orientation == 'vertical') {
				label.setAttribute('class', label.getAttribute('class') + ' vertical');
				label.style.width = '500px';
				var sliderStyle = getComputedStyle(sliderContainer);
				var sliderPadding = parseFloat(sliderStyle.paddingLeft);
				var connectWidth = getComputedStyle(document.getElementsByClassName('noUi-target')[0]).width;
				var pipsWidth = 0;
				if (settings.pips && settings.pips.mode) {
					var pipsStyle = getComputedStyle(document.getElementsByClassName('noUi-pips')[0]);
					pipsWidth = parseFloat(pipsStyle.paddingLeft) + parseFloat(pipsStyle.paddingRight);
				}
				var sliderWidth = sliderPadding + parseFloat(connectWidth) + pipsWidth + maxLabelWidth;
				label.style.marginLeft = sliderWidth + 'px';
				label.style.paddingLeft = sliderStyle.paddingTop;
				label.style.paddingRight = sliderStyle.paddingBottom;
			}
			label.appendChild(document.createTextNode(representation.label));
			body.appendChild(label);
		}
		body.append(document.createElement('br'));
		errorMessage = document.createElement('span');
		errorMessage.style.display = 'none';
		errorMessage.style.color = 'red';
		errorMessage.style.fontStyle = 'italic';
		errorMessage.style.fontSize = '75%';
		body.append(errorMessage);
	};
	
	setNumberFormatOptions = function(settings) {
		if (settings.tooltips) {
			for (var i = 0; i < settings.tooltips.length; i++) {
				if (typeof settings.tooltips[i] == 'object') {
					settings.tooltips[i] = wNumb(settings.tooltips[i]);
				}
			}
		}
		if (settings.pips && settings.pips.format) {
			settings.pips.format = wNumb(settings.pips.format);
		}
	}
	
	setStartValuesToRange = function(settings) {
		if (settings.tooltips && settings.tooltips.length > 0) {
			if (settings.tooltips[0]) {
				settings.start[0] = settings.range.min;
			}
			if (settings.tooltips.length > 1 && settings.tooltips[1]) {
				settings.start[1] = settings.range.max;
			}
		}
	}
	
	setFilterOnValue = function() {
		var changed = true;
		if (!_value.filter) {
			_value.filter = {"id": _representation.filterId, "columns": []}
			_value.filter.columns.push({"minimum": null, "maximum": null});
		}
		var sliderValues = slider.noUiSlider.get();
		if (_value.filter.columns[0].minimum == sliderValues[0] && _value.filter.columns[0].maximum == sliderValues[1]) {
			changed = false;
		}
		_value.filter.columns[0].minimum = sliderValues[0];
		_value.filter.columns[0].maximum = sliderValues[1];
		return changed;
	}
	
	sliderFilter.validate = function() {
		var sliderValues = slider.noUiSlider.get();
		var min = sliderValues[0];
		var max = sliderValues[1];
		var range = _representation.sliderSettings.range;
		var rangeMin = range.min[0];
		var rangeMax = range.max[0];
		if (min < rangeMin || max < rangeMin) {
			sliderFilter.setValidationErrorMessage("One value is smaller than the allowed minimum of " + rangeMin);
			return false;
		}
		if (min > rangeMax || max > rangeMax) {
			sliderFilter.setValidationErrorMessage("One value is larger than the allowed maximum of " + rangeMax);
			return false;
		}
		return true;
	};
	
	sliderFilter.setValidationErrorMessage = function(message) {
		/* show message in alert */
		if (message) {
			alert(message);
		}
	};

	sliderFilter.value = function() {
		setFilterOnValue();
		return _value;
	};
	
	return sliderFilter;
	
}();
