knime_roc_curve = function() {
	
	view = {};
	var _representation = null;
	var _value = null;
	var containerID = "lineContainer";
	var layoutContainerID = "layoutContainer";
	var minWidth = 400;
	var minHeight = 300;
	var defaultFont = "sans-serif";
	var defaultFontSize = 12;
	var xy = {};
	var legendHeight = 0;
	
	view.init = function(representation, value) {
		_value = value;
		_representation = representation;
		
		d3.select("html").style("width", "100%").style("height", "100%")/*.style("overflow", "hidden")*/;
        d3.select("body").style("width", "100%").style("height", "100%").style("margin", "0").style("padding", "0");

        var body = d3.select("body").attr("id", "body");
        
        var layoutContainer = body.append("div")
        	.attr("id", layoutContainerID)
            .style("width", "100%")
            .style("height", "100%")
            .style("min-width", minWidth + "px")
            .style("min-height", minHeight + "px");
        
        // Setting up warning messages from the Java side, if any
		if (representation.showWarningInView && representation.warnings !== null) {
			var map = representation.warnings.warningMap;
			for (var id in map) {
		        if (map.hasOwnProperty(id)) {
		        	knimeService.setWarningMessage(map[id], id);			           
		        }
		    }
		}
        
        //var colors = ["red", "green", "blue", "yellow", "brown", "lime", "orange"];
        var catCol = d3.scale.category10();
        if (_representation.curves.length > 10) {
            catCol = d3.scale.category20();
        }
        // Build data set for the graph
        for (var i = 0; i < _representation.curves.length; i++) {
            var curve = _representation.curves[i];

            var color;
            if (_representation.colors && _representation.colors.length == _representation.curves.length) {
                var c = parseColor(_representation.colors[i]);
                color = c.rgb;
            } else {
                color = catCol(i, i);//colors[i % colors.length];
            }
            
            xy[curve.name] = {data : [], color : color, area : curve.area};
            
            for (var j = 0; j < curve.x.length; j++) {
                xy[curve.name].data.push({x : curve.x[j], y : curve.y[j]});
            }
        }
        xy.random = {data : [{x : 0, y : 0}, {x : 1, y : 1}], color : "black"};
        
        if (_representation.enableControls) {
        	drawControls();
        }
        drawChart();
        
        
        if (parent != undefined && parent.KnimePageLoader != undefined) {
            parent.KnimePageLoader.autoResize(window.frameElement.id);
        }
	};
	
	drawControls = function() {		
		if (!knimeService) {
			// TODO: error handling?
			return;
		}
		
		if (_representation.displayFullscreenButton) {
			knimeService.allowFullscreen();
		}		    
	    
	    if (!_representation.enableControls) return;
	    
	    if (_representation.enableEditTitle || _representation.enableEditSubtitle) {
	    	if (_representation.enableEditTitle) {
	    		var chartTitleText = knimeService.createMenuTextField('chartTitleText', _value.title, updateTitle, true);
	    		knimeService.addMenuItem('Chart Title:', 'header', chartTitleText);
	    	}
	    	if (_representation.enableEditSubtitle) {
	    		var chartSubtitleText = knimeService.createMenuTextField('chartSubtitleText', _value.subtitle, updateSubtitle, true);
	    		var mi = knimeService.addMenuItem('Chart Subtitle:', 'header', chartSubtitleText, null, knimeService.SMALL_ICON);
	    	}
	    	if (_representation.enableEditXAxisLabel || _representation.enableEditYAxisLabel) {
	    		knimeService.addMenuDivider();
	    	}
	    }	    
	    
	    if (_representation.enableEditXAxisLabel || _representation.enableEditYAxisLabel) {
	    	if (_representation.enableEditXAxisLabel) {
	    		var xAxisText = knimeService.createMenuTextField('xAxisText', _value.xAxisTitle, updateXAxisTitle, true);
	    		knimeService.addMenuItem('X Axis Label:', 'ellipsis-h', xAxisText);
	    	}
	    	if (_representation.enableEditYAxisLabel) {
	    		var yAxisText = knimeService.createMenuTextField('yAxisText', _value.yAxisTitle, updateYAxisTitle, true);
	    		knimeService.addMenuItem('Y Axis Label:', 'ellipsis-v', yAxisText);
	    	}
	    }
	};
	
	/*function createControls(controlsContainer) {
	    var titleDiv;
        
        if (_representation.enableEditTitle || _representation.enableEditSubtitle) {
            titleDiv = controlsContainer.append("div").style({"margin-top" : "5px"});
        }
        
        if (_representation.enableEditTitle) {
            titleDiv.append("label").attr("for", "titleIn").text("Title:").style({"display" : "inline-block", "width" : "100px"});
            titleDiv.append("input")
            .attr({id : "titleIn", type : "text", value : _value.title}).style("width", 150)
            .on("keyup", function() {
                var hadTitles = (_value.title.length > 0) || (_value.subtitle.length > 0);
                _value.title = this.value;
                var hasTitles = (_value.title.length > 0) || (_value.subtitle.length > 0);
                d3.select("#title").text(this.value);
                if (hadTitles != hasTitles) {
                    drawChart();
                }
            });
        }
        
        if (_representation.enableEditSubtitle) {
            titleDiv.append("label").attr("for", "subtitleIn").text("Subtitle:").style({"margin-left" : "10px", "display" : "inline-block", "width" : "100px"});
            titleDiv.append("input")
            .attr({id : "subtitleIn", type : "text", value : _value.subtitle}).style("width", 150)
            .on("keyup", function() {
                var hadTitles = (_value.title.length > 0) || (_value.subtitle.length > 0);
                _value.subtitle = this.value;
                var hasTitles = (_value.title.length > 0) || (_value.subtitle.length > 0);
                d3.select("#subtitle").text(this.value);
                if (hadTitles != hasTitles) {
                    drawChart();
                }
            });
        }
        
        var axisTitleDiv;
        if (_representation.enableEditYAxisLabel || _representation.enableEditXAxisLabel) {
            axisTitleDiv = controlsContainer.append("div").style({"margin-top" : "5px"});
        }
        
        if (_representation.enableEditXAxisLabel) {
            axisTitleDiv.append("label").attr("for", "xTitleIn").text("X-axis title:").style({"display" : "inline-block", "width" : "100px"});
            axisTitleDiv.append("input")
            .attr({id : "xTitleIn", type : "text", value : _value.xAxisTitle}).style("width", 150)
            .on("keyup", function() {
                _value.xAxisTitle = this.value;
                d3.select("#xtitle").text(this.value);
            });
        }
        
        if (_representation.enableEditYAxisLabel) {
            axisTitleDiv.append("label").attr("for", "yTitleIn").text("Y-axis title:").style({"margin-left" : "10px", "display" : "inline-block", "width" : "100px"});
            axisTitleDiv.append("input")
            .attr({id : "yTitleIn", type : "text", value : _value.yAxisTitle}).style("width", 150)
            .on("keyup", function() {
                _value.yAxisTitle = this.value;
                d3.select("#ytitle").text(this.value);
            });
        }
	}*/
	
	updateTitle = function() {
    	var hadTitle = (_value.title.length > 0);
        _value.title = document.getElementById("chartTitleText").value;
        var hasTitle = (_value.title.length > 0);        
        if (hasTitle != hadTitle) {
        	// if the title appeared or disappeared, we need to resize the chart
            drawChart();            
        }
        d3.select("#title").text(_value.title);
	};
	
	updateSubtitle = function() {
		var hadTitle = (_value.subtitle.length > 0);
        _value.subtitle = document.getElementById("chartSubtitleText").value;
        var hasTitle = (_value.subtitle.length > 0);
        if (hasTitle != hadTitle) {
        	// if the subtitle appeared or disappeared, we need to resize the chart
            drawChart();
        }
        d3.select("#subtitle").text(_value.subtitle);
	};
	
	updateXAxisTitle = function() {
		var hadTitle = (_value.xAxisTitle.length > 0);
        _value.xAxisTitle = document.getElementById("xAxisText").value;
        var hasTitle = (_value.xAxisTitle.length > 0);        
        if (hasTitle != hadTitle) {
        	// if the title appeared or disappeared, we need to resize the chart
            drawChart();
        }
        d3.select("#xtitle").text(_value.xAxisTitle);
	};
	
	updateYAxisTitle = function() {
		var hadTitle = (_value.yAxisTitle.length > 0);
        _value.yAxisTitle = document.getElementById("yAxisText").value;
        var hasTitle = (_value.yAxisTitle.length > 0);        
        if (hasTitle != hadTitle) {
        	// if the title appeared or disappeared, we need to resize the chart
            drawChart();
        }
        d3.select("#ytitle").text(_value.yAxisTitle);
	};
	
	function drawChart() {
		// Calculate margin of the chart
        var mTop = 10;
        var isTitle = true;        
        if (_value.title && _value.subtitle) {
        	mTop += 50;        	
        } else if (_value.title) {
        	mTop += 36;
        } else if (_value.subtitle) {
        	mTop += 26;      	
        } else {
        	isTitle = false;        	        	
        }
        knimeService.floatingHeader(isTitle);        
        var mBottom = 0;
        if (legendHeight > 0) {
        	if (_value.xAxisTitle) {
        		mBottom = legendHeight + 10;
        	} else {
        		mBottom = legendHeight - 10;
        	}
        } else {
        	if (_value.xAxisTitle) {
        		mBottom = 60;
        	} else {
        		mBottom = 34;
        	}
        }
        var margin = {
    		top : mTop,
    		left : (_value.yAxisTitle) ? 70 : 40,
    		bottom : mBottom,
    		right : 20
		};
        
        var cw = Math.max(minWidth, _representation.imageWidth);
	    var ch = Math.max(minHeight, _representation.imageHeight);
	    var chartWidth = cw + "px;"
        var chartHeight = ch + "px";

        if (_representation.resizeToWindow) {
            chartWidth = "100%";
            chartHeight = (isTitle) ? "100%" : "calc(100% - " + knimeService.headerHeight() + "px)";            
        }        
        
        var lc = d3.select("#"+layoutContainerID)
        	.style("height", chartHeight)
        	// two rows below force to invalidate the container which solves a weird problem with vertical scroll bar in IE  
        	.style('display', 'none')
        	.style('display', 'block');
        
        // Clear the container
        lc.selectAll("*").remove();
        
        // The container for the chart
        var div = lc.append("div")
            .attr("id", containerID)
            .style("min-width", minWidth + "px")
            .style("min-height", minHeight + "px")
            .style("box-sizing", "border-box")
            .style("display", "block")
            .style("overflow", "hidden")
            .style("margin", "0")
            .style("height", chartHeight)
            .style("width", chartWidth);        
        
        var svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        document.getElementById(containerID).appendChild(svg1);
        
        var d3svg = d3.select(svg1).style("font-family", "sans-serif");

        var svg = d3svg.attr({width : cw, height : ch}).style({width : chartWidth, height : chartHeight})
            .append("g").attr("transform", 
              "translate(" + margin.left + "," + margin.top + ")");

        var w = Math.max(50, parseInt(d3svg.style('width')) - margin.left - margin.right);
        var h = Math.max(50, parseInt(d3svg.style('height')) - margin.top - margin.bottom);
        
        // Convert colors from rgba to rgb + opacity
        var bg = parseColor(_representation.backgroundColor);
        var areaColor = parseColor(_representation.dataAreaColor);

        // Draw backgrounds
        svg.append("rect").attr({fill : bg.rgb, "fill-opacity" : bg.opacity, width : margin.left + w + margin.right,
                                    height : margin.top + margin.bottom + h, x : -margin.left, y : -margin.top});
        svg.append("rect").attr({fill : areaColor.rgb, "fill-opacity" : areaColor.opacity, width : w, height : h});
        
        // Draw titles
        var titleG = d3svg.append("g").attr("transform", "translate(" + margin.left + ",0)");
        if (_value.title) {
        	titleG.append("text")
	        	.text(_value.title)
	        	.attr("id", "title")
	        	.attr("y", 30)
	        	.attr("font-size", 24);
        }
        if (_value.subtitle) {
        	titleG.append("text")        
	        	.text(_value.subtitle)
	        	.attr("id", "subtitle")
	        	.attr("y", mTop - 14);
        }
                
        var x = d3.scale.linear().range([0, w]);
        var y = d3.scale.linear().range([h, 0]);

        var xAxis, yAxis;

        // Define the axes
        if (!_representation.showGrid) {
            xAxis = d3.svg.axis().scale(x)
                .orient("bottom").ticks(5);
            
            yAxis = d3.svg.axis().scale(y)
                .orient("left").ticks(5);
        } else {

            xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickSize(-h, 0)
                .tickPadding(10);
        
            yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickSize(-w, 0)
                .tickPadding(10);
        }
        
        var valueline = d3.svg.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });
        
        // Add the X Axis
        var d3XAxis = svg.append("g");
            d3XAxis.attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(xAxis);
    
        // Add the Y Axis
        var d3YAxis = svg.append("g");
            d3YAxis.attr("class", "y axis")
            .call(yAxis);
        
        // Axis titles
        if (_value.xAxisTitle) {
	        svg.append("text")
	            .attr("class", "x label")
	            .attr("text-anchor", "end")
	            .attr("x", w - 10)
	            .attr("y", h + 45)
	            .attr("id", "xtitle")
	            .text(_value.xAxisTitle);
        }
        if (_value.yAxisTitle) {
	        svg.append("text")
	            .attr("class", "y label")
	            .attr("text-anchor", "end")
	            .attr("y", -55)
	            .attr("dy", ".75em")
	            .attr("transform", "rotate(-90)")
	            .attr("id", "ytitle")
	            .text(_value.yAxisTitle);
        }
            
        var gridColor = parseColor(_representation.gridColor);
        
        var stroke = _representation.showGrid ? gridColor.rgb : "#000";

        d3YAxis.selectAll("line").attr("stroke", stroke);
        d3XAxis.selectAll("line").attr("stroke", stroke);
        d3YAxis.selectAll("path").attr({"stroke" : stroke, "stroke-width" : 1, "fill" : "none"});
        d3XAxis.selectAll("path").attr({"stroke" : stroke, "stroke-width" : 1, "fill" : "none"});
        
        var xPos = 0;
        var yPos = (_value.xAxisTitle) ? 70 : 50;
        var areaG = svg.append("g");
        var areaCount = 0;
        var maxWidth = 0;
        
        // Add the valueline path.
        for (var key in xy) {
            var p = svg.append("path")
            .attr("class", "line")
            .style({stroke : xy[key].color, fill : "none", "stroke-width" : _representation.lineWidth})
            .attr("d", valueline(xy[key].data));
            
            if (_representation.showLegend) { 
                var g = svg.append("g").attr("transform", "translate(" + xPos + "," + (h + yPos) + ")");
                var l = g.append("text").attr({x : 20}).text(key);
                g.append("circle").attr({"r" : 5, "fill" : xy[key].color, cx : 5, cy : -5});
                xPos += parseInt(l.node().getBoundingClientRect().width) + 20;
                
                if (xPos > w) {
                    yPos += 25;
                    xPos = 0;
                    g.attr("transform", "translate(" + xPos + "," + (h + yPos) + ")");
                    
                    xPos += parseInt(l.node().getBoundingClientRect().width) + 30;
                } else {
                    xPos += 10;
                }
            }
            
            if (key !== "random" && _representation.showArea) {
                var area = areaG.append("text")
                    .attr("y", areaCount++ * 25)
                    .attr("x", 0)
                    .attr("fill", xy[key].color)
                    .text(key + " (" + Math.round(parseFloat(xy[key].area) * 1000) / 1000 + ")");
                var width = parseInt(area.node().getBoundingClientRect().width);
                if (width > maxWidth) {
                    maxWidth = width;
                }
            }
        }
        
        areaG.attr("transform", "translate(" + (w - maxWidth - 10) + "," + (h - areaCount * 25) + ")");
        
        // Now we have the correct legend height and redraw the chart with the correct size
        if (legendHeight == 0 && _representation.showLegend) {
            legendHeight = Math.max(yPos, 75);
            drawChart();
        }
             
        if (_representation.resizeToWindow) {
            var win = document.defaultView || document.parentWindow;
            win.onresize = resize;
        }
	}
	
	function parseColor(col) {
	   var COLOR_REGEX = /rgba\(([0-9]{1,3}),([0-9]{1,3}),([0-9]{1,3}),([0-9]\.[0-9])\)/g;
	   var match = COLOR_REGEX.exec(col), rgb, opacity;
	   if (match) {
	       rgb = "rgb(" + match[1] + "," + match[2] + "," + match[3] + ")";
	       opacity = match[4];
	   } else {
	       rgb = col;
	       opacity = "1.0";
	   }
	   return {rgb : rgb, opacity : opacity};
	}
	
	function resize(event) {
	   legendHeight = 0;
        drawChart();
    };

	view.getSVG = function() {
		var svg = d3.select("svg")[0][0];
		return (new XMLSerializer()).serializeToString(svg);
	};
	
	view.validate = function() {
        return true;
    };
	
	view.getComponentValue = function() {
		return _value;
	};

	return view;
}();