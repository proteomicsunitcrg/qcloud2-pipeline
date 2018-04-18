(pie_chart_namespace = function() {

	var pie = {};
	var _representation, _value;
	var layoutContainer;
	var MIN_HEIGHT = 200, MIN_WIDTH = 300;
	var chart, svg;
	var knimeTable;
	
	var plotData;
	var colorRange;
	var excludeCat;
	var missValCatValue;
	
	var showWarnings;
	
	var MISSING_VALUES_ONLY = "missingValuesOnly";
	var NO_DATA_AVAILABLE = "noDataAvailable";

	pie.init = function(representation, value) {
		_representation = representation;
		_value = value;
		
		showWarnings = _representation.options.showWarnings;
		
		if (_representation.warnMessage && showWarnings) {
			knimeService.setWarningMessage(_representation.warnMessage);
		}

		drawChart(false);
		if (_representation.options.enableViewControls) {
			drawControls();
		}
	}

	function drawChart(redraw) {		
		// Parse the options
		var optTitle = _value.options["title"];
		var optSubtitle = _value.options["subtitle"];

		var showLabels = _value.options["showLabels"];
		var labelThreshold = _representation.options["labelThreshold"];
		var labelType = _value.options["labelType"].toLowerCase();
				
		var optDonutChart = _value.options["togglePie"];
		var holeSize = _value.options["holeSize"];
		var optInsideTitle = _value.options["insideTitle"];

		var showLegend = _representation.options["legend"];

		var optFullscreen = _representation.options["svg"]["fullscreen"] && _representation.runningInView;
		var optWidth = _representation.options["svg"]["width"]
		var optHeight = _representation.options["svg"]["height"]
		
		var isTitle = optTitle || optSubtitle;

		/*
		 * Setup interactive controls
		 */

		d3.selectAll("html, body").style("width", "100%").style("height",
				"100%").style("margin", "0").style("padding", "0");

		var body = d3.select("body");

		var width = optWidth + "px";
		var height = optHeight + "px";
		if (optFullscreen) {
			width = "100%";
			height = (isTitle) ? "100%" : "calc(100% - " + knimeService.headerHeight() + "px)";
		}
		
		var div;
		if (redraw) {
			d3.select("svg").remove();
			div = d3.select("#svgContainer");
		} else {
			layoutContainer = body.append("div")
				.attr("id", "layoutContainer")
				.style('display', 'block')
				.style("width", width)
				.style("height", height)
				.style("min-width", MIN_WIDTH + "px")
				.style("min-height", MIN_HEIGHT + "px");		
			
			div = layoutContainer.append("div")
				.attr("id", "svgContainer")
				.style("min-width", MIN_WIDTH + "px")
				.style("min-height", MIN_HEIGHT + "px")
				.style("box-sizing", "border-box")
				.style("overflow", "hidden")
				.style("margin", "0");
		}

		/*
		 * Process data
		 */
		knimeTable = new kt();
		// Add the data from the input port to the knimeTable.
		var port0dataTable = _representation.inObjects[0];
		knimeTable.setDataTable(port0dataTable);
		
		processData(true);	
		setColorRange();
		
		// Create the SVG object
		var svg1 = document
				.createElementNS('http://www.w3.org/2000/svg', 'svg');
		div[0][0].appendChild(svg1);

		svg = d3.select("svg")
			.style("font-family", "sans-serif")
			.style("display", "block");

		if (!optFullscreen) {
			if (optWidth > 0) {
				div.style("width", optWidth + "px")
				svg.attr("width", optWidth);
			}
			if (optHeight > 0) {
				svg.attr("height", optHeight);
				div.style("height", optHeight + "px");
			}
		} else {
			// Set full screen height/width
			div.style("width", "100%");
			div.style("height", height);

			svg.attr("width", "100%");
			svg.attr("height", "100%");
		}
	
		// Pie chart
		nv.addGraph(function() {
			chart = nv.models.pieChart()
				.x(function(d) { return d.label })
				.y(function(d) { return d.value })
				.color(colorRange)
				.duration(300)
				.showLegend(showLegend)
				.showLabels(showLabels)
				.labelThreshold(labelThreshold) 
				.labelType(labelType); // "key", "value" or "percent"
			
			chart.width(optFullscreen ? "100%" : optWidth);
			chart.height(optFullscreen ? "100%" : optHeight);
			chart.margin({top: 0, bottom: 0, left: 20, right: 0});

			// TODO: Add a mechanism to remember the categories that are
			// switched on.

			chart.donut(optDonutChart);
			chart.donutRatio(holeSize);
			if (optInsideTitle) {
				chart.title(optInsideTitle);
			}
			updateTitles(false);

			svg.datum(plotData).transition().duration(300).call(chart);
			nv.utils.windowResize(chart.update);

			return chart;
		});
	}
	
	function updateData(updateChart) {
		processData();
		if (updateChart) {
			chart.update();
		}
	}
	
	function updateTitles(updateChart) {
		if (chart) {
			var curTitle = d3.select("#title");
			var curSubtitle = d3.select("#subtitle");
			var chartNeedsUpdating = curTitle.empty() != !(_value.options.title) 
				|| curSubtitle.empty() != !(_value.options.subtitle);
			if (!_value.options.title) {
				curTitle.remove();
			}
			if (_value.options.title) {
				if (curTitle.empty()) {
					svg.append("text")
						.attr("x", 20)             
						.attr("y", 30)
						.attr("font-size", 24)
						.attr("id", "title")
						.text(_value.options.title);
				} else {
					curTitle.text(_value.options.title);
				}
			}
			if (!_value.options.subtitle) {
				curSubtitle.remove();
			} 
			if (_value.options.subtitle) {
				if (curSubtitle.empty()) {
					svg.append("text")
						.attr("x", 20)             
						.attr("y", _value.options.title ? 46 : 20)
						.attr("font-size", 12)
						.attr("id", "subtitle")
						.text(_value.options.subtitle);
				} else {
					curSubtitle.text(_value.options.subtitle)
					.attr("y", _value.options.title ? 46 : 20);
				}
			}
			
			var topMargin = 10;
			topMargin += _value.options.title ? 10 : 0;
			topMargin += _value.options.subtitle ? 8 : 0;
			chart.legend.margin({top: topMargin, bottom: topMargin});
			chart.margin({top: topMargin, bottom: topMargin});
			
			var isTitle = _value.options.title || _value.options.subtitle;
			knimeService.floatingHeader(isTitle);			
		
			
			if (updateChart && chartNeedsUpdating) {
				if (_representation.options.svg.fullscreen && _representation.runningInView ) {
					var height = (isTitle) ? "100%" : "calc(100% - " + knimeService.headerHeight() + "px)";
					layoutContainer.style("height", height)
						// two rows below force to invalidate the container which solves a weird problem with vertical scroll bar in IE
						.style('display', 'none')
						.style('display', 'block');
					d3.select("#svgContainer").style("height", height); 
				}
				chart.update();
			}
		}
	}
	
	processData = function(setColorRange) {
		var optMethod = _representation.options["aggr"];
		var optCat = _representation.options["cat"];
		var optFreqCol = _value.options["freq"];
		
		var categories = knimeTable.getColumn(optCat);
		
		var valCol;
		if (optMethod == "Occurence\u00A0Count") {
			valCol = knimeTable.getColumn(1);
		} else {
			valCol = knimeTable.getColumn(optFreqCol);
		}
		
		plotData = [];
		excludeCat = [];
		missValCatValue = undefined;
		if (valCol.length > 0) {
			var numDataPoints = valCol.length;
			for (var i = 0; i < numDataPoints; i++) {
				var label = categories[i];
				var value = valCol[i];
				
				if (label === null) {
					// missing values category					
					// save the value to append as the last item						
					missValCatValue = value;					
					continue;
				}
				
				if (value === null) {
					// category has only missing values - exclude it
					excludeCat.push(label);					
					continue;
				}
				
				var plotStream = {
					"label" : label,
					"value" : Math.abs(value)  // take abs value to prevent a damaged plot
				};				
				plotData.push(plotStream);
			}
		}
		
		processMissingValues(false);
	}
	
	setColorRange = function() {
		var numCat = plotData.length;
		if (missValCatValue !== undefined && missValCatValue !== null) {
			// We don't want the option "includeMissValCat" to influence on the number of categories,
			// because the option can be changed in the view and the color scale then can also be changed (if a border case) - and we don't want this.
			// Hence, only the real value matters.
			numCat++;
		}
		if (_representation.options.customColors) {
			colorRange = [];
			for (var i = 0; i < numCat; i++) {
				var color = knimeTable.getRowColors()[i];
				if (!color) {
					color = "#7C7C7C";
				}
				colorRange.push(color);
			}
		} else {
			var colorScale;
			if (numCat > 10) {
				colorScale = d3.scale.category20();
			} else {
				colorScale = d3.scale.category10();
			}
			colorRange = colorScale.range();
		}
	}
	
	/**
	 * switched - if the chart update was triggered by changing the "include 'Missing values' category" option in the view
	 */
	processMissingValues = function(switched) {
		// Missing values post-processing	
		if (missValCatValue !== undefined) {  // undefined means there's no missing value in the category column at all
			if (_value.options.includeMissValCat && _representation.options.reportOnMissingValues) {
				// add missing values category
				var label = "Missing values";
				if (missValCatValue !== null) {
					plotData.push({"label": label, "value": missValCatValue});
				} else {
					excludeCat.push(label);
				}
			} else if (switched) {
				// remove missing values category, but only if we have triggered switch from the view
				// otherwise there's nothing to remove yet
				if (missValCatValue !== null) {
					plotData.pop();
				} else {
					excludeCat.pop();
				}
			}
		}

		// Set warning messages
		if (!showWarnings) {
			return;
		}
		if (plotData.length == 0) {
			// No data available warnings
			var str;
			if (missValCatValue !== undefined && missValCatValue !== null && _representation.options.reportOnMissingValues) {
				str = "No chart was generated since the frequency column has only missing values.\nThere are values where the category name is missing.\nTo see them switch on the option \"Include 'Missing values' category\" in the view settings.";
			} else {
				str = "No chart was generated since the frequency column has only missing values or empty.\nRe-run the workflow with different data.";
			}
			knimeService.setWarningMessage(str, NO_DATA_AVAILABLE);
		} else if (excludeCat.length > 0 && _representation.options.reportOnMissingValues) {
			knimeService.setWarningMessage("Categories '" + excludeCat.join("', '") + "' have only missing values in the frequency column and were excluded from the view.", MISSING_VALUES_ONLY)
		} else {
			knimeService.clearWarningMessage(MISSING_VALUES_ONLY);
		}	
	}
		
	drawControls = function() {		
		if (!knimeService) {
			// TODO: error handling?
			return;
		}
		
		if (_representation.displayFullscreenButton) {
			knimeService.allowFullscreen();
		}
		
	    if (!_representation.options.enableViewControls) return;
	    
	    var titleEdit = _representation.options.enableTitleEdit;
		var subtitleEdit = _representation.options.enableSubtitleEdit;
		var donutToggle = _representation.options.enableDonutToggle;
		var holeEdit = _representation.options.enableHoleEdit;
		//var insideTitleEdit = _representation.options.enableInsideTitleEdit;
		//var colChooser = _representation.options.enableColumnChooser;
		var labelEdit = _representation.options.enableLabelEdit;
		var switchMissValCat = _representation.options.enableSwitchMissValCat;
	    
	    if (titleEdit || subtitleEdit) {	    	    
	    	if (titleEdit) {
	    		var chartTitleText = knimeService.createMenuTextField('chartTitleText', _value.options.title, function() {
	    			if (_value.options.title != this.value) {
						_value.options.title = this.value;
						updateTitles(true);
					}
	    		}, true);
	    		knimeService.addMenuItem('Chart Title:', 'header', chartTitleText);
	    	}
	    	if (subtitleEdit) {
	    		var chartSubtitleText = knimeService.createMenuTextField('chartSubtitleText', _value.options.subtitle, function() {
	    			if (_value.options.subtitle != this.value) {
						_value.options.subtitle = this.value;
						updateTitles(true);
					}
	    		}, true);
	    		var mi = knimeService.addMenuItem('Chart Subtitle:', 'header', chartSubtitleText, null, knimeService.SMALL_ICON);
	    	}	
	    	if (/*colChooser ||*/ labelEdit || donutToggle || holeEdit /*|| insideTitleEdit*/) {
	    		knimeService.addMenuDivider();
	    	}
	    }
	    
	    /*if (colChooser) {
	    	// filter out non number columns
	    	var colNames = _representation.inObjects[0].spec.colNames;
			var colTypes = _representation.inObjects[0].spec.colTypes;
			var numberColumns = [];
			for (var i = 0; i < colNames.length; i++) {
				if (colTypes[i] == "number") {
					numberColumns.push(colNames[i]);					
				}
			}
    		var colSelect = knimeService.createMenuSelect('columnSelect', _value.options.freq, numberColumns, function() {
    			_value.options.freq = this.value;
				updateData(true);
    		});
    		knimeService.addMenuItem('Column:', 'minus-square fa-rotate-90', colSelect);
    		
    		if (labelEdit || donutToggle || holeEdit || insideTitleEdit) {
	    		knimeService.addMenuDivider();
	    	}
        }*/
	    
	    if (labelEdit) {
	    	var labelCbx = knimeService.createMenuCheckbox('labelCbx', _value.options.showLabels, function () {
	    		if (_value.options.showLabels != this.checked) {
					_value.options.showLabels = this.checked;
					chart.showLabels(this.checked);
					d3.selectAll("#labelType input").property("disabled", !_value.options.showLabels);
					//workaround for nvd3 bug, remove labels manually
					if (!this.checked) {
						d3.selectAll(".nv-pieLabels *").remove();
					}
					chart.update();
				}
	    	});
	    	knimeService.addMenuItem('Show labels:', 'comment-o', labelCbx);
	    	
	    	var labelTypeRadio = knimeService.createInlineMenuRadioButtons('labelType', 'labelType', 'Value', ['Key', 'Value', 'Percent'], function() {
	    		_value.options.labelType = this.value;
				chart.labelType(this.value.toLowerCase());
				chart.update();
	    	});
	    	knimeService.addMenuItem('Label type:', 'commenting-o', labelTypeRadio);
	    	
		    if (switchMissValCat || donutToggle || holeEdit || insideTitleEdit) {
	    		knimeService.addMenuDivider();
	    	}
	    }
	    
	    if (switchMissValCat && missValCatValue !== undefined && _representation.options.reportOnMissingValues) {
	    	var switchMissValCatCbx = knimeService.createMenuCheckbox('switchMissValCatCbx', _value.options.includeMissValCat, function() {
	    		if (_value.options.includeMissValCat != this.checked) {
	    			_value.options.includeMissValCat = this.checked;
	    			processMissingValues(true);
	    			chart.update();
	    		}
	    	});
	    	knimeService.addMenuItem("Include 'Missing values' category: ", 'question', switchMissValCatCbx);
	    	
	    	if (donutToggle || holeEdit || insideTitleEdit) {
	    		knimeService.addMenuDivider();
	    	}
	    }
	    
	    if (donutToggle || holeEdit /*|| insideTitleEdit*/) {
	    	if (donutToggle) {
		    	var donutCbx = knimeService.createMenuCheckbox('donutCbx', _value.options.togglePie, function () {
		    		if (_value.options.togglePie != this.checked) {
						_value.options.togglePie = this.checked;
						chart.donut(this.checked);
						d3.selectAll("#insideTitleText, #holeRatioText").property("disabled", !_value.options.togglePie);
						chart.update();
					}
		    	});
		    	knimeService.addMenuItem('Render donut chart:', knimeService.createStackedIcon('gear', 'circle-o'), donutCbx);
	    	}
	    	
	    	if (holeEdit) {
	    		var holeRatioText = knimeService.createMenuTextField('holeRatioText', _value.options.holeSize, function() {
	    			if (this.value < 0) {
    					this.value = 0;
    				} else if (this.value > 1) {
    					this.value = 1;
    				}
    				chart.donutRatio(this.value);
    				chart.update();
	    		}, true);
	    		holeRatioText.setAttribute("type", "number");
	    		holeRatioText.setAttribute("min", 0);
	    		holeRatioText.setAttribute("max", 1);
	    		holeRatioText.setAttribute("step", 0.1);
	    		holeRatioText.disabled = !_value.options.togglePie;
	    		knimeService.addMenuItem('Donut hole ratio:', 'adjust', holeRatioText);
	    	}
	    	
	    	/*if (insideTitleEdit) {
	    		var insideTitleText = knimeService.createMenuTextField('insideTitleText', _value.options.insideTitle, function() {
	    			if (_value.options.insideTitle != this.value) {
						_value.options.insideTitle = this.value;
						chart.title(this.value);
						chart.update();
					}
	    		}, true);
	    		insideTitleText.disabled = !_value.options.togglePie;
	    		knimeService.addMenuItem('Title inside:', 'header', insideTitleText, null, knimeService.SMALL_ICON);
	    	}*/
    	}
	};

	pie.validate = function() {
		return true;
	}

	pie.getComponentValue = function() {
		return _value;
	}

	pie.getSVG = function() {
		// inline global style declarations for SVG export
		var styles = document.styleSheets;
		for (i = 0; i < styles.length; i++) {
			if (!styles[i].cssRules && styles[i].rules) {
				styles[i].cssRules = styles[i].rules;
			}
			// empty style declaration
			if (!styles[i].cssRules) continue;
			
			for (var j = 0; j < styles[i].cssRules.length; j++) {
				try {
					var rule = styles[i].cssRules[j];
					d3.selectAll(rule.selectorText).each(function(){
						for (var k = 0; k < rule.style.length; k++) {
							var curStyle = this.style.getPropertyValue(rule.style[k]);
							var curPrio = this.style.getPropertyPriority(rule.style[k]);
							var rulePrio = rule.style.getPropertyPriority(rule.style[k]);
							//only overwrite style if not set or priority is overruled
							if (!curStyle || (curPrio != "important" && rulePrio == "important")) {
								d3.select(this).style(rule.style[k], rule.style[rule.style[k]]);
							}
						}
					});
				} catch(exception) {
					continue;
				}
			}
		}
		// correct faulty rect elements
		d3.selectAll("rect").each(function() {
			var rect = d3.select(this);
			if (!rect.attr("width")) {
				rect.attr("width", 0);
			}
			if (!rect.attr("height")) {
				rect.attr("height", 0);
			}
		});
		var svgElement = d3.select("svg")[0][0];
		// Return the SVG as a string.
		return (new XMLSerializer()).serializeToString(svgElement);
	}

	return pie;

}());