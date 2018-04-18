knime_scatter_plot_selection_appender = function() {
	
	var view = {};
	var _representation = null;
	var _value = null;
	var _keyedDataset = null;
	var _colorModel = null;
	var _legendBuilder = null;
	var chartManager = null;
	var containerID = "scatterContainer";
	var initialAxisBounds;
	
	var minWidth = 400;
	var minHeight = 300;
	var defaultFont = "sans-serif";
	var defaultFontSize = 12;
	
	var SELECTION_ID = "selection";
	var FILTERED_ID = "filtered";
	
	var NOMINAL_MODEL = "nominal";
	var RANGE_MODEL = "range";
	
	var hiddenItemKeys = [];
	
	var missingValuesCount = 0;
	var isEmptyPlot = false;
	var indexRowkeyMap = [];
	
	var MISSING_VALUES_NOT_SHOWN_WARNING_ID = "missingValuesNotShown";
	var NO_DATA_AVAILABLE = "noDataAvailable";
	
	view.init = function(representation, value) {
		if (!representation.keyedDataset) {
			d3.select("body").text("Error: No data available");
			return;
		}
		if (representation.keyedDataset.columnKeys.indexOf(value.xColumn) == -1) {
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
				var dateTimeFormat = _representation.keyedDataset.dateTimeFormats[col];
				if (dateTimeFormat) {
					_keyedDataset.setColumnProperty(columnKey, "date", dateTimeFormat);
				}
			}
			//console.timeEnd("Parse and build 2DDataset");
			
			// Solution for a bunch of problems related to 0-width range of Y axis
			// (one value, horizontal line, all missing values etc.)
			// Fixed with using > instead of >= in comparison of lowerBound with upperBound
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
			
			drawChart(layoutContainer);
			drawControls(layoutContainer);
			
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
		var yCol = null;
		if (_value.yColumn) {
			yCol = _value.yColumn;
		}
		if (!yCol) {
			yCol = "[EMPTY]";
		}
		isEmptyPlot = false;
		var xyDataset = extractXYDatasetFromColumns2D(_keyedDataset, _value.xColumn, yCol);
		
		if (_representation.showWarningInView) {
			if (isEmptyPlot) {
				knimeService.clearWarningMessage(MISSING_VALUES_NOT_SHOWN_WARNING_ID);
				knimeService.setWarningMessage("No chart was generated since the selected pair of data columns has only missing values.\nChoose another data columns or re-run the workflow with different data.", NO_DATA_AVAILABLE);				
			} else {
				knimeService.clearWarningMessage(NO_DATA_AVAILABLE);
				if (missingValuesCount > 0 && _representation.reportOnMissingValues) {
					knimeService.setWarningMessage(missingValuesCount + " missing or unsupported value(s) are not shown.", MISSING_VALUES_NOT_SHOWN_WARNING_ID);
				}
			}	
		}
				
		
		//console.timeEnd("Building XYDataset");
		return xyDataset;
	};
	
	drawChart = function(layoutContainer) {
		if (!_value.xColumn) {
			alert("No column set for x axis!");
			return;
		}
		if (!_value.yColumn) {
			alert("No column set for y axis!");
			return;
		}
		var xAxisLabel = _value.xAxisLabel ? _value.xAxisLabel : _value.xColumn;
		var yAxisLabel = _value.yAxisLabel ? _value.yAxisLabel : _value.yColumn;
		
		var dataset = buildXYDataset();
		
		// Assign selection in _keyedDataset is lost when building XYDataset, therefore we need to assing selection directly to XYDataset.
		// Since their structure model is different, we need to do a conversion
		if (_value.selection) {
			for (var rowKeyInd = 0; rowKeyInd < _value.selection.length; rowKeyInd++) {
				select(dataset, getRowIndex(_value.selection[rowKeyInd]));
			}
		}
		
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
		
		//chart.build(container);
				
		var plot = new jsfc.XYPlot(dataset);
		var stagger = _representation.enableStaggeredRendering;
		if (knimeService && knimeService.isInteractivityAvailable()) {
			// always disable if interactivity available
			stagger = false;
		}
		plot.setStaggerRendering(stagger);
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
            var dateProp = _keyedDataset.getColumnProperty(_value.xColumn, "date");
			if (dateProp) {
				plot.getXAxis().setTickLabelFormatOverride(createDateFormatter(dateProp));
			} else {
				plot.getXAxis().setTickLabelFormatOverride(null);
			}
		}
        if (_value.yColumn) {
			var dateProp = _keyedDataset.getColumnProperty(_value.yColumn, "date");
			if (dateProp) {
				plot.getYAxis().setTickLabelFormatOverride(createDateFormatter(dateProp), false);
			} else {
				plot.getYAxis().setTickLabelFormatOverride(null, false);
			}
		}
        
        plot.renderer = new jsfc.ScatterRenderer(plot);
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
        if (_representation.keyedDataset.colorModels && _representation.keyedDataset.colorModels.length > 0) {
        	_colorModel = _representation.keyedDataset.colorModels[0];
        	plot.legendInfo = legendInfo;
        	_legendBuilder = new jsfc.StandardLegendBuilder();
        	_legendBuilder.setFont(new jsfc.Font("sans-serif", 12));
        	_legendBuilder.createLegend = createLegend;        	
        }
        chart.setLegendBuilder(_value.showLegend ? _legendBuilder : null);  // if there's no color model, _legendBuilder is null by default
        		
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		document.getElementById(containerID).appendChild(svg);
		if (_representation.resizeToWindow) {
			chartHeight = "100%";
		}
		d3.select(svg).attr("id", "chart_svg").style("width", chartWidth).style("height", chartHeight);
        
        var zoomEnabled = _representation.enableZooming;
        chartManager = new jsfc.ChartManager(svg, chart, false, zoomEnabled, false);
        

        /*if (panEnabled) {
        	var panModifier = new jsfc.Modifier.createModifier(false, false, false, false);
        	if (dragZoomEnabled) {
        		panModifier = new jsfc.Modifier.createModifier(false, true, false, false);
        	}
            var panHandler = new jsfc.PanHandler(chartManager, panModifier);
            chartManager.addLiveHandler(panHandler);
        }
        
        var selectionEnabled = _representation.enableSelection;
        var recSelEnabled = _representation.enableRectangleSelection;
        var lasSelEnabled = _representation.enableLassoSelection;
        
        if (selectionEnabled) {
        	var selectionModifier = new jsfc.Modifier.createModifierWML(true, false, false, true);
        	var clickSelectionHandler = new jsfc.ClickSelectionHandler(chartManager, selectionModifier);
        	if (recSelEnabled) {
        		var rectangleSelectionHandler = new jsfc.RectangleSelectionHandler(chartManager, selectionModifier);
        		var selectionHandler = new jsfc.DualHandler(chartManager, selectionModifier, clickSelectionHandler, rectangleSelectionHandler);
        		chartManager.addLiveHandler(selectionHandler);
        	} else {
        		chartManager.addLiveHandler(clickSelectionHandler);
        	}
        	if (lasSelEnabled) {
        		var polygonSelectionModifier = new jsfc.Modifier.createModifierWML(true, true, false, true);
        		var polygonSelectionHandler = new jsfc.PolygonSelectionHandler(chartManager, polygonSelectionModifier);
        		chartManager.addLiveHandler(polygonSelectionHandler);
        	}
        }*/
        
        if (_representation.showCrosshair) {
        	var crosshairHandler = new jsfc.XYCrosshairHandler(chartManager);
        	crosshairHandler.setSnapToItem(_representation.snapToPoints);
        	chartManager.addAuxiliaryHandler(crosshairHandler);
        }
                
        setChartDimensions();
        //console.timeEnd("Building chart");
        //console.time("Refreshing Display");
        chartManager.refreshDisplay();
        //console.timeEnd("Refreshing Display");
        //console.debug(svg.outerHTML);
        var win = document.defaultView || document.parentWindow;
        win.onresize = resize;
        
        plot.addListener(unselectHiddenOrFilteredPoints);
        if (knimeService && knimeService.isInteractivityAvailable()) {
        	plot.addListener(publishSelection);
		}
        plot.addListener(applyFilter);
        
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
        applyFilter();
	};
	
	setChartDimensions = function() {
		var container = document.getElementById(containerID);
		var w = _representation.imageWidth;
		var h = _representation.imageHeight;
		if (_representation.resizeToWindow) {
			w = Math.max(minWidth, container.clientWidth);
			h = Math.max(minHeight, container.clientHeight);
		}
        chartManager.getChart().setSize(w, h);
	};
	
	updateChart = function() {
		var plot = chartManager.getChart().getPlot();
		var oldSelections = plot.getDataset().selections;
		var dataset = buildXYDataset();
		plot.setDataset(dataset, false);
		dataset.selections = oldSelections;				
		if (_value.xColumn) {
			var dateProp = _keyedDataset.getColumnProperty(_value.xColumn, "date");
			if (dateProp) {
				plot.getXAxis().setTickLabelFormatOverride(createDateFormatter(dateProp), false);
			} else {
				plot.getXAxis().setTickLabelFormatOverride(null, false);
			}
		}
		if (_value.yColumn) {
			var dateProp = _keyedDataset.getColumnProperty(_value.yColumn, "date");
			if (dateProp) {
				plot.getYAxis().setTickLabelFormatOverride(createDateFormatter(dateProp), false);
			} else {
				plot.getYAxis().setTickLabelFormatOverride(null, false);
			}
		}
		if (_representation.autoRangeAxes) {
			plot.getXAxis().setAutoRange(true, false);
			plot.getYAxis().setAutoRange(true, false);
		}
		dataset.notifyListeners();
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
		var oldLabel = _value.xAxisLabel;
		_value.xAxisLabel = document.getElementById("xAxisText").value;
		if (_value.xAxisLabel !== oldLabel) {
			var newAxisLabel = _value.xAxisLabel;
			if (!_value.xAxisLabel) {
				newAxisLabel = _value.xColumn;
			}
			chartManager.getChart().getPlot().getXAxis().setLabel(newAxisLabel);
		}
	};
	
	updateYAxisLabel = function() {
		var oldLabel = _value.yAxisLabel;
		_value.yAxisLabel = document.getElementById("yAxisText").value;
		if (_value.yAxisLabel !== oldLabel) {
			var newAxisLabel = _value.yAxisLabel;
			if (!_value.xAxisLabel) {
				newAxisLabel = _value.yColumn;
			}
			chartManager.getChart().getPlot().getYAxis().setLabel(newAxisLabel);
		}
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
		
		var dragZoomEnabled = _representation.enableDragZooming;
		var zoomResetEnabled = _representation.showZoomResetButton;
        var panEnabled = _representation.enablePanning;
        var selectionEnabled = _representation.enableSelection;
        var recSelEnabled = _representation.enableRectangleSelection;
        var lasSelEnabled = _representation.enableLassoSelection;
        
        if (panEnabled || dragZoomEnabled || selectionEnabled || zoomResetEnabled) {
        	knimeService.addNavSpacer();
        }
        
        if (zoomResetEnabled) {
	    	knimeService.addButton('scatter-zoom-reset-button', 'search-minus', 'Reset Zoom', function() {
	    		var plot = chartManager.getChart().getPlot();
	    		plot.getXAxis().setAutoRange(true);
	    		plot.getYAxis().setAutoRange(true);
	    	});
	    	if (panEnabled || dragZoomEnabled || selectionEnabled) {
	    		knimeService.addNavSpacer();
	    	}
	    }
        
        if (dragZoomEnabled) {
        	var zoomButtonClicked = function() {
        		d3.selectAll('#knime-service-header .service-button').classed('active', function() {return "scatter-mouse-mode-zoom" == this.getAttribute('id')});
        		chartManager._availableLiveMouseHandlers = [];
        		chartManager.addLiveHandler(new jsfc.ZoomHandler(chartManager));
        	}
        	knimeService.addButton('scatter-mouse-mode-zoom', 'search', 'Mouse Mode "Zoom"', zoomButtonClicked);
        	if (!selectionEnabled && !panEnabled) {
        		zoomButtonClicked();
        	}
        }
        
        if (selectionEnabled) {
        	var selectionButtonClicked = function() {
        		d3.selectAll('#knime-service-header .service-button').classed('active', function() {return "scatter-mouse-mode-select" == this.getAttribute('id')});
        		chartManager._availableLiveMouseHandlers = [];
        		var selectionModifier = new jsfc.Modifier.createModifier(false, false, false, true);
        		var clickSelectionHandler = new jsfc.ClickSelectionHandler(chartManager, selectionModifier);
        		if (recSelEnabled) {
               		var rectangleSelectionHandler = new jsfc.RectangleSelectionHandler(chartManager, selectionModifier);
                	var selectionHandler = new jsfc.DualHandler(chartManager, selectionModifier, clickSelectionHandler, rectangleSelectionHandler);
                	chartManager.addLiveHandler(selectionHandler);
        		} else {
        			chartManager.addLiveHandler(clickSelectionHandler);        				
        		}
        		if (lasSelEnabled) {
                	var polygonSelectionModifier = new jsfc.Modifier.createModifier(false, true, false, true);
                	var polygonSelectionHandler = new jsfc.PolygonSelectionHandler(chartManager, polygonSelectionModifier);
                	chartManager.addLiveHandler(polygonSelectionHandler);
                }
        	}
        	knimeService.addButton('scatter-mouse-mode-select', 'check-square-o', 'Mouse Mode "Select"', selectionButtonClicked);
        	if (!panEnabled) {
        		selectionButtonClicked();
        	}
        }
        	
        if (panEnabled) {
        	var panButtonClicked = function() {
        		d3.selectAll('#knime-service-header .service-button').classed('active', function() {return "scatter-mouse-mode-pan" == this.getAttribute('id')});
        		chartManager._availableLiveMouseHandlers = [];
        		chartManager.addLiveHandler(new jsfc.PanHandler(chartManager));
        	}
        	knimeService.addButton('scatter-mouse-mode-pan', 'arrows', 'Mouse Mode "Pan"', panButtonClicked);
        	panButtonClicked();
        }
		
        // -- Initial interactivity settings --
        if (_representation.enableSelection && _value.showSelectedOnly) {
			applyFilter();
        }
        if (knimeService.isInteractivityAvailable()) {
        	if (_representation.enableSelection && _value.subscribeSelection) {
				knimeService.subscribeToSelection(_representation.keyedDataset.id, selectionChanged);
			}
        	var filterIds = _representation.subscriptionFilterIds;
        	if (filterIds && filterIds.length > 0 && _value.subscribeFilter) {
				knimeService.subscribeToFilter(_representation.keyedDataset.id, filterChanged, filterIds);
			}
        }

        // -- Menu Items --
	    if (!_representation.enableViewConfiguration) {
	    	return;
	    }
	    var pre = false;
	    
	    if (_representation.enableTitleChange || _representation.enableSubtitleChange) {
	    	pre = true;
	    	if (_representation.enableTitleChange) {
	    		var chartTitleText = knimeService.createMenuTextField('chartTitleText', _value.chartTitle, updateTitle, false);
	    		knimeService.addMenuItem('Chart Title:', 'header', chartTitleText);
	    	}
	    	if (_representation.enableSubtitleChange) {
	    		var chartSubtitleText = knimeService.createMenuTextField('chartSubtitleText', _value.chartSubtitle, updateSubtitle, false);
	    		var mi = knimeService.addMenuItem('Chart Subtitle:', 'header', chartSubtitleText, null, knimeService.SMALL_ICON);
	    	}
	    }
	    
	    if (_representation.enableXColumnChange || _representation.enableYColumnChange) {
	    	if (pre) {
	    		knimeService.addMenuDivider();
	    	}
	    	if (_representation.enableXColumnChange) {
	    		var xSelect = knimeService.createMenuSelect('xColumnSelect', _value.xColumn, _keyedDataset.columnKeys(), function() {
	    			_value.xColumn = this.value;
	    			if (!_value.xAxisLabel) {
	    				chartManager.getChart().getPlot().getXAxis().setLabel(_value.xColumn, false);
	    			}
	    			updateChart();
	    		});
	    		knimeService.addMenuItem('X Column:', 'long-arrow-right', xSelect);
	    	}
	    	if (_representation.enableYColumnChange) {
	    		var ySelect = knimeService.createMenuSelect('yColumnSelect', _value.yColumn, _keyedDataset.columnKeys(), function() {
	    			_value.yColumn = this.value;
	    			if (!_value.yAxisLabel) {
	    				chartManager.getChart().getPlot().getYAxis().setLabel(_value.yColumn, false);
	    			}
	    			updateChart();
	    		});
	    		knimeService.addMenuItem('Y Column:', 'long-arrow-up', ySelect);
	    	}
	    	pre = true;
	    }
	    if (_representation.enableXAxisLabelEdit || _representation.enableYAxisLabelEdit) {
	    	if (pre) {
	    		knimeService.addMenuDivider();
	    	}
	    	if (_representation.enableXAxisLabelEdit) {
	    		var xAxisText = knimeService.createMenuTextField('xAxisText', _value.xAxisLabel, updateXAxisLabel, false);
	    		knimeService.addMenuItem('X Axis Label:', 'ellipsis-h', xAxisText);
	    	}
	    	if (_representation.enableYAxisLabelEdit) {
	    		var yAxisText = knimeService.createMenuTextField('yAxisText', _value.yAxisLabel, updateYAxisLabel);
	    		knimeService.addMenuItem('Y Axis Label:', 'ellipsis-v', yAxisText);
	    	}
	    	pre = true;
	    }
	    if (_representation.enableDotSizeChange) {
	    	// TODO enable once implemented
	    	/*var dotSizeContainer = controlContainer.append("tr").style("margin", "5px auto").style("display", "table");
	    	dotSizeContainer.append("td").append("label").attr("for", "dotSizeInput").text("Dot Size:").style("margin-right", "5px");
	    	dotSizeContainer.append("td").append("input")
	    		.attr("type", "number")
	    		.attr("id", "dotSizeInput")
	    		.attr("name", "dotSizeInput")
	    		.attr("value", _value.dotSize)
	    		.style("font-family", defaultFont)
	    		.style("font-size", defaultFontSize+"px");*/
	    }
	    if (_representation.enableSwitchLegend && _legendBuilder) {  
	    	// Initialization of _legendBuilder means there's a color model. We need to check it because of backward compatibility:
	    	// the old executed plots do not have color models, but default value for enableSwitchLegend is true.
	    	if (pre) {
	    		knimeService.addMenuDivider();
	    	}
	    	var showLegendCheckbox = knimeService.createMenuCheckbox('showLegendCheckbox', _value.showLegend, function() {
				_value.showLegend = this.checked;
				chartManager.getChart().setLegendBuilder(_value.showLegend ? _legendBuilder : null);
			});
			knimeService.addMenuItem('Show legend', 'info-circle', showLegendCheckbox);			
	    	pre = true;
	    }
	    if (_representation.enableSelection) {
	    	if (pre) {
	    		knimeService.addMenuDivider();
	    	}
			if (_representation.enableShowSelectedOnly) {				
				var showSelectedOnlyCheckbox = knimeService.createMenuCheckbox('showSelectedOnlyCheckbox', _value.showSelectedOnly, function() {
					_value.showSelectedOnly = this.checked;
					applyFilter();
				});
				knimeService.addMenuItem('Show selected rows only', 'filter', showSelectedOnlyCheckbox);
				
			}
			pre = true;			
		}
	    if (knimeService.isInteractivityAvailable()) {
	    	if (pre) {
	    		knimeService.addMenuDivider();
	    	}
	    	if (_representation.enableSelection) {
	    		var pubSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-right', 'faded left sm', 'right bold');
				var pubSelCheckbox = knimeService.createMenuCheckbox('publishSelectionCheckbox', _value.publishSelection, function() {
					if (this.checked) {
						_value.publishSelection = true;
						knimeService.setSelectedRows(_representation.keyedDataset.id, getSelection());
					} else {
						_value.publishSelection = false;
					}
				});
				knimeService.addMenuItem('Publish selection', pubSelIcon, pubSelCheckbox);
				
				var subSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-double-right', 'faded right sm', 'left bold');
				var subSelCheckbox = knimeService.createMenuCheckbox('subscribeSelectionCheckbox', _value.subscribeSelection, function() {
					if (this.checked) {
						knimeService.subscribeToSelection(_representation.keyedDataset.id, selectionChanged);
					} else {
						knimeService.unsubscribeSelection(_representation.keyedDataset.id, selectionChanged);
					}
				});
				knimeService.addMenuItem('Subscribe to selection', subSelIcon, subSelCheckbox);
	    	}
	    	
	    	if (_representation.subscriptionFilterIds && _representation.subscriptionFilterIds.length > 0) {
				if (_representation.enableSelection) {
					knimeService.addMenuDivider();
				}				
				var subFilIcon = knimeService.createStackedIcon('filter', 'angle-double-right', 'faded right sm', 'left bold');
				var subFilCheckbox = knimeService.createMenuCheckbox('subscribeFilterCheckbox', _value.subscribeFilter, function() {
					if (this.checked) {
						knimeService.subscribeToFilter(_representation.keyedDataset.id, filterChanged, _representation.subscriptionFilterIds);
					} else {
						knimeService.unsubscribeFilter(_representation.keyedDataset.id, filterChanged);
					}
				});
				knimeService.addMenuItem('Subscribe to filter', subFilIcon, subFilCheckbox);
			}
	    	
	    	pre = true;
	    }
	};
	
	selectionChanged = function(data) {
		var dataset = chartManager.getChart().getPlot().getDataset();
		var removedIds = [];  // ids of the points which were unselected (removed from selection)
		var addedIds = [];    // ids of the points which were selected (added to selection)

		if (data.changeSet) {
			// if changeSet is presented, we do only an incremental update
			if (data.changeSet.removed) {
				for (var i = 0; i < data.changeSet.removed.length; i++) {
					var removedId = getRowIndex(data.changeSet.removed[i]);
					unselect(dataset, removedId);
					removedIds.push(removedId);
				}
			}
			if (data.changeSet.added) {
				for (var i = 0; i < data.changeSet.added.length; i++) {
					var addedId = getRowIndex(data.changeSet.added[i]);
					select(dataset, addedId);
					addedIds.push(addedId);
				}
			}
		} else {
			// if no changeSet is presented, we will need to compare the old and the new selections and 
			// extract added and removed points from this comparison	
			// Old selection comes from dataset. New selection comes from data. Their structure is different.
			
			var newSelection = []; // row indices from the new selection
			if (data.elements) {
				// iterate over the new selected points and add them to newSelection
				for (var elId = 0; elId < data.elements.length; elId++) {
					var element = data.elements[elId];
					if (!element.rows) {
						continue;
					}
					for (var rId = 0; rId < element.rows.length; rId++) {
						newSelection.push(getRowIndex(element.rows[rId]));						
					}
				}				
			}
			
			var oldSelection = []; // row indices from the old selection == item keys of the selected items
			var oldSelectionItems = getSelectionItemsById(dataset, SELECTION_ID); // selected items from the old selection
			if (oldSelectionItems) {		
				// for each item we need to have its key, so we fill it here
				for (var i = 0; i < oldSelectionItems.length; i++) {
					oldSelection.push(oldSelectionItems[i].itemKey);	
					// at the same time, if an item from the oldSelection is not presented in the newSelection, then it was unselected => removed
					if (newSelection.indexOf(oldSelectionItems[i].itemKey) == -1) {
						removedIds.push(oldSelectionItems[i].itemKey);
					}					
				}
			}			
			
			// clear current selection
			dataset.clearSelection(SELECTION_ID, false);
			
			// select everything from the newSelection
			for (var i = 0; i < newSelection.length; i++) {
				select(dataset, newSelection[i]);
				// at the same time, if an item from the newSelection is not presented in the oldSelection, then it was selected => added
				if (oldSelection.indexOf(newSelection[i]) == -1) {
					addedIds.push(newSelection[i]);
				}
			}
		}
		
		// Iterating over all the circles (they represent the points),
		// checking, if they were added or removed (by constructing "ref" attribute), 
		// and if so we change their outlook:
		//   - for removed we reduce the radius by 2
		//   - for added we double the radius
		// all of this simulates the correct selection outlook without a total plot redraw
		var circles = d3.selectAll('circle')
			.each(function() {
				var itemKey = extractItemKeyFromRefString(this.getAttribute('ref'));
				for (var i = 0; i < removedIds.length; i++) {
					if (itemKey == removedIds[i]) {
						this.setAttribute('r', this.getAttribute('r') / 2);
						return;
					}				
				}
				for (var i = 0; i < addedIds.length; i++) {
					if (itemKey == addedIds[i]) {
						this.setAttribute('r', this.getAttribute('r') * 2);
						return;
					}				
				}
			})
			.classed('hidden', function() {
				if (!_value.showSelectedOnly) {
					return false;
				}
				var itemKey = extractItemKeyFromRefString(this.getAttribute('ref'));
				for (var i = 0; i < removedIds.length; i++) {
					if (itemKey == removedIds[i]) {		
						hiddenItemKeys.push(itemKey);
						return true;
					}				
				}
				for (var i = 0; i < addedIds.length; i++) {
					if (itemKey == addedIds[i]) {
						var ind = hiddenItemKeys.indexOf(itemKey);
						if (ind != -1) {
							hiddenItemKeys.splice(ind, 1);
						}
						return false;
					}				
				}
				return d3.select(this).classed('hidden');
			});	
	}
	
	publishSelection = function() {
		if (_value.publishSelection) {
			knimeService.setSelectedRows(_representation.keyedDataset.id, getSelection(), selectionChanged);
		}
	};
	
	getSelection = function() {
		var dataset = chartManager.getChart().getPlot().getDataset();
		var selections = dataset.selections;
		var selectionsArray = [];
		for (var i = 0; i < selections.length; i++) {
			if (selections[i].id === SELECTION_ID) {
				selectionsArray = selections[i].items;
				break;
			}
		}
		var selectionIDs = [];
		for (var i = 0; i < selectionsArray.length; i++) {
			var selIndex = dataset.itemIndex("series 1", selectionsArray[i].itemKey);
			if (selIndex >=0 && selIndex < indexRowkeyMap.length) {
				var rowKey = indexRowkeyMap[selIndex];
				if (rowKey) {
					selectionIDs.push(rowKey);
				}
			}
		}
		if (selectionsArray.length == 0) {
			return null;
		}
		return selectionIDs;
	};
	
	/**
	 * Select the point by its row index in the given dataset without notifying the listeners,
	 * which means the point is only added to the selection object, but not visually redrawn
	 * 
	 * @param {jsfc.XYDataset} dataset  the dataset in which to select the point
	 * @param {!string} rowIndex  the row index
	 * @returns {undefined}
	 */
	select = function(dataset, rowIndex) {		
		// "selection" is a default id for the selection
		// "series 1" is a default name for series		 
		dataset.select(SELECTION_ID, "series 1", rowIndex, false);
	}
	
	/**
	 * Unselect the point by its row index in the given dataset without notifying the listeners,
	 * which means the point is only removed from the selection object, but not visually redrawn
	 * 
	 * @param {jsfc.XYDataset} dataset  the dataset in which to unselect the point
	 * @param {!string} rowIndex  the row index
	 * @returns {undefined}
	 */
	unselect = function(dataset, rowIndex) {		
		// "selection" is a default id for the selection
		// "series 1" is a default name for series		 
		dataset.unselect(SELECTION_ID, "series 1", rowIndex, false);
	}
	
	/**
	 * Getting the row index in dataset based on the provided row key.
	 * For some internal reason, the row index must be converted to a string
	 * 
	 * @param {!string} rowKey  the row key
	 * @returns {!string} the row index
	 */
	getRowIndex = function(rowKey) {
		//return String(_keyedDataset.rowIndex(rowKey));
		return new String(indexRowkeyMap.indexOf(rowKey));
	}
	
	filterChanged = function(data) {
		var filter = data;
		var rows = _keyedDataset.data.rows;
		var dataset = chartManager.getChart().getPlot().getDataset();
		var showIds = [];
		var hideIds = [];
		
		dataset.clearSelection(FILTERED_ID, false);
		
		for (var i = 0; i < rows.length; i++) {
			var dataId = indexRowkeyMap.indexOf(rows[i].key);
			if (isRowIncludedInFilter(rows[i], filter)) {
				// displaying the point
				dataset.unselect(FILTERED_ID, "series 1", String(dataId), false);
				showIds.push(dataId);
			} else {				
				// hiding the point
				dataset.select(FILTERED_ID, "series 1", String(dataId), false);
				hideIds.push(dataId);
			}
		}
		
		var circles = d3.selectAll('circle')
			.classed('filtered', function() {
				var itemKey = extractItemKeyFromRefString(this.getAttribute('ref'));
				for (var i = 0; i < showIds.length; i++) {
					if (itemKey == showIds[i]) {						
						return false;						
					}				
				}
				for (var i = 0; i < hideIds.length; i++) {
					if (itemKey == hideIds[i]) {
						return true;						
					}				
				}
				return false;
			});
	}
	
	isRowIncludedInFilter = function(row, filter) {
		if (filter && filter.elements) {
			var included = true;
			//var row = _keyedDataset.data.rows[rowIndex];
			for (var i = 0; i < filter.elements.length; i++) {
				var filterElement = filter.elements[i];
				if (filterElement.type == "range" && filterElement.columns) {
					for (var col = 0; col < filterElement.columns.length; col++) {
						var column = filterElement.columns[col];
						var columnIndex = _keyedDataset.data.columnKeys.indexOf(column.columnName);
						if (columnIndex > -1) {
							var rowValue = row.values[columnIndex];
							if (column.type = "numeric") {
								if (column.minimumInclusive) {
									included &= (rowValue >= column.minimum);
								} else {
									included &= (rowValue > column.minimum);
								}
								if (column.maximumInclusive) {
									included &= (rowValue <= column.maximum);
								} else {
									included &= (rowValue < column.maximum);
								}
							} else if (column.type = "nominal") {
								included &= (column.values.indexOf(rowValue) >= 0);
							}
						}
					}
				} else {
					// TODO row filter - currently not possible
				}
			}
			return included;
		}
		return true;
	}
	
	applyFilter = function() {
		var dataset = chartManager.getChart().getPlot().getDataset();
		var filteredItems = getSelectionItemsById(dataset, FILTERED_ID);
		var selectedItems = getSelectionItemsById(dataset, SELECTION_ID);
		
		var circles = d3.selectAll('circle')
			.classed('filtered', function() {
				if (!filteredItems || filteredItems.length == 0) {
					return false;
				}
				
				var itemKey = extractItemKeyFromRefString(this.getAttribute('ref'));
				for (var i = 0; i < filteredItems.length; i++) {
					if (itemKey == filteredItems[i].itemKey) {						
						return true;
					}
				}
				return false;
			})
			.classed('hidden', function() {
				if (!_value.showSelectedOnly) {
					return false;
				}
				
				var itemKey = extractItemKeyFromRefString(this.getAttribute('ref'));
				
				if (!selectedItems || selectedItems.length == 0) {
					hiddenItemKeys.push(itemKey);
					return true;
				}				
				
				for (var i = 0; i < selectedItems.length; i++) {
					if (itemKey == selectedItems[i].itemKey) {
						var ind = hiddenItemKeys.indexOf(itemKey);
						if (ind != -1) {
							hiddenItemKeys.splice(ind, 1);
						}
						return false;
					}				
				}
				hiddenItemKeys.push(itemKey);
				return true;	
			});
		if (!_value.showSelectedOnly) {
			hiddenItemKeys = [];
		}
	}
	
	getSelectionItemsById = function(dataset, id) {		
		var selectArr = dataset.selections;
		if (selectArr) {		
			for (var i = 0; i < selectArr.length; i++) {
				if (selectArr[i] && id == selectArr[i].id && selectArr[i].items) {
					return selectArr[i].items;				
				}
			}
		}
		return undefined;
	}
	
	unselectHiddenOrFilteredPoints = function() {
		var dataset = chartManager.getChart().getPlot().getDataset();
		var circles = d3.selectAll('circle')
			.each(function() {
				var itemKey = extractItemKeyFromRefString(this.getAttribute('ref'));				
				if (dataset.isSelected(SELECTION_ID, "series 1", itemKey) && 
						(hiddenItemKeys.indexOf(itemKey) != -1 || dataset.isSelected(FILTERED_ID, "series 1", itemKey))) {
					this.setAttribute('r', this.getAttribute('r') / 2);
					unselect(dataset, itemKey);
				}				
			});
	}
	
	extractItemKeyFromRefString = function(refStr) {
		return refStr.match(/,"\d+/)[0].substring(2);
	}
	
	view.validate = function() {
		return true;
	};
	
	view.getSVG = function() {
		if (!chartManager || !chartManager.getElement()) {
			return null;
		}
		var svg = chartManager.getElement();
		d3.select(svg).selectAll("circle").each(function() {
			this.removeAttribute("ref");
			this.removeAttribute("xmlns");
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
	
	legendInfo = function() {
		var info = {};		
	    if (_colorModel) {
	    	info.type = _colorModel.type;
	    	info.title = _colorModel.title + ": ";
	    	if (_colorModel.type == NOMINAL_MODEL) {
	    		info.values = [];
	    		for (var i = 0; i < _colorModel.labels.length; i++) {
	    			var item = new jsfc.LegendItemInfo(_colorModel.labels[i], jsfc.Color.fromStr(_colorModel.colors[i]));
	    			item.label = _colorModel.labels[i];
	    			info.values.push(item);
	    		}
	    	} else if (_colorModel.type == RANGE_MODEL) {
	    		info = {};
	    	}
	    }		
	    return info;
	}
	
	createLegend = function(plot, anchor, orientation, style) {
	    var info = plot.legendInfo();
	    var result = new jsfc.FlowElement();
	    var me = this;
	    
	    //TODO: enable when we want to show a title for a legend
	    /*var title = new jsfc.TextElement().setFont(me._font);
	    var item = new jsfc.GridElement();
	    item.add(title, "R1", "C1");
        result.add(item);*/
        
        if (info.type == NOMINAL_MODEL) {        
		    info.values.forEach(function(info) {
		        var shape = new jsfc.RectangleElement(8, 5)
		                .setFillColor(info.color);
		        var text = new jsfc.TextElement(info.label).setFont(me._font);
		        var item = new jsfc.GridElement();
		        item.add(shape, "R1", "C1");
		        item.add(text, "R1", "C2");
		        result.add(item);
		    });
        } else if (info.type == RANGE_MODEL) {
        	
        }
	    return result;
	};
	
    // Fix missing values.
	// ToDo: apply changes to JSFreeChart
	// Fixed with null-checking and ignoring null values
	extractXYDatasetFromColumns2D = function(dataset, xcol, 
	        ycol, seriesKey) {
		missingValuesCount = 0;
		indexRowkeyMap = new Array(dataset.rowCount());
	    jsfc.Args.requireString(xcol, "xcol");
	    jsfc.Args.requireString(ycol, "ycol");
	    var result = new jsfc.StandardXYDataset();
	    seriesKey = seriesKey || "series 1";
	    for (var r = 0; r < dataset.rowCount(); r++) {
	        var rowKey = dataset.rowKey(r);
	        var x = dataset.valueByKey(rowKey, xcol);
	        var y = dataset.valueByKey(rowKey, ycol);
	        if (x === null || y === null) {  // <-- changed here
	        	missingValuesCount++;
	        	continue;
	        }
	        result.add(seriesKey, x, y);
	        var rowPropKeys = dataset.getRowPropertyKeys(rowKey);
	        var xPropKeys = dataset.getItemPropertyKeys(rowKey, xcol);
	        var yPropKeys = dataset.getItemPropertyKeys(rowKey, ycol);
	        var itemIndex = result.itemCount(0) - 1;
	        indexRowkeyMap.splice(itemIndex, 0, rowKey);
	        rowPropKeys.forEach(function(key) {
	            var p = dataset.getRowProperty(rowKey, key);
	            result.setItemPropertyByIndex(0, itemIndex, key, p);
	        });
	        xPropKeys.forEach(function(key) {
	            var p = dataset.getItemProperty(rowKey, xcol, key);
	            result.setItemPropertyByIndex(0, itemIndex, key, p); 
	        });
	        yPropKeys.forEach(function(key) {
	            var p = dataset.getItemProperty(rowKey, ycol, key);
	            result.setItemPropertyByIndex(0, itemIndex, key, p); 
	        });
	    }

	    // special handling for 'symbols' property
	    var xsymbols = dataset.getColumnProperty(xcol, "symbols");
	    if (xsymbols) {
	        result.setProperty("x-symbols", xsymbols);
	    }
	    var ysymbols = dataset.getColumnProperty(ycol, "symbols");
	    if (ysymbols) {
	        result.setProperty("y-symbols", ysymbols);
	    }
	    
	    if (missingValuesCount == dataset.rowCount()) {
	    	isEmptyPlot = true;
	    }
	    
	    return result;
	};
	
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