(streamgraph_namespace = function() {

  var view = {};
  var _representation, _value;
  var _data;
  var _colorRange;
  var layoutContainer;
  var MIN_HEIGHT = 300, MIN_WIDTH = 400;
  var chart, svg;
  var knimeTable1, knimeTable2;
  var xAxisType, xAxisData;
  var currentFilter = null;

  var stackStyleByType = {
    "Stacked-Area-Chart": "stack",
    "Percentage-Area-Chart": "expand",
    "Stream-Graph": "stream-center"
  }
  
  var TOOLTIP_WARNING = 'basisTooltip';


  view.init = function(representation, value) {
    _representation = representation;
    _value = value;
    // Create Knime tables from data.
    // Load data from port 1.
    knimeTable1 = new kt();
    knimeTable1.setDataTable(_representation.inObjects[0]);
    var columnKeys = _representation.options.columns;

    // Load data from port 2.
    knimeTable2 = null;
    if (_representation.inObjects[1] !== null) {
      knimeTable2 = new kt();
      knimeTable2.setDataTable(_representation.inObjects[1]);
    }
    
    // Set locale for moment.js.
	if (_representation.options.dateTimeFormats.globalDateTimeLocale !== 'en') {
		moment.locale(_representation.options.dateTimeFormats.globalDateTimeLocale);
	}


    if (_representation.options.enableViewControls) {
      drawControls();
    }
    setColors();
    setXAxisConf();
    transformData();
    drawChart();
    toggleFilter();
  }

  var drawChart = function() {
    // Remove earlier chart.
    d3.select("#layoutContainer").remove();

    /*
     * Parse some options.
     */
    var stackStyle = stackStyleByType[_value.options.chartType];
    var optFullscreen = _representation.options.svg.fullscreen &&
                        _representation.runningInView;
    var isTitle = _value.options.title !== "" || _value.options.subtitle !== "";

    /*
     * Create HTML for the view.
     */
    d3.selectAll("html, body")
      .style({
        "width": "100%",
        "height": "100%",
        "margin": "0",
        "padding": "0"
      });

    var body = d3.select("body");

    // Determine available witdh and height.
    if (optFullscreen) {
      var width = "100%";

      if (isTitle || !_representation.options.enableViewControls) {
        knimeService.floatingHeader(true);
        var height = "100%";
      } else {
        knimeService.floatingHeader(false);
        var height = "calc(100% - " + knimeService.headerHeight() + "px)"
      }

    } else {
      var width = _representation.options.svg.width + 'px';
      var height = _representation.options.svg.height + 'px';
    }

    layoutContainer = body.append("div")
      .attr("id", "layoutContainer")
      .style({
        "width": width,
        "height": height,
        "min-width": MIN_WIDTH + "px",
        "min-height": MIN_HEIGHT + "px",
        "position": "absolute"
      });

    // create div container to hold svg
    var svgContainer = layoutContainer.append("div")
      .attr("id", "svgContainer")
      .style({
        "min-width": MIN_WIDTH + "px",
        "min-height": MIN_HEIGHT + "px",
        "box-sizing": "border-box",
        "overflow": "hidden",
        "margin": "0",
        "width": "100%",
        "height": "100%"
      });

    // Create the SVG object
    svg = svgContainer.append("svg")
      .attr("id", "svg")
      .style("font-family", "sans-serif")

    if (optFullscreen) {
      svg.attr("width", "100%");
      svg.attr("height", "100%");
    } else {
      svg.attr("width", width)
      svg.attr("height", height);
    }
    
    if (_value.options.interpolation == 'basis' && _value.options.interactiveGuideline) {
    	knimeService.setWarningMessage('Displaying a tooltip is not supported when interpolation is set to "basis".', TOOLTIP_WARNING);
    } else {
    	knimeService.clearWarningMessage(TOOLTIP_WARNING);
    }

    // create the stacked area chart
    nv.addGraph(function() {
      chart = nv.models.stackedAreaChart()
        .margin({ right: 50 })
        .x(function(d) { return d[0]; })
        .y(function(d) { return d[1]; })
        .color(_colorRange)
        .interpolate(_value.options.interpolation)
        .style(stackStyle)
        .showControls(false)
        .showLegend(true)
        .useInteractiveGuideline(_value.options.interpolation == 'basis' ? false : _value.options.interactiveGuideline)
        .interactive(false)
        .duration(0);

        var topMargin = 10;
  			topMargin += _value.options.title ? 10 : 0;
  			topMargin += _value.options.legend ? 0 : 30;
  			topMargin += _value.options.subtitle ? 8 : 0;
        var bottomMargin = _value.options.title || _value.options.subtitle ? 25 : 30;
  			chart.legend.margin({
  				top : topMargin,
  				bottom : topMargin
  			});
  			chart.margin({
  				top : topMargin,
  				bottom : bottomMargin
  			});

      chart.xAxis
        .tickFormat(createXAxisFormatter());

      chart.yAxis
        .tickFormat(d3.format(_representation.options.yAxisFormatString));

      updateTitles(false);
      updateAxisLabels(false);

      svg.datum(_data).call(chart);

      nv.utils.windowResize(chart.update);

      if  ("disabled" in _value.options) {
        var state = chart.defaultState();
        state.disabled = _value.options.disabled;
        chart.dispatch.changeState(state);
      }

      toggleGrid();
      toggleLegend();

      return chart;
    });
  }

	var toggleGrid = function() {
		var opacity = _value.options.showGrid ? 1 : 0;
		d3.selectAll("g.tick:not(.zero) > line").style("opacity", opacity);
	}

	var toggleLegend = function() {
		var opacity = _value.options.legend ? 1 : 0;
		d3.select("g.nv-legend").style("opacity", opacity);
	}

  var setXAxisConf = function() {
    // Set data and data type for the x-axis.
    var xAxisColumn = _representation.options.xAxisColumn;
    if (typeof xAxisColumn !== "undefined") {
      var columnIndex = knimeTable1.getColumnNames().indexOf(xAxisColumn);
      xAxisType = knimeTable1.getColumnTypes()[columnIndex];
      if (xAxisType == "dateTime") {
    	  // need to get which exactly date&time type it is
    	  xAxisType = knimeTable1.getKnimeColumnTypes()[columnIndex];
      }
      xAxisData = knimeTable1.getColumn(columnIndex);
    } else {
      // If undefined: The user selected RowId as x-Axis.
      xAxisType = "string";
      xAxisData = [];

      var rows = knimeTable1.getRows();
      for (var i = 0; i < rows.length; i++) {
        xAxisData.push(rows[i].rowKey);
      }
    }
  }

  // Transform the tabular format into a JSON format.
  var transformData = function() {
		// Check which rows are included by the filter.
		var includedRows = [];
		for (var i = 0; i < knimeTable1.getNumRows(); i++) {
			if (!currentFilter ||
					knimeTable1.isRowIncludedInFilter(i, currentFilter)) {

				includedRows.push(i);
			}
		}

    _data = [];
    var columns = _representation.options.columns
    // Loop over all columns.
    for (var i = 0; i < columns.length; i++) {
      var columnKey = columns[i];
      var columnIndex = knimeTable1.getColumnNames().indexOf(columnKey);
			var currentColumn = knimeTable1.getColumn(columnIndex);

      _data.push({
        "key" : columnKey,
				"values" : includedRows.map(
				    // This loops over all rows that are included.
				    function(i) {
				      d = currentColumn[i];

			        if (xAxisType === 'number') {
			          // If data type of x-axis column can be interpreted as numeric,
			          // use the data for the x-axis.
			          return [xAxisData[i], d]
			        } else {
			          // If not, just use an integer index [0, n[.
			          return [i, d];
			        }
				    }
				)
      });
    }
  };

  var toggleFilter = function() {
    if (_value.options.subscribeFilter) {
      knimeService.subscribeToFilter(
        _representation.tableIds[0], filterChanged, knimeTable1.getFilterIds()
      );
    } else {
      knimeService.unsubscribeFilter(_representation.tableIds[0], filterChanged);
    }
  }

  var filterChanged = function(filter) {
    currentFilter = filter;
    transformData();
    svg.datum(_data);
    chart.update();
  }

  // Set color scale: custom or default.
  var setColors = function() {
    var colorScale = [];
    var columns = _representation.options.columns;
    if (knimeTable2 !== null) {
      var rowColors = knimeTable2.getRowColors();
      var numColumns = columns.length;
      for (var i = 0; i < numColumns; i++) {
        var columnName = columns[i]
        var rowIndex = knimeTable1.getColumnNames().indexOf(columnName);
        var color = rowColors[rowIndex];

        if (!color) {
          color = "#7C7C7C";
        }
        colorScale.push(color);
      }
      _colorRange = colorScale;
    } else {
      colorScale = d3.scale.category10();
      if (columns.length > 10) {
        colorScale = d3.scale.category20();
      }
      _colorRange = colorScale.range();
    }
  }

  // Return a function to format the x-axis-ticks.
  var createXAxisFormatter = function() {
    switch (xAxisType) {
      case "Date and Time":
        return function(i) {
          return moment(xAxisData[i]).utc().format(_representation.options.dateTimeFormats.globalDateTimeFormat);
        };
      case "Local Date":
    	  return function(i) {
              return moment(xAxisData[i]).format(_representation.options.dateTimeFormats.globalLocalDateFormat);
          };
      case "Local Date Time":
    	  return function(i) {
              return moment(xAxisData[i]).format(_representation.options.dateTimeFormats.globalLocalDateTimeFormat);
          };
      case "Local Time":
    	  return function(i) {
              return moment(xAxisData[i], "hh:mm:ss.SSSSSSSSS").format(_representation.options.dateTimeFormats.globalLocalTimeFormat);
          };
      case "Zoned Date Time":
    	  return function(i) {    	 
    	  		var data = xAxisData[i];
    	  		var regex = /(.*)\[(.*)\]$/
				var match = regex.exec(data);

				if (match == null) {
					var date = moment.tz(data, "");
				} else {
					dateTimeOffset = match[1];
					var date = moment.tz(dateTimeOffset, _representation.options.dateTimeFormats.timezone);
				}

				return date.format(_representation.options.dateTimeFormats.globalZonedDateTimeFormat);
          };
      case "string":
        return function(i) { return xAxisData[i]; };
      case "number":
        return d3.format(_representation.options.xAxisFormatString);
      default:
        return function(i) { return i; };
    }
  }

  var updateTitles = function(updateChart) {
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
          svg.append("text").attr("x", 20).attr("y", 30).attr(
              "font-size", 24).attr("id", "title").text(
              _value.options.title);
        } else {
          curTitle.text(_value.options.title);
        }
      }
      if (!_value.options.subtitle) {
        curSubtitle.remove();
      }
      if (_value.options.subtitle) {
        if (curSubtitle.empty()) {
          svg.append("text").attr("x", 20).attr("y",
              _value.options.title ? 46 : 20).attr("font-size",
              12).attr("id", "subtitle").text(
              _value.options.subtitle);
        } else {
          curSubtitle.text(_value.options.subtitle).attr("y",
              _value.options.title ? 46 : 20);
        }
      }

      if (updateChart && chartNeedsUpdating) {
        var topMargin = 10;
  			topMargin += _value.options.title ? 10 : 0;
  			topMargin += _value.options.legend ? 0 : 30;
  			topMargin += _value.options.subtitle ? 8 : 0;
        var bottomMargin = 25;
        bottomMargin += !(_value.options.title || _value.options.subtitle) ? 5 : 0;
        bottomMargin += _value.options.xAxisLabel ? 20 : 0;
  			chart.legend.margin({
  				top : topMargin,
  				bottom : topMargin
  			});
  			chart.margin({
  				top : topMargin,
  				bottom : bottomMargin
  			});

        if (_representation.options.svg.fullscreen
            && _representation.runningInView) {

          var isTitle = _value.options.title !== "" || _value.options.subtitle !== "";

          if (isTitle || !_representation.options.enableViewControls) {
            knimeService.floatingHeader(true);
            var height = "100%";
          } else {
            knimeService.floatingHeader(false);
            var height = "calc(100% - " + knimeService.headerHeight() + "px)"
          }

          layoutContainer.style("height", height)
          // two rows below force to invalidate the container which solves a weird problem with vertical scroll bar in IE
          .style('display', 'none').style('display', 'block');
          // d3.select("#svgContainer").style("height", height);
        }

        chart.update();
      }
    }
  }

  function updateAxisLabels(updateChart) {
    if (chart) {
      var curYAxisLabel = "";
      var curXAxisLabel = "";
      var curYAxisLabelElement = d3.select(".nv-y.nv-axis .nv-axislabel");
      var curXAxisLabelElement = d3.select(".nv-x.nv-axis .nv-axislabel");
      if (!curYAxisLabelElement.empty()) {
        curYAxisLabel = curYAxisLabelElement.text();
      }
      if (!curXAxisLabelElement.empty()) {
        curXAxisLabel = curXAxisLabelElement.text();
      }
      var chartNeedsUpdating = (curYAxisLabel != _value.options.yAxisLabel)
                            || (curXAxisLabel != _value.options.xAxisLabel);

      if (!chartNeedsUpdating) return;

      chart.xAxis
        .axisLabel(_value.options.xAxisLabel)
        .axisLabelDistance(0);

      chart.yAxis
        .axisLabel(_value.options.yAxisLabel)
        .axisLabelDistance(0)

      var bottomMargin = 25;
      bottomMargin += !(_value.options.title || _value.options.subtitle) ? 5 : 0;
      bottomMargin += _value.options.xAxisLabel ? 20 : 0;

      var leftMargin = 60;
      leftMargin += _value.options.yAxisLabel ? 15 : 0;

      chart.margin({ left: leftMargin, bottom: bottomMargin })

      if (updateChart) {
        chart.update();
      }
    }
  }

  var drawControls = function() {
	  if (!knimeService) {
		  // TODO: error handling?
		  return;
	  }

    if (_representation.options.displayFullscreenButton) {
      knimeService.allowFullscreen();
    }
    
    if (!_representation.options.enableViewControls) {
    	return;
    }

    // Title / Subtitle Configuration
    var titleEdit = _representation.options.enableTitleEdit;
    var subtitleEdit = _representation.options.enableSubtitleEdit;
  	if (titleEdit || subtitleEdit) {
  	  if (titleEdit) {
  	    var chartTitleText = knimeService.createMenuTextField(
  	        'chartTitleText', _value.options.title, function() {
  	      if (_value.options.title != this.value) {
  	        _value.options.title = this.value;
  	        updateTitles(true);
  	      }
  	    }, true);
  	    knimeService.addMenuItem('Chart Title:', 'header', chartTitleText);
  	  }
  	  if (subtitleEdit) {
  	    var chartSubtitleText = knimeService.createMenuTextField(
  	        'chartSubtitleText', _value.options.subtitle,
  	        function() {
  	        	if (_value.options.subtitle != this.value) {
  	        		_value.options.subtitle = this.value;
  	        		updateTitles(true);
  	        	}
  	        }, true);
  	    knimeService.addMenuItem('Chart Subtitle:', 'header', chartSubtitleText, null, knimeService.SMALL_ICON);
  	  }
  	}

  	// x-Axis & y-Axis Labels
    var xAxisEdit = _representation.options.enableXAxisEdit;
    var yAxisEdit = _representation.options.enableYAxisEdit;
  	if (xAxisEdit || yAxisEdit) {
        knimeService.addMenuDivider();

  	  if (xAxisEdit) {
  		var xAxisText = knimeService.createMenuTextField(
  			'xAxisText', _value.options.xAxisLabel,
  		function() {
  				if (_value.options.xAxisLabel != this.value) {
  					_value.options.xAxisLabel = this.value;
  					updateAxisLabels(true);
  				}
  			}, true);
  		knimeService.addMenuItem('X-axis label:', 'ellipsis-h', xAxisText);
  	  }
  	  if (yAxisEdit) {
  			var yAxisText = knimeService.createMenuTextField(
  				'yAxisText', _value.options.yAxisLabel,
  			function() {
  					if (_value.options.yAxisLabel != this.value) {
  						_value.options.yAxisLabel = this.value;
  						updateAxisLabels(true);
  					}
  				}, true);
  			knimeService.addMenuItem('Y-axis label:', 'ellipsis-v', yAxisText);
  		  }
  	}

    // Chart Type / Interpolation Method / Custom Color
    var chartTypeChange = _representation.options.enableChartTypeChange;
    var interpolationEdit = _representation.options.enableInterpolationMethodEdit;
    if (chartTypeChange || interpolationEdit || customColorToggle) {
      knimeService.addMenuDivider();

      if (chartTypeChange) {
        var chartTypes = Object.keys(stackStyleByType);
        var chartTypeSelector =
          knimeService.createMenuSelect('chartTypeSelector', _value.options.chartType, chartTypes, function() {
            _value.options.chartType = this.options[this.selectedIndex].value;
            drawChart();  // needs a redraw to avoid tooltip problem (AP-7068)
          });
        knimeService.addMenuItem('Chart Type:', 'area-chart', chartTypeSelector);
      }

      if (interpolationEdit) {
        var interpolationMethods = [ 'basis', 'linear', 'step' ];
        var interpolationMethodSelector =
          knimeService.createMenuSelect('interpolationMethodSelector', _value.options.interpolation, interpolationMethods, function() {
        	var changedToBasis = this.options[this.selectedIndex].value == 'basis' && _value.options.interpolation != 'basis'; 
            _value.options.interpolation = this.options[this.selectedIndex].value;
            if (changedToBasis && _value.options.interactiveGuideline) {
            	 drawChart();
            } else {
            	knimeService.clearWarningMessage(TOOLTIP_WARNING);
            	chart.interpolate(_value.options.interpolation);
            	chart.useInteractiveGuideline(_value.options.interpolation == 'basis' ? false : _value.options.interactiveGuideline);
            	chart.update();
            }
          });
        // CHECK: Should we use line-chart here?
        knimeService.addMenuItem('Interpolation:', 'bar-chart', interpolationMethodSelector);
      }
    }

    // Legend, Interactive Guideline, Grid
    var legendToggle = _representation.options.enableLegendToggle;
    var interactiveGuidelineToggle = _representation.options.enableInteractiveGuidelineToggle;
		var showGridToggle = _representation.options.showGridToggle;
    if (legendToggle || interactiveGuidelineToggle || showGridToggle) {
      knimeService.addMenuDivider();

      if (legendToggle) {
        var legendCheckbox = knimeService.createMenuCheckbox(
            'legendCheckbox', _value.options.legend, function() {
              _value.options.legend = this.checked;
              toggleLegend();
            });
        knimeService.addMenuItem('Legend:', 'info-circle', legendCheckbox);
      }

      if (interactiveGuidelineToggle) {
        var interactiveGuidelineCheckbox = knimeService.createMenuCheckbox(
                'interactiveGuidelineCheckbox',
                _value.options.interactiveGuideline,
                function() {
                  _value.options.interactiveGuideline = this.checked;
                  drawChart();
                });

        knimeService.addMenuItem('Tooltip:', 'comment',
            interactiveGuidelineCheckbox);
      }

			if (showGridToggle) {
        var gridCheckbox = knimeService.createMenuCheckbox(
            'gridCheckbox', _value.options.showGrid, function() {
              _value.options.showGrid = this.checked;
              toggleGrid();
            });
        knimeService.addMenuItem('Show Grid:', 'th', gridCheckbox);
      }
    }

    // Filter event checkbox.
    if (knimeService.isInteractivityAvailable()) {
      knimeService.addMenuDivider();
      var subFilIcon = knimeService.createStackedIcon('filter', 'angle-double-right', 'faded right sm', 'left bold');

      var subFilCheckbox = knimeService.createMenuCheckbox(
          'filterCheckbox', _value.options.subscribeFilter, function() {
            _value.options.subscribeFilter = this.checked;
            toggleFilter();
          });
      knimeService.addMenuItem('Subscribe to filter', subFilIcon, subFilCheckbox);
    }
  };

  view.validate = function() {
    return true;
  }

  view.getComponentValue = function() {
    // Save disabled-state of the series from the chart if:
    //   - it was saved in _value before
    //   - some series are disabled

    var container = d3.select("#svgContainer");
    var disabled = container.selectAll('g .nv-series').data().map(function(o) { return !!o.disabled })

    if  (("disabled" in _value.options) || disabled.some(Boolean)) {
      _value.options.disabled = disabled;
    }

    return _value;
  }

  view.getSVG = function() {
    // inline global style declarations for SVG export
    var styles = document.styleSheets;
    for (i = 0; i < styles.length; i++) {
      if (!styles[i].cssRules && styles[i].rules) {
        styles[i].cssRules = styles[i].rules;
      }
      // empty style declaration
      if (!styles[i].cssRules)
        continue;

      for (var j = 0; j < styles[i].cssRules.length; j++) {
        var rule = styles[i].cssRules[j];
        // rule.selectorText might not be defined for print media queries.
        if (typeof rule.selectorText !== "undefined") {
          d3.selectAll(rule.selectorText).each(function() {
            for (var k = 0; k < rule.style.length; k++) {
              var curStyle = this.style
                  .getPropertyValue(rule.style[k]);
              var curPrio = this.style
                  .getPropertyPriority(rule.style[k]);
              var rulePrio = rule.style
                  .getPropertyPriority(rule.style[k]);
              // only overwrite style if not set or
              // priority is overruled
              if (!curStyle || (curPrio != "important" && rulePrio === "important")) {
                d3.select(this).style(
                    rule.style[k],
                    rule.style[rule.style[k]]);
              }
            }
          });
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
  };

  return view;

}());
