(boxplot_namespace = function() {
    var input = {};
    var _data = {};
    var layoutContainer;
    var MIN_HEIGHT = 300, MIN_WIDTH = 400;
    var maxY = 0, minY = 0;
    var defaultFont = "sans-serif";
	var defaultFontSize = 12;
    var _representation, _value;
    
    var _switchMissValClassCbx;
    var _missValClass;
    
    var MISSING_VALUES_CLASS = "Missing values";  
    
    var MISSING_VALUES_ONLY = "missingValuesOnly";
    var IGNORED_MISSING_VALUES = "ignoredMissingValues";
	var NO_DATA_AVAILABLE = "noDataAvailable";
    var NO_DATA_COLUMN = "noDataColumn";
	
    input.init = function(representation, value) { 
    	// Store value and representation for later        
        _value = value;
        _representation = representation;
        
        // No numeric columns available?
        if (_representation.options.columns.length == 0) {
            alert("No numeric columns selected");
            return;
        }
     
        // If no column to show is selected yet, we take the first from all candidates
        if (!_value.options.numCol) {
            _value.options.numCol = _representation.options.columns[0];
        }                

        d3.select("html")
        	.style("width", "100%")
        	.style("height", "100%")
        d3.select("body")
        	.style("width", "100%")
        	.style("height", "100%")
        	.style("margin", "0")
        	.style("padding", "0");

        var body = d3.select("body");
        
        // Create container for our content
        layoutContainer = body.append("div")
        					.attr("id", "layoutContainer")
        					.style("min-width", MIN_WIDTH + "px")
        					.style("min-height", MIN_HEIGHT + "px");
        
        // Size layout container based on sizing settings
        if (_representation.options.svg.fullscreen && _representation.runningInView) {
            layoutContainer.style("width", "100%")
            				.style("height", "100%");
        } else {
            layoutContainer.style("width", _representation.options.svg.width + "px")
            				.style("height", _representation.options.svg.height + "px");
        }       
        
        var div = layoutContainer.append("div")
            .attr("id", "svgContainer")
            .style("min-width", MIN_WIDTH + "px")
            .style("min-height", MIN_HEIGHT + "px")
            .style("box-sizing", "border-box")
            .style("display", "block")
            .style("overflow", "hidden")
            .style("margin", "0");
        
        // Add SVG element
        var svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        div[0][0].appendChild(svg1);
        
        var d3svg = d3.select("svg")
        			.style("font-family", "sans-serif");
        // Add rectangle for background color
        d3svg.append("rect")
        		.attr("id", "bgr")
    			.attr("fill", _representation.options.backgroundColor);
        
        // Append a group for the plot and add a rectangle for the data area background
        d3svg.append("g")
				.attr("id", "plotG")
        		.append("rect")
        			.attr("id", "da")
        			.attr("fill", _representation.options.daColor);
        
        // Title
        d3svg.append("text")
            .attr("id", "title")
            .attr("font-size", 24)
            .attr("x", 20)
            .attr("y", 30)
            .text(_value.options.title);

        // Subtitle
        d3svg.append("text")
            .attr("id", "subtitle")
            .attr("font-size", 12)
            .attr("x", 20)
            .text(_value.options.subtitle);
        // y attr is set in drawChart
        
        if (_representation.options.enableViewControls) {
        	drawControls();
        }
        drawChart();
        
        if (parent != undefined && parent.KnimePageLoader != undefined) {
            parent.KnimePageLoader.autoResize(window.frameElement.id);
        }
    }
    
    drawControls = function() {		
		if (!knimeService) {
			// TODO: error handling?
			return;
		}
		
		if (_representation.options.displayFullscreen) {
			knimeService.allowFullscreen();
		}
		
	    if (!_representation.options.enableViewControls) return;
	    	    
    	if (_representation.options.enableTitleEdit || _representation.options.enableSubtitleEdit) {	    
		    if (_representation.options.enableTitleEdit) {
	    		var chartTitleText = knimeService.createMenuTextField('chartTitleText', _value.options.title, updateTitle, true);
	    		knimeService.addMenuItem('Chart Title:', 'header', chartTitleText);
	    	}
	    	
	    	if (_representation.options.enableSubtitleEdit) {
	    		var chartSubtitleText = knimeService.createMenuTextField('chartSubtitleText', _value.options.subtitle, updateSubtitle, true);
	    		var mi = knimeService.addMenuItem('Chart Subtitle:', 'header', chartSubtitleText, null, knimeService.SMALL_ICON);
	    	}
	    	
	    	if (_representation.options.enableColumnSelection) {
	    		knimeService.addMenuDivider();
	    	}   	
    	}
    	
    	if (_representation.options.enableColumnSelection) {
    		var colSelect = knimeService.createMenuSelect('columnSelect', _value.options.numCol, _representation.options.columns, function() {
    			_value.options.numCol = this.value;    			
                drawChart();
    		});
    		knimeService.addMenuItem('Selected column:', 'minus-square fa-rotate-90', colSelect);
    		
    		if (_representation.options.enableSwitchMissValClass) {
	    		knimeService.addMenuDivider();
	    	}  
        }
    	
    	if (_representation.options.enableSwitchMissValClass && _representation.options.reportOnMissingValues) {
    		_switchMissValClassCbx = knimeService.createMenuCheckbox('switchMissValClassCbx', _value.options.includeMissValClass, function() {
	    		if (_value.options.includeMissValClass != this.checked) {
	    			_value.options.includeMissValClass = this.checked;	
	    			drawChart();
	    		}
	    	});
	    	knimeService.addMenuItem("Include 'Missing values' class: ", 'question', _switchMissValClassCbx);
	    }
	};
    
    updateTitle = function() {
    	var hadTitle = (_value.options.title.length > 0);
        _value.options.title = document.getElementById("chartTitleText").value;
        var hasTitle = (_value.options.title.length > 0);        
        if (hasTitle != hadTitle) {
        	// if the title appeared or disappeared, we need to resize the chart
            drawChart(true);
        }
        d3.select("#title").text(_value.options.title);
	};
	
	updateSubtitle = function() {
		var hadTitle = (_value.options.subtitle.length > 0);
        _value.options.subtitle = document.getElementById("chartSubtitleText").value;
        var hasTitle = (_value.options.subtitle.length > 0);
        if (hasTitle != hadTitle) {
        	// if the subtitle appeared or disappeared, we need to resize the chart
            drawChart(true);
        }
        d3.select("#subtitle").text(_value.options.subtitle);
	};

    // Draws the chart. If resizing is true, there are no animations.
    function drawChart(resizing) {
        // Select the data to show
    	_data = _representation.inObjects[0].stats[_value.options.numCol];
    	
        _missValClass = undefined;
        if ((!_value.options.includeMissValClass || !_representation.options.reportOnMissingValues) && _data !== undefined && _data[MISSING_VALUES_CLASS] !== undefined) {
        	_missValClass = _data[MISSING_VALUES_CLASS];
        	delete _data[MISSING_VALUES_CLASS];
        }
    	
        // Find the maximum y-value for the axis
        maxY = Number.NEGATIVE_INFINITY;
        minY = Number.POSITIVE_INFINITY;
        for (var key in _data) {
            maxY = Math.max(_data[key].max, maxY);
            minY = Math.min(_data[key].min, minY);
        }
        
        // Calculate the correct chart width
        var cw = Math.max(MIN_WIDTH, _representation.options.svg.width);
        var ch = Math.max(MIN_HEIGHT, _representation.options.svg.height);
        var chartWidth = cw + "px;"
        var chartHeight = ch + "px";
        
        if (_representation.options.svg.fullscreen && _representation.runningInView) {
        	// If we are fullscreen, we set the chart width to 100%
            chartWidth = "100%";
            chartHeight = "100%";
        }
        
        var div = d3.select("#svgContainer")
            .style("height", chartHeight)
            .style("width", chartWidth);

        // The margins for the plot area
        var topMargin = 10;
        if (_value.options.title && _value.options.subtitle) {
        	topMargin += 50;
        } else if (_value.options.title) {
        	topMargin += 36;
        } else if (_value.options.subtitle) {
        	topMargin += 26;       	
        }    
        
        var margin = {
    		top : topMargin,
    		left : 40,
    		bottom : 40,
    		right : 10
		};
        
        d3.select("#subtitle").attr("y", topMargin - 14);

        var d3svg = d3.select("svg")
        			.attr({width : cw, height : ch})
        			.style({width : chartWidth, height : chartHeight});
        
        // Position the plot group based on the margins
        var plotG = d3svg.select("#plotG")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        // Calculate size of the plot area (without axes)
        var w = Math.max(50, parseInt(d3svg.style('width')) - margin.left - margin.right);
        var h = Math.max(50, parseInt(d3svg.style('height')) - margin.top - margin.bottom);
        
        // Resize background rectangles
        plotG.select("#da").attr({
        	width : w, 
        	height : h + 5
    	});
        d3svg.select("#bgr").attr({
        	width : w + margin.left + margin.right, 
        	height : h + margin.top + margin.bottom
    	});
        
        // Scales for mapping input to screen        
        var x = d3.scale.ordinal().domain(d3.keys(_data)).rangeBands([0,w], 0.75, 0.5);
        var y = d3.scale.linear().domain([minY, maxY]).range([h, 0]).nice();
        // color scale
        var colorScale;
        if (_value.options.applyColors){
        	if (d3.entries(_data).length > 10) {
        		colorScale = d3.scale.category20();
        	} else {
        		colorScale = d3.scale.category10();
        	}
        	if (_representation.inObjects[1] && _representation.inObjects[1].spec.colTypes[0] == "string"){
        		var categories = [];
        		var colors = _representation.inObjects[1].spec.rowColorValues;
        		for (i = 0; i < _representation.inObjects[1].rows.length; i++){
        			categories.push(_representation.inObjects[1].rows[i].data[0]);
        		}
        		categories.push(null);
        		colors.push("#404040");
        		colorScale = d3.scale.ordinal().domain(categories).range(colors);
        	};
        };
        
        // d3 axes
        var xAxis = d3.svg.axis().scale(x)
                .orient("bottom");            
        var yAxis = d3.svg.axis().scale(y)
                .orient("left").ticks(5);
        
        // Remove axes so they are redrawn
        d3.selectAll(".axis").remove();
             
        // Append and style x-axis
        var d3XAxis = plotG.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (h + 5) + ")")
            .call(xAxis);            
        d3XAxis.selectAll("line,path")
        	.attr("fill", "none")
        	.attr("stroke", "black")
        	.attr("shape-rendering", "crispEdges"); 
    
        // Append and style y-axis
        var d3YAxis = plotG.append("g")
            .attr("class", "y axis")
            .call(yAxis);            
        d3YAxis.selectAll("line,path")
       		.attr("fill", "none")
       		.attr("stroke", "black")
       		.attr("shape-rendering", "crispEdges"); 
        
        plotG.selectAll(".axis-label").remove();

        plotG.append("text")
            .attr("class", "y axis-label")
            .attr("text-anchor", "end")
            .attr("y", 6)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text(_value.options.numCol);
            
        plotG.append("text")
	        .attr("class", "x axis-label")
	        .attr("text-anchor", "end")
	        .attr("x", w)
	        .attr("y", h - 6)
	        .text(_representation.inObjects[0].catCol);

        var range = x.range();  // The width for each box
        
        // Animate only when running in view and not resizing
        var duration = (_representation.runningInView && !resizing) ? 500 : 0;
        
        // Create a selection for each box with data that we created at the beginning
        var boxG = plotG.selectAll("g.box")
	        .data(d3.entries(_data), function(d) {
	            return d.key;
	        });
        
        // Remove boxes that are not in the data anymore
        boxG.exit().remove();

    	// Append a group element for each new box and shift it according to the class
        var box = boxG.enter().append("g")
            .attr("class", "box")
            .attr("transform", function(d) { return "translate(" + x(d.key) + ",0)"; });
        
        // Transition all boxes to their position
        d3.selectAll(".box").transition().duration(duration)
            .attr("transform", function(d) { return "translate(" + x(d.key) + ",0)"; });
            
        // The main rectangle for the box
        box.append("rect")
            .attr("class", "boxrect")
            .attr("stroke", "black")
            //.attr("fill", _representation.options.boxColor || "none");
        	.attr("fill", function(d){
        		if (_value.options.applyColors){
        			return colorScale(d.key);
        		} else {
        			return _representation.options.boxColor || "none";
        		}
        	});
       
        // Update the box according to the data
        boxG.selectAll(".boxrect")
                .data(function(d) { return [d]; } )
                .transition().duration(duration)
                .attr("y", function(d) { return y(d.value.upperQuartile); })
                .attr("height", function(d) { return y(d.value.lowerQuartile) - y(d.value.upperQuartile); })
                .attr("width", x.rangeBand());
        
        // The middle of the box on the x-axis
        var middle = x.rangeBand() / 2;
        
        // Text for the upper quartile
        box.append("text")
            .attr("x", -5)
            .attr("text-anchor", "end")
            .attr("class", "uqText");            
        boxG.selectAll(".uqText")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("y", function(d) { return y(d.value.upperQuartile) + 3; })
            .text(function(d) { return Math.round(d.value.upperQuartile * 100) / 100; });
            
        // Text for the lower quartile
        box.append("text")
            .attr("x", -5)
            .attr("text-anchor", "end")
            .attr("class", "lqText");            
       boxG.selectAll(".lqText")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("y", function(d) { return y(d.value.lowerQuartile) + 3; })
            .text(function(d) { return Math.round(d.value.lowerQuartile * 100) / 100; });
        
        // Median
        box.append("line")
            .attr("stroke", "black")
            .attr("stroke-width", 3)
            .attr("x1", "0")
            .attr("class", "median");
            
        boxG.selectAll(".median")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x2", x.rangeBand())
            .attr("y1", function(d) { return y(d.value.median); })
            .attr("y2", function(d) { return y(d.value.median); });
        
        box.append("text")
            .attr("class", "medianText");
            
        boxG.selectAll(".medianText")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x", x.rangeBand() + 5)
            .attr("y", function(d) { return y(d.value.median) + 3; })
            .text(function(d) { return Math.round(d.value.median * 100) / 100; });
        
        // Upper whisker       
        box.append("line")
            .attr("stroke", "black")
            .attr("class", "uwL1");
            
        boxG.selectAll(".uwL1")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x1", middle)
            .attr("x2", middle)
            .attr("stroke-dasharray", "5,5")
            .attr("y1", function(d) { return y(d.value.upperQuartile); })
            .attr("y2", function(d) { return y(d.value.upperWhisker); });
     

        box.append("line")
            .attr("stroke", "black")
            .attr("x1", "0")
            .attr("class", "uwL2");
            
        boxG.selectAll(".uwL2")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x2", x.rangeBand())
            .attr("y1", function(d) { return y(d.value.upperWhisker); })
            .attr("y2", function(d) { return y(d.value.upperWhisker); });

        box.append("text")
            .attr("class", "uwText");
            
        boxG.selectAll(".uwText")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x", x.rangeBand() + 5)
            .attr("y", function(d) { return y(d.value.upperWhisker) + 10; })
            .text(function(d) { return Math.round(d.value.upperWhisker * 100) / 100; });

        // Lower whisker
        box.append("line")
            .attr("stroke", "black")
            .attr("class", "ulL1");
            
       boxG.selectAll(".ulL1")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x1", middle)
            .attr("x2", middle)
            .attr("stroke-dasharray", "5,5")
            .attr("y1", function(d) { return y(d.value.lowerQuartile); })
            .attr("y2", function(d) { return y(d.value.lowerWhisker); });
            
       box.append("line")
            .attr("stroke", "black")
            .attr("x1", "0")
            .attr("class", "ulL2");
            
       boxG.selectAll(".ulL2")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x2", x.rangeBand())
            .attr("y1", function(d) { return y(d.value.lowerWhisker); })
            .attr("y2", function(d) { return y(d.value.lowerWhisker); });
            
       box.append("text")
            .attr("class", "ulText");
            
       boxG.selectAll(".ulText")
            .data(function(d) { return [d]; } )
            .transition().duration(duration)
            .attr("x", x.rangeBand() + 5)
            .attr("y", function(d) { return y(d.value.lowerWhisker) - 3; })
            .text(function(d) { return Math.round(d.value.lowerWhisker * 100) / 100; });

       // Mild outlier
       
       var outl = boxG.selectAll("circle.mo")
                 .data(function(d) { return d.value.mildOutliers; } );    
       
       outl.enter().append("circle")
        .attr("class", "mo")
        .attr("r", 5)
        .attr("fill", _representation.options.daColor)
        .attr("stroke", "black")
        .attr("cx", middle)
        .attr("cy", function(d) { return y(d.value); })
        .append("title").text(function(d) { return d.rowKey; });
       
       outl.transition().duration(duration)
	       .attr("cx", middle)
	       .attr("cy", function(d) { return y(d.value); });
       
       outl.exit().transition().style("opacity", 0).each("end", function() { d3.select(this).remove(); });
       
       // Extreme outlier
       
       var exoutl = boxG.selectAll("g.eo")
                 .data(function(d) { return d.value.extremeOutliers; } );    
       
       var enterG = exoutl.enter().append("g")
         .attr("class", "eo")
         .attr("transform", function(d) { return "translate(" + middle + "," + y(d.value) + ")"; });
         
         var crossSize = 4;
         enterG.append("line").attr({x1 : -crossSize, y1 : -crossSize, x2 : crossSize, y2 : crossSize, "stroke-width" : 1.5, "stroke-linecap" : "round"})
        .append("title").text(function(d) { return d.rowKey; });
         enterG.append("line").attr({x1 : -crossSize, y1 : crossSize, x2 : crossSize, y2 : -crossSize, "stroke-width" : 1.5, "stroke-linecap" : "round"})
        .append("title").text(function(d) { return d.rowKey; });
       
       exoutl.transition().duration(duration)
       .attr("transform", function(d) { return "translate(" + middle + "," + y(d.value) + ")"; });
       
       // Fade out outliers
       exoutl.exit().transition().style("opacity", 0).each("end", function() { d3.select(this).remove(); });
       
       processMissingValues();
       
       if ((!_value.options.includeMissValClass || !_representation.options.reportOnMissingValues) && _missValClass !== undefined) {
     	   _data[MISSING_VALUES_CLASS] = _missValClass;       	
       }       

       // Set resize handler
       if (_representation.options.svg.fullscreen) {
    	   var win = document.defaultView || document.parentWindow;
    	   win.onresize = resize;
       }  
    }
    
    processMissingValues = function() {
    	if (!_representation.options.showWarnings) {
        	return;
        }
    	
    	knimeService.clearWarningMessage(NO_DATA_AVAILABLE);
    	knimeService.clearWarningMessage(MISSING_VALUES_ONLY);
    	knimeService.clearWarningMessage(IGNORED_MISSING_VALUES);
    	knimeService.clearWarningMessage(NO_DATA_COLUMN);
    	
    	// temporary workaround for being able to select a data column which was not included in the node settings
    	if (_data === undefined) {
    		knimeService.setWarningMessage("No chart was generated since the Selected Column was not included in the node configuration dialog. Please choose another column or add the Selected Column to the list of included columns.", NO_DATA_COLUMN);
    		return;
    	}
    	
    	var excludedClasses = _representation.inObjects[0].excludedClasses[_value.options.numCol];
    	var ignoredMissVals = _representation.inObjects[0].ignoredMissVals[_value.options.numCol];
   	
    	if (_switchMissValClassCbx !== undefined) {
    		if (_missValClass === undefined && _data[MISSING_VALUES_CLASS] === undefined && excludedClasses.indexOf(MISSING_VALUES_CLASS) == -1 && ignoredMissVals[MISSING_VALUES_CLASS] === undefined) {
	    		// there's no missing values in class column - disable the control
	    		_switchMissValClassCbx.disabled = true;
	    		_switchMissValClassCbx.checked = false;
	    	} else {
	    		// restore the state
	    		_switchMissValClassCbx.disabled = false;
	    		_switchMissValClassCbx.checked = _value.options.includeMissValClass;
	    	}
    	}
    		
    	// if option "Include 'Missing values'" is off, we don't show a warning about them
    	if (!_value.options.includeMissValClass || !_representation.options.reportOnMissingValues) {			
			excludedClasses = excludedClasses.filter(function(x) {
				return x != MISSING_VALUES_CLASS;
			});
			
			var missValClass = undefined;
	        if ((!_value.options.includeMissValClass || !_representation.options.reportOnMissingValues) && ignoredMissVals[MISSING_VALUES_CLASS] !== undefined) {
	        	missValClass = ignoredMissVals[MISSING_VALUES_CLASS];
	        	delete ignoredMissVals[MISSING_VALUES_CLASS];
	        }
		}
    	
    	if (Object.keys(_data).length == 0) {
    		if (_missValClass !== undefined && _representation.options.reportOnMissingValues) {
    			knimeService.setWarningMessage("No chart was generated since all classes have only missing values.\nThere are values where the class name is missing.\nTo see them switch on the option \"Include 'Missing values' class\" in the view settings.", NO_DATA_AVAILABLE);    			
    		} else {    			
    			knimeService.setWarningMessage("No chart was generated since all classes have only missing values.\nChoose another data column or re-run the workflow with different data.", NO_DATA_AVAILABLE);
    		}
    	} else if (_representation.options.reportOnMissingValues) {
    		if (excludedClasses.length > 0) {    			
    			knimeService.setWarningMessage("Following classes contain only missing values and were excluded from the view:\n    " + excludedClasses.join("\n    "), MISSING_VALUES_ONLY);
    		}
    		if (Object.keys(ignoredMissVals).length > 0) {
    			var str = '';
    			for (var key in ignoredMissVals){
    			    if (ignoredMissVals.hasOwnProperty(key) && (_value.options.includeMissValClass || key != MISSING_VALUES_CLASS)) {  // if option "Include 'Missing values'" is off, we don't show a warning about them
    			        str += "    " + key + " - " + ignoredMissVals[key] + " missing value(s)\n";
    			    }
    			}
    			knimeService.setWarningMessage("Missing values ignored during statistics calculations per class:\n" + str, IGNORED_MISSING_VALUES);    			
    		}
    	}
    	
    	if ((!_value.options.includeMissValClass || !_representation.options.reportOnMissingValues) && missValClass !== undefined) {
    		ignoredMissVals[MISSING_VALUES_CLASS] = missValClass;       	
         }
    }
    
    input.getSVG = function() {
        var svg = d3.select("svg")[0][0];
        return (new XMLSerializer()).serializeToString(svg);
    };
    
    function resize(event) {
        drawChart(true);
    };
    

    input.validate = function() {
        return true;
    }

    input.getComponentValue = function() {
        return _value;
    }

    return input;

}());
