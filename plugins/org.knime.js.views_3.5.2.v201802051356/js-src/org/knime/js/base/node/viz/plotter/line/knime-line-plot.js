knime_line_plot = function() {
	
	view = {};
	var _representation = null;
	var _value = null;
	var _keyedDataset = null;
	var chartManager = null;
	var containerID = "lineContainer";
	var initialAxisBounds;
	
	var minWidth = 400;
	var minHeight = 300;
	var defaultFont = "sans-serif";
	var defaultFontSize = 12;
	
	var MISSING_VALUE_METHOD_GAP = "gap";
	var MISSING_VALUE_METHOD_NO_GAP = "noGap";
	var MISSING_VALUE_METHOD_REMOVE_COLUMN = "removeColumn";
	
	var xMissingValuesCount = 0;
	var yMissingValues = [];
	var isEmptyPlot = true;
	
	var MISSING_VALUES_X_AXIS_NOT_SHOWN = "missingValuesXAxisNotShown";
	var MISSING_VALUES_NOT_SHOWN = "missingValuesNotShown";
	var NO_DATA_AVAILABLE = "noDataAvailable";
	
	view.init = function(representation, value) {
		if (!representation.keyedDataset) {
			d3.select("body").text("Error: No data available");
			return;
		}
		if (value.xColumn && representation.keyedDataset.columnKeys.indexOf(value.xColumn) == -1) {
			d3.select("body").text("Error: Selected column for x-axis: \"" + value.xColumn + "\" not available.");
			return;
		}
		_representation = representation;
		_value = value;
		try {
			//console.time("Parse and build 2DDataset");
			//console.time("Total init time");
			_keyedDataset = new jsfc.KeyedValues2DDataset();
			//_keyedDataset.load(_representation.keyedDataset);

			for (var rowIndex = 0; rowIndex < _representation.keyedDataset.rows.length; rowIndex++) {
				var rowKey = _representation.keyedDataset.rows[rowIndex].rowKey;
				var row = _representation.keyedDataset.rows[rowIndex];
				var properties = row.properties;
				for (var col = 0; col < _representation.keyedDataset.columnKeys.length; col++) {
					var columnKey = _representation.keyedDataset.columnKeys[col];
					_keyedDataset.add(rowKey, columnKey, row.values[col]);
				}
				for ( var propertyKey in properties) {
					_keyedDataset.setRowProperty(rowKey, propertyKey,
							properties[propertyKey]);
				}
			}			
			
			for (var col = 0; col < _representation.keyedDataset.columnKeys.length; col++) {
				var columnKey = _representation.keyedDataset.columnKeys[col];
				var symbolProp = _representation.keyedDataset.symbols[col];
				if (symbolProp) {
					var symbols = [];
					for (var symbolKey in symbolProp) {
						symbols.push({"symbol": symbolProp[symbolKey], "value": symbolKey});
					}
					_keyedDataset.setColumnProperty(columnKey, "symbols", symbols);
				}
				var columnColor = _representation.keyedDataset.columnColors[col];
				if (columnColor) {
					_keyedDataset.setColumnProperty(columnKey, "color", columnColor);
				}
				var dateTimeFormat = _representation.keyedDataset.dateTimeFormats[col];
				if (dateTimeFormat) {
					_keyedDataset.setColumnProperty(columnKey, "date", dateTimeFormat);
				}
			}
			
			if (_value.selection) {
				for (var selection = 0; selection < _value.selection.length; selection++) {
					for (var col = 0; col < _representation.keyedDataset.columnKeys.length; col++) {
						// Select all cols of selected row
						_keyedDataset.select("selection", _value.selection[selection],  _representation.keyedDataset.columnKeys[col]);
					}
				}
			}
			
			// Set locale for moment.js.
			if (_representation.dateTimeFormats.globalDateTimeLocale !== 'en') {
				moment.locale(_representation.dateTimeFormats.globalDateTimeLocale);
			}

			d3.select("html").style("width", "100%").style("height", "100%")/*.style("overflow", "hidden")*/;
			d3.select("body").style("width", "100%").style("height", "100%").style("margin", "0").style("padding", "0");
			var layoutContainer = "layoutContainer";
			d3.select("body").attr("id", "body").append("div").attr("id", layoutContainer)
				.style("width", "100%").style("height", "100%")
				.style("min-width", minWidth + "px").style("min-height", minHeight + "px");
			
			// Setting up warning messages from the Java side, if any
			if (representation.showWarningInView && representation.warnings !== null) {
				var map = representation.warnings.warningMap;
				for (var id in map) {
			        if (map.hasOwnProperty(id)) {
			        	knimeService.setWarningMessage(map[id], id);			           
			        }
			    }
			}

			if (_representation.missingValueMethod == MISSING_VALUE_METHOD_REMOVE_COLUMN) {
				var yColumns = [];
				_value.yColumns.forEach(function (col) {
		    		if (_representation.keyedDataset.missingValueColumns.indexOf(col) == -1) {
		    			yColumns.push(col);
		    		}
		    	});
				_value.yColumns = yColumns;
			}
			
			// Solution for a bunch of problems related to 0-width range of Y axis
			// (one value, horizontal line, all missing values etc.)
			// Fixed with using > insteaof >= in comparison of lowerBound with upperBound
			// ToDo: apply changes to JSFreeChart 
			var customRange = function(lowerBound, upperBound) {
			    if (lowerBound > upperBound) {  // <-- changed here
			        throw new Error("Requires lowerBound to be less than upperBound: " + lowerBound + ", " + upperBound);
			    }
			    this._lowerBound = lowerBound;
			    this._upperBound = upperBound;
			};
			customRange.prototype = jsfc.Range.prototype;
			jsfc.Range = customRange;
			
			if (_representation.enableViewConfiguration || _representation.showZoomResetButton) {
				drawControls(layoutContainer);
			}
			drawChart(layoutContainer);
			//console.timeEnd("Total init time");
		} catch(err) {
			if (err.stack) {
				alert(err.stack);
			} else {
				alert (err);
			}
		}
		if (parent != undefined && parent.KnimePageLoader != undefined) {
			parent.KnimePageLoader.autoResize(window.frameElement.id);
		}
	};
	
	buildXYDataset = function() {
		//console.time("Building XYDataset");
		var xyDataset;
		
		if (_keyedDataset.rowCount() > 0 && _value.yColumns.length > 0) {			
			// Fix missing values in String x-column.
			// ToDo: apply changes to JSFreeChart
			// Fixed with null-checking of source.valueByIndex(r, c)
			// /--
			var customXYDataset = function(source, xcol, ycols) {
			    // the source data is stored in a 2D table structure, with x-values read
			    // from the column with the key matching the parameter 'xcol' and the 
			    // y-values read from columns with keys matching the parameter 'ycols' (an
			    // array of strings).
			    this._source = source;
			    
			    // if xcol is null the x-values returned are the row indices and we
			    // set up symbols from the row keys
			    this._xcol = xcol;
			    if (xcol === null) {
			        var xsyms = this._extractRowSymbols(source);
			        source.setProperty("x-symbols", xsyms);
			    } else {
			        var c = this._source.columnIndex(xcol);
			        if (c < 0) {
			            throw new Error("The column 'xcol' (" + xcol + ") is not present.");
			        }
			        var symbols = source.getColumnProperty(xcol, "symbols");
			        if (symbols) {
			            var xsyms = [];
			            for (var r = 0; r < source.rowCount(); r++) {
			                var s = {};
			                s.value = r;
			                var val = source.valueByIndex(r, c);
			                if (val !== null) {  // <-- changed here
				                s.symbol = symbols[val].symbol;
				                xsyms.push(s);
			                }
			            }
			            source.setProperty("x-symbols", xsyms);
			        } else {
			            source.setProperty("x-symbols", null);
			        }
			    }
			    
			    ycols.forEach(function(entry) {
			        if (source.columnIndex(entry) < 0) {
			            throw new Error("The y-column " + entry + " is not present.");
			        }
			    });
			    this._ycols = ycols;
			    this._nextRowID = 0;
			    this._listeners = [];
			};
			customXYDataset.prototype = jsfc.TableXYDataset.prototype;
			jsfc.TableXYDataset = customXYDataset;
			// --/
			
			// Fix autoRange problem - missing values considered as 0,
			// therefore the axes origin was always at (0, 0) 
			// ToDo: apply changes to JSFreeChart
			// Fixed with null-checking
			// /--
			jsfc.TableXYDataset.prototype.xbounds = function() {
			    var xmin = Number.POSITIVE_INFINITY;
			    var xmax = Number.NEGATIVE_INFINITY;
			    for (var r = 0; r < this._source.rowCount(); r++) {
			        var x = this.x(0, r);
			        if (x !== null) {  // <-- changed here
				        xmin = Math.min(xmin, x);
				        xmax = Math.max(xmax, x);
			        }
			    }
			    return [xmin, xmax];
			};			
			
			jsfc.XYDatasetUtils.ybounds = function(dataset, baseline) {
			    var ymin = baseline ? baseline : Number.POSITIVE_INFINITY;
			    var ymax = baseline ? baseline : Number.NEGATIVE_INFINITY;
			    for (var s = 0; s < dataset.seriesCount(); s++) {
			        for (var i = 0; i < dataset.itemCount(s); i++) {
			            var y = dataset.y(s, i);
			            if (y !== null) {  // <-- changed here
				            ymin = Math.min(ymin, y);
				            ymax = Math.max(ymax, y);
			            }
			        }
			    }
			    return [ymin, ymax];    
			};
			// --/
			
			// Fix the missing String values on X axis
			// ToDo: apply changes to JSFreeChart
			// /--
			jsfc.TableXYDataset.prototype.x = function(seriesIndex, itemIndex) {
			    if (this._xcol === null) {
			        return itemIndex;
			    }
			    
			    var col = this._source.columnIndex(this._xcol);
			    var value = this._source.valueByIndex(itemIndex, col);
			    
			    // when there are symbols defined for the axis, we want this dataset
			    // to return ordinal x-values
			    // changed: actually only if the value is not null
			    if (this.getProperty("x-symbols")) {
			    	if (value !== null) {
			    		return itemIndex;
			    	} else {
			    		return null;  // <-- changed here
			    	}
			    }			    
			    
			    return value;
			};
			// --/
			
			xyDataset = new jsfc.TableXYDataset(_keyedDataset, _value.xColumn, _value.yColumns);
		} else {
			xyDataset = new jsfc.StandardXYDataset();
			xyDataset.data.series = [];
		}
		//console.timeEnd("Building XYDataset");
		return xyDataset;
	};
	
	drawChart = function(layoutContainer) {
		if (!_value.yColumns) {
			alert("No columns set for y axis!");
			return;
		}
		var xAxisLabel = _value.xAxisLabel ? _value.xAxisLabel : _value.xColumn;
		var yAxisLabel = _value.yAxisLabel ? _value.yAxisLabel : "";
		
		isEmptyPlot = true;
		
		var dataset = buildXYDataset();

		//console.time("Building chart");
		
		var chartWidth = _representation.imageWidth + "px;"
		var chartHeight = _representation.imageHeight + "px";
		if (_representation.resizeToWindow) {
			chartWidth = "100%";
			chartHeight = "100%";
		}
		d3.select("#"+layoutContainer).append("div")
			.attr("id", containerID)
			.style("width", chartWidth)
			.style("height", chartHeight)
			.style("min-width", minWidth + "px")
			.style("min-height", minHeight + "px")
			.style("box-sizing", "border-box")
			.style("overflow", "hidden")
			.style("margin", "0");
		
		var plot = new jsfc.XYPlot(dataset);
		// We comment this out and set the value always to false, as anyway the current chunk mechanism
		// does not behave as we want (no real chunk-by-chunk drawing)
		// Setting it to true will affect the missing values counting as the drawing methods will be called
		// asynchronously, which might lead to incorrect warning messages.
		// If we want to turn it on, we also need to take care of missing values.
		// plot.setStaggerRendering(_representation.enableStaggeredRendering);
		plot.setStaggerRendering(false);
		var xAxis = plot.getXAxis();
        xAxis.setLabel(xAxisLabel);
        xAxis.setLabelFont(new jsfc.Font(defaultFont, defaultFontSize, true));
        xAxis.setTickLabelFont(new jsfc.Font("sans-serif", 11));
        xAxis.setGridLinesVisible(_representation.showGrid, false);
        xAxis.setAutoRange(_representation.autoRangeAxes, false);
        if (_value.xAxisMin != null && _value.xAxisMax != null) {
        	xAxis.setBounds(_value.xAxisMin, _value.xAxisMax, false, false);
        }
        
        var yAxis = plot.getYAxis();
        yAxis.setLabel(yAxisLabel);
        yAxis.setLabelFont(new jsfc.Font(defaultFont, defaultFontSize, true));
        yAxis.setTickLabelFont(new jsfc.Font("sans-serif", 11));
        yAxis.setGridLinesVisible(_representation.showGrid, false);
        yAxis.setAutoRange(_representation.autoRangeAxes, false);
        if (_value.yAxisMin != null && _value.yAxisMax != null) {
        	yAxis.setBounds(_value.yAxisMin, _value.yAxisMax, true, false);
        }
        if (_representation.gridColor) {
        	var gColor = getJsfcColor(_representation.gridColor);
        	xAxis.setGridLineColor(gColor, false);
        	yAxis.setGridLineColor(gColor, false);
        }
        
		if (_value.xColumn) {
			var dateProp = dataset.getSeriesProperty(_value.xColumn, "date");
			if (dateProp) {
				plot.getXAxis().setTickLabelFormatOverride(createDateFormatter(dateProp));
			} else {
				plot.getXAxis().setTickLabelFormatOverride(null);
			}
		}
        
        var renderer = new jsfc.XYLineRenderer();
        renderer.drawSeries = drawSeries;
		plot.setRenderer(renderer);
        var chart = new jsfc.Chart(plot);
        if (_representation.backgroundColor) {
        	chart.setBackgroundColor(getJsfcColor(_representation.backgroundColor), false);
        }
        if (_representation.dataAreaColor) {
			plot.setDataBackgroundColor(getJsfcColor(_representation.dataAreaColor), false);
		}
        chart.setTitleAnchor(new jsfc.Anchor2D(jsfc.RefPt2D.TOP_LEFT));
        var chartTitle = _value.chartTitle ? _value.chartTitle : "";
        var chartSubtitle = _value.chartSubtitle ? _value.chartSubtitle : "";
        chart.setTitle(chartTitle, chartSubtitle, chart.getTitleAnchor());
        chart.updateTitle(null, new jsfc.Font("sans-serif", 24, false, false));
        chart.updateSubtitle(null, new jsfc.Font("sans-serif", 12, false, false));
        if (_representation.showLegend) {
        	var legendBuilder = new jsfc.StandardLegendBuilder();
        	legendBuilder.setFont(new jsfc.Font("sans-serif", 12));
        	chart.setLegendBuilder(legendBuilder);
        } else {
        	chart.setLegendBuilder(null);
        }
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		document.getElementById(containerID).appendChild(svg);
		if (_representation.resizeToWindow) {
			chartHeight = "100%";
		}
		d3.select(svg).attr("id", "chart_svg").style("width", chartWidth).style("height", chartHeight);
        var zoomEnabled = _representation.enableZooming;
        var dragZoomEnabled = _representation.enableDragZooming;
        var panEnabled = _representation.enablePanning;
        chartManager = new jsfc.ChartManager(svg, chart, dragZoomEnabled, zoomEnabled, false);
        
        if (panEnabled) {
        	var panModifier = new jsfc.Modifier(false, false, false, false);
        	if (dragZoomEnabled) {
        		panModifier = new jsfc.Modifier(false, true, false, false);
        	}
            var panHandler = new jsfc.PanHandler(chartManager, panModifier);
            chartManager.addLiveHandler(panHandler);
        }
        
        //TODO: enable selection when data points can be rendered
        var selectionEnabled = false;
        var recSelEnabled = _representation.enableRectangleSelection;
        var lasSelEnabled = _representation.enableLassoSelection;
        
        if (selectionEnabled) {
        	var selectionHandler = new jsfc.ClickSelectionHandler(chartManager);
        	chartManager.addLiveHandler(selectionHandler);
        
        	if (lasSelEnabled) {
        		var polygonSelectionModifier = new jsfc.Modifier(true, false, false, false);
        		var polygonSelectionHandler = new jsfc.PolygonSelectionHandler(chartManager, polygonSelectionModifier);
        		chartManager.addLiveHandler(polygonSelectionHandler);
        	}
        }
        
        if (_representation.showCrosshair) {
        	var crosshairHandler = new jsfc.XYCrosshairHandler(chartManager);
        	//TODO: evaluate snap to points
        	crosshairHandler.setSnapToItem(false);
        	chartManager.addAuxiliaryHandler(crosshairHandler);
        }
        
        xMissingValuesCount = 0;
    	yMissingValues = [];
        
        setChartDimensions();
        //console.timeEnd("Building chart");
        //console.time("Refreshing Display");
        chartManager.refreshDisplay();
        //console.timeEnd("Refreshing Display");
        //console.debug(svg.outerHTML);
        if (_representation.resizeToWindow) {
        	var win = document.defaultView || document.parentWindow;
        	win.onresize = resize;
        }
        
        checkWarningMessages();
        
        initialAxisBounds = {xMin: xAxis.getLowerBound(), xMax: xAxis.getUpperBound(), yMin: yAxis.getLowerBound(), yMax: yAxis.getUpperBound()};
	};
	
	getJsfcColor = function(colorString) {
		var colC = colorString.slice(5,-1).split(",");
		var color = new jsfc.Color(parseInt(colC[0]), parseInt(colC[1]), parseInt(colC[2]), parseInt(colC[3])*255);
		return color;
	};
	
	resize = function(event) {
		setChartDimensions();
        chartManager.refreshDisplay();
	};
	
	setChartDimensions = function() {
		var container = document.getElementById(containerID);
		var w = _representation.imageWidth;
		var h = _representation.imageHeight;
		if (_representation.resizeToWindow) {
			w = Math.max(minWidth, container.clientWidth);
			h = Math.max(minHeight, container.clientHeight);
		}
        chartManager.getChart().setSize(w, h, false);
	};
	
	updateChart = function() {
		isEmptyPlot = true;
		var plot = chartManager.getChart().getPlot();
		plot.setDataset(buildXYDataset(), false);
		if (_value.xColumn) {
			var dateProp = plot.getDataset().getSeriesProperty(_value.xColumn, "date");
			if (dateProp) {
				plot.getXAxis().setTickLabelFormatOverride(createDateFormatter(dateProp), false);
			} else {
				plot.getXAxis().setTickLabelFormatOverride(null, false);
			}
		}
		if (_representation.autoRangeAxes) {
			plot.getXAxis().setAutoRange(true, false);
			plot.getYAxis().setAutoRange(true, false);
		}
		
		xMissingValuesCount = 0;
    	yMissingValues = [];
    	
		chartManager.refreshDisplay();
		
		checkWarningMessages();
		
		//plot.update(chart);
	};
	
	updateTitle = function() {
		var oldTitle = _value.chartTitle;
		_value.chartTitle = document.getElementById("chartTitleText").value;
		if (_value.chartTitle !== oldTitle || typeof _value.chartTitle !== typeof oldTitle) {
			setTitles();
		}
	};
	
	updateSubtitle = function() {
		var oldTitle = _value.chartSubtitle;
		_value.chartSubtitle = document.getElementById("chartSubtitleText").value;
		if (_value.chartSubtitle !== oldTitle || typeof _value.chartTitle !== typeof oldTitle) {
			setTitles();
		}
	};
	
	setTitles = function() {
		var chart = chartManager.getChart();
		chart.setTitle(_value.chartTitle, _value.chartSubtitle, chart.getTitleAnchor(), false);
		chart.updateTitle(null, new jsfc.Font("sans-serif", 24, false, false));
		chart.updateSubtitle(null, new jsfc.Font("sans-serif", 12, false, false));
		chart.notifyListeners();
	}
	
	updateXAxisLabel = function() {
		_value.xAxisLabel = document.getElementById("xAxisText").value;
		var newAxisLabel = _value.xAxisLabel;
		if (!_value.xAxisLabel) {
			newAxisLabel = _value.xColumn;
		}
		chartManager.getChart().getPlot().getXAxis().setLabel(newAxisLabel);
	};
	
	updateYAxisLabel = function() {
		_value.yAxisLabel = document.getElementById("yAxisText").value;
		var newAxisLabel = _value.yAxisLabel;
		if (!_value.xAxisLabel) {
			newAxisLabel = _value.yColumn;
		}
		chartManager.getChart().getPlot().getYAxis().setLabel(newAxisLabel);
	};
	
	drawControls = function(layoutContainer) {
		if (!knimeService) {
			// TODO: error handling?
			return;
		}
		
		// -- Buttons --
		if (_representation.displayFullscreenButton) {
			knimeService.allowFullscreen();
		}		    
		
		if (_representation.showZoomResetButton) {
			knimeService.addButton('zoom-reset-button', 'search-minus', 'Reset Zoom', function() {
	    		var plot = chartManager.getChart().getPlot();
	    		plot.getXAxis().setAutoRange(true);
	    		plot.getYAxis().setAutoRange(true);
	    	});
	    }
		
        // -- Menu Items --
	    if (!_representation.enableViewConfiguration) return;
	    
	    if (_representation.enableTitleChange || _representation.enableSubtitleChange) {    	
	    	if (_representation.enableTitleChange) {
	    		var chartTitleText = knimeService.createMenuTextField('chartTitleText', _value.chartTitle, updateTitle, false);
	    		knimeService.addMenuItem('Chart Title:', 'header', chartTitleText);
	    	}
	    	if (_representation.enableSubtitleChange) {
	    		var chartSubtitleText = knimeService.createMenuTextField('chartSubtitleText', _value.chartSubtitle, updateSubtitle, false);
	    		knimeService.addMenuItem('Chart Subtitle:', 'header', chartSubtitleText, null, knimeService.SMALL_ICON);	    		
	    	}
	    	if (_representation.enableXColumnChange || _representation.enableYColumnChange || _representation.enableXAxisLabelEdit || _representation.enableYAxisLabelEdit) {
	    		knimeService.addMenuDivider();
	    	}
	    }
	    
	    if (_representation.enableXColumnChange || _representation.enableYColumnChange) {
	    	if (_representation.enableXColumnChange) {	    		
	    		var xColNames = ['<RowID>'].concat(_keyedDataset.columnKeys());
	    		var colSelect = knimeService.createMenuSelect('xColumnSelect', _value.xColumn, xColNames, function() {
	    			var newXCol = this.value;
	    			if (newXCol == "<RowID>") {
	    				newXCol = null;
	    			}
	    			_value.xColumn = newXCol;
	    			if (!_value.xAxisLabel) {
	    				chartManager.getChart().getPlot().getXAxis().setLabel(_value.xColumn, false);
	    			}
	    			updateChart();
	    		});
	    		knimeService.addMenuItem('X Column:', 'long-arrow-right', colSelect);
	    	}
		    if (_representation.enableYColumnChange) {
			    // temporarily use controlContainer to solve th resizing problem with ySelect
		    	var controlContainer = d3.select("#"+layoutContainer).insert("table", "#" + containerID + " ~ *")
		    	.attr("id", "scatterControls")
		    	/*.style("width", "100%")*/
		    	.style("padding", "10px")
		    	.style("margin", "0 auto")
		    	.style("box-sizing", "border-box")
		    	.style("font-family", defaultFont)
		    	.style("font-size", defaultFontSize+"px")
		    	.style("border-spacing", 0)
		    	.style("border-collapse", "collapse");	
		    	
		    	var yColNames = [];
		    	if (_representation.missingValueMethod == MISSING_VALUE_METHOD_REMOVE_COLUMN) {
		    		_keyedDataset.columnKeys().forEach(function (key) {
			    		if (_representation.keyedDataset.missingValueColumns.indexOf(key) == -1) {
			    			yColNames.push(key);
			    		}
			    	});
		    	} else {
		    		yColNames = _keyedDataset.columnKeys();
		    	}		    	
		    	
		    	var columnChangeContainer = controlContainer.append("tr");		    	
		    	var ySelect = new twinlistMultipleSelections();	
		    	var ySelectComponent = ySelect.getComponent().get(0);
		    	columnChangeContainer.append("td").attr("colspan", "3").node().appendChild(ySelectComponent);
		    	ySelect.setChoices(yColNames);
		    	ySelect.setSelections(_value.yColumns);
		    	ySelect.addValueChangedListener(function() {
		    		_value.yColumns = ySelect.getSelections();
		    		updateChart();
		    	});
		    	knimeService.addMenuItem('Y Column:', 'long-arrow-up', ySelectComponent);
		    	ySelectComponent.style.fontFamily = defaultFont;				
		    	ySelectComponent.style.fontSize = defaultFontSize + 'px';				
		    	ySelectComponent.style.margin = '0';
		    	ySelectComponent.style.outlineOffset = '-3px';
		    	ySelectComponent.style.width = '';
		    	ySelectComponent.style.height = '';
		    	
		    	controlContainer.remove();
		    }
		    if (_representation.enableXAxisLabelEdit || _representation.enableYAxisLabelEdit) {
		    	knimeService.addMenuDivider();
		    }
	    }
	    
	    if (_representation.enableXAxisLabelEdit || _representation.enableYAxisLabelEdit) {	    	
	    	if (_representation.enableXAxisLabelEdit) {
	    		var xAxisText = knimeService.createMenuTextField('xAxisText', _value.xAxisLabel, updateXAxisLabel, false);
	    		knimeService.addMenuItem('X Axis Label:', 'ellipsis-h', xAxisText);
	    	}
	    	if (_representation.enableYAxisLabelEdit) {
	    		var yAxisText = knimeService.createMenuTextField('yAxisText', _value.yAxisLabel, updateYAxisLabel);
	    		knimeService.addMenuItem('Y Axis Label:', 'ellipsis-v', yAxisText);
	    	}
	    }
	    
	    /*if (_representation.enableDotSizeChange) {
	    	var dotSizeContainer = controlContainer.append("tr");
	    	dotSizeContainer.append("td").append("label").attr("for", "dotSizeInput").text("Dot Size:").style("margin-right", "5px");
	    	dotSizeContainer.append("td").append("input")
	    		.attr("type", "number")
	    		.attr("id", "dotSizeInput")
	    		.attr("name", "dotSizeInput")
	    		.attr("value", _value.dotSize)
	    		.style("font-family", defaultFont)
	    		.style("font-size", defaultFontSize+"px");
	    }*/
	};
	
	getSelection = function() {
		var selections = chartManager.getChart().getPlot().getDataset().selections;
		var selectionsArray = [];
		if (selections) {
			for ( var i = 0; i < selections.length; i++) {
				if (selections[i].id === "selection") {
					selectionsArray = selections[i].items;
					break;
				}
			}
		}
		var selectionIDs = [];
		for (var i = 0; i < selectionsArray.length; i++) {
			selectionIDs.push(_keyedDataset.rowKey(selectionsArray[i].itemKey));
		}
		if (selectionsArray.length == 0) {
			return null;
		}
		return selectionIDs;
	};
	
	view.validate = function() {
		return true;
	};
	
	view.getSVG = function() {
		if (!chartManager || !chartManager.getElement()) {
			return null;
		}
		var svg = chartManager.getElement();
		d3.select(svg).selectAll("circle").each(function() {
			this.removeAttributeNS("http://www.jfree.org", "ref");
		});
		return (new XMLSerializer()).serializeToString(svg);
	};
	
	view.getComponentValue = function() {
		setAxisBoundsToValue();
		_value.selection = getSelection();
		return _value;
	};
	
	setAxisBoundsToValue = function() {
		var plot = chartManager.getChart().getPlot();
		var xAxis = plot.getXAxis();
		var yAxis = plot.getYAxis();
		var xMin = xAxis.getLowerBound();
		var xMax = xAxis.getUpperBound();
		var yMin = yAxis.getLowerBound();
		var yMax = yAxis.getUpperBound();
		if (xMin != initialAxisBounds.xMin || xMax != initialAxisBounds.xMax 
				|| yMin != initialAxisBounds.yMin || yMax != initialAxisBounds.yMax) {
			_value.xAxisMin = xMin;
			_value.xAxisMax = xMax;
			_value.yAxisMin = yMin;
			_value.yAxisMax = yMax;
		}
	};
	
	drawSeries = function(ctx, dataArea, plot,
	        dataset, seriesIndex) {		
	    var itemCount = dataset.itemCount(seriesIndex);
	    if (itemCount == 0) {
	        return;
	    }
	    xMissingValuesCount = 0;
	    var yMissingValuesCount = 0;
	    var connect = false;
	    ctx.beginPath();
	    for (var i = 0; i < itemCount; i++) {
	        var x = dataset.x(seriesIndex, i);
	        var y = dataset.y(seriesIndex, i);
	        if (x === null) {
	        	// always ignore missing values of the x column
	        	xMissingValuesCount++;
	        	if (y === null) {
	        		yMissingValuesCount++;
	        	}
	        	continue;
	        }
	        if (y === null) {
	            // keep the line only if noGap method and the line has been already started, i.e. connect == true
	        	connect = _representation.missingValueMethod == MISSING_VALUE_METHOD_NO_GAP && connect ? true : false;
	        	yMissingValuesCount++;
	            continue;
	        }

	        // convert these to target coordinates using the plot's axes
	        var xx = plot.getXAxis().valueToCoordinate(x, dataArea.x(), dataArea.x() 
	                + dataArea.width());
	        var yy = plot.getYAxis().valueToCoordinate(y, dataArea.y() 
	                + dataArea.height(), dataArea.y());
	        if (!connect) {
	            ctx.moveTo(xx, yy);
	            connect = true;
	        } else {
	            ctx.lineTo(xx, yy);
	            isEmptyPlot = false;
	        }
	    }
	    ctx.setLineColor(this.lookupLineColor(dataset, seriesIndex, i));
	    ctx.setLineStroke(this._strokeSource.getStroke(seriesIndex, 0));
	    ctx.stroke();
	    
	    if (yMissingValuesCount > 0) {
	    	yMissingValues.push("'" + dataset._ycols[seriesIndex] + "' - " + yMissingValuesCount + " missing value(s)");
	    }
	};
	
	checkWarningMessages = function() {
		if (_representation.showWarningInView) {
			var plot = chartManager.getChart().getPlot();
			if (isEmptyPlot) {
				knimeService.clearWarningMessage(MISSING_VALUES_X_AXIS_NOT_SHOWN);
				knimeService.clearWarningMessage(MISSING_VALUES_NOT_SHOWN);
				knimeService.setWarningMessage("No chart was generated since data columns have only missing values.\nChoose another data columns or re-run the workflow with different data.", NO_DATA_AVAILABLE);
			} else {
				knimeService.clearWarningMessage(NO_DATA_AVAILABLE);
				if (xMissingValuesCount > 0 && _representation.reportOnMissingValues) {
		        	knimeService.setWarningMessage(xMissingValuesCount + ' missing value(s) on the X axis are not shown.', MISSING_VALUES_X_AXIS_NOT_SHOWN);        	
		        } else {
		        	knimeService.clearWarningMessage(MISSING_VALUES_X_AXIS_NOT_SHOWN);
		        }
		        if (yMissingValues.length > 0 && _representation.reportOnMissingValues) {
		        	knimeService.setWarningMessage('Missing values of the following columns are not shown:\n    ' + yMissingValues.join('\n    ') + '.', MISSING_VALUES_NOT_SHOWN);
		        } else {
		        	knimeService.clearWarningMessage(MISSING_VALUES_NOT_SHOWN);
		        }
			}
		}
	}
	
	createDateFormatter = function(knimeColType) {
		var format;
		switch (knimeColType) {
		case 'Date and Time':
			format = _representation.dateTimeFormats.globalDateTimeFormat;
			break;
		case 'Local Date':
			format = _representation.dateTimeFormats.globalLocalDateFormat;
			break;
		case 'Local Date Time':
			format = _representation.dateTimeFormats.globalLocalDateTimeFormat;
			break;
		case 'Local Time':
			format = _representation.dateTimeFormats.globalLocalTimeFormat;
			break;
		case 'Zoned Date Time':
			format = _representation.dateTimeFormats.globalZonedDateTimeFormat;
			break;
        default:
            // might be not set correct in case of opening the view of the old workflow, i.e. for backward compatibility 
            knimeColType = 'Date and Time';
            format = _representation.dateTimeFormats.globalDateTimeFormat;
		}
		return new DateFormat(format, knimeColType);
	}
	
	DateFormat = function(format, knimeColType) {
		this._format = format;
		this._knimeColType = knimeColType;
	}
	
	DateFormat.prototype.format = function(n) {				
		if (this._knimeColType == 'Date and Time' || this._knimeColType == 'Local Date' || this._knimeColType == 'Local Date Time' || this._knimeColType == 'Local Time') {
			return moment(n).utc().format(this._format);
		} else if (this._knimeColType == 'Zoned Date Time') {
			return moment(n).tz(_representation.dateTimeFormats.timezone).format(this._format);
		}		
	};
	
	return view;
}();