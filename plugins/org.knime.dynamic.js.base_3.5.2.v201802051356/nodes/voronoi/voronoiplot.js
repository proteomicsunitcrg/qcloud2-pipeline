(voronoiplot_namespace = function() {
    var input = {};
    var _data;
    var layoutContainer;
    var MIN_HEIGHT = 300, MIN_WIDTH = 400;
    var maxY = 0, minY;
    var _hasBottomView = false;
    var _representation, _value;
    var _maxZ = 0;
    var _possibleValues = null;
    
    input.init = function(representation, value) {  
        _value = value;
        _representation = representation;

        d3.select("html").style("width", "100%").style("height", "100%")
        d3.select("body").style("width", "100%").style("height", "100%").style("margin", "0").style("padding", "0");

        var body = d3.select("body");
        
        if (!representation.options.xCol || !representation.options.yCol) {
        	body.html("Node is not configured.");
        	return;
        }
        
        _data = createData(representation);
        
        layoutContainer = body.append("div").attr("id", "layoutContainer")
                .style("min-width", MIN_WIDTH + "px");
        
        if (_representation.options.svg.fullscreen && _representation.runningInView) {
            layoutContainer.style("width", "100%")
            .style("height", "100%");
        } else {
            layoutContainer.style("width", _representation.options.svg.width + "px")
            .style("height", _representation.options.svg.height + "px");
        }
        
        var controlHeight;
        if (_representation.options.enableViewControls && _representation.runningInView) {
             var controlsContainer = body.append("div").style({
            	 position : "relative", 
            	 bottom : "0px",
                 width : "100%", 
                 padding : "5px", 
                 "padding-left" : "60px",
                 "border-top" : "1px solid black", 
                 "background-color" : "white",
                 "box-sizing": "border-box"}).attr("id", "controlContainer");

            createControls(controlsContainer);
            controlHeight = controlsContainer.node().getBoundingClientRect().height;
        } else {
            controlHeight = 0;
        }

        if (_representation.options.svg.fullscreen && _representation.runningInView) {
            layoutContainer.style({
                "height" : "calc(100% - " + controlHeight + "px)",
                "min-height" :  (MIN_HEIGHT + controlHeight) + "px"
            });
        }
        
        var div = layoutContainer.append("div")
            .attr("id", "svgContainer")
            .style("min-width", MIN_WIDTH + "px")
            .style("min-height", MIN_HEIGHT + "px")
            .style("box-sizing", "border-box")
            .style("display", "inline-block")
            .style("overflow", "hidden")
            .style("margin", "0");
        
        var svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        div[0][0].appendChild(svg1);
        
        var d3svg = d3.select("svg").style("font-family", "sans-serif");
        d3svg.append("rect").attr("id", "bgr").attr("fill", _representation.options.backgroundColor);
        
        var plotG = d3svg.append("g").attr("id", "plotG");
        plotG.append("g").attr("id", "cells");
        
        d3svg.append("text")
            .attr("id", "title")
            .attr("font-size", 24)
            .attr("x", 20)
            .attr("y", 30)
            .text(_value.options.title);

        d3svg.append("text")
            .attr("id", "subtitle")
            .attr("font-size", 12)
            .attr("x", 20)
            .attr("y", 46)
            .text(_value.options.subtitle);

        drawChart();
    }
    
    function createData(representation) {
    	var table = representation.inObjects[0];
    	
    	var xIdx = getDataColumnID(representation.options.xCol, table);
    	var yIdx = getDataColumnID(representation.options.yCol, table);
    	var colorIdx = _representation.options.coloring === "Column" ?
    			getDataColumnID(representation.options.colorCol, table) : null;

    	return createXYFromTable(table, xIdx, yIdx, colorIdx);
    }
    
    function createXYFromTable(table, xIdx, yIdx, colorIdx) {
    	var d = [];
    	var set = d3.set();
    	var isCategorical = colorIdx && typeof table.rows[0].data[colorIdx] !== "number";
    	
    	for (var r = 0; r < table.rows.length; r++) {
    		var o = [table.rows[r].data[xIdx] + (Math.random() -0.5) * 0.0001, table.rows[r].data[yIdx] + (Math.random() -0.5) * 0.0001];
    		if (_representation.options.coloring === "Table\xa0Spec") {
    			o.push(table.spec.rowColorValues[r]);
    		} else if (colorIdx) {
    			var col = table.rows[r].data[colorIdx];
    			o.push(col);
    			if (isCategorical) {
    				set.add(col);
    			}
    		}
    		d.push(o);
    	}
    	if (isCategorical) {
    		_possibleValues = set.values();
    	}
    	return d;
    }
    
    function getDataColumnID(columnName, table) {
		var colID = null;
		for (var i = 0; i < table.spec.numColumns; i++) {
			if (table.spec.colNames[i] === columnName) {
				colID = i;
				break;
			};
		};
		return colID;
	};
    
    function createControls(controlsContainer) {
        if (_representation.options.enableViewControls) {
       
            var titleDiv;
        
            if (_representation.options.enableTitleEdit || _representation.options.enableSubtitleEdit) {
                titleDiv = controlsContainer.append("div").style({"margin-top" : "5px"});
            }
            
            if (_representation.options.enableTitleEdit) {
                titleDiv.append("label").attr("for", "titleIn").text("Title:").style({"display" : "inline-block", "width" : "100px"});
                titleDiv.append("input")
                .attr({id : "titleIn", type : "text", value : _value.options.title}).style("width", 150)
                .on("keyup", function() {
                    var hadTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
                    _value.options.title = this.value;
                    var hasTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
                    d3.select("#title").text(this.value);
                    if (hasTitles != hadTitles) {
                        drawChart(true);
                    }
                });
            }
        
            if (_representation.options.enableSubtitleEdit) {
                titleDiv.append("label").attr("for", "subtitleIn").text("Subtitle:").style({"margin-left" : "10px", "display" : "inline-block", "width" : "100px"});
                titleDiv.append("input")
                .attr({id : "subtitleIn", type : "text", value : _value.options.subtitle}).style("width", 150)
                .on("keyup", function() {
                    var hadTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
                    _value.options.subtitle = this.value;
                    var hasTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
                    d3.select("#subtitle").text(this.value);
                    if (hasTitles != hadTitles) {
                        drawChart(true);
                    }
                });
            }
        }
    }

    function drawChart() {
                 
        var cw = Math.max(MIN_WIDTH, _representation.options.svg.width);
        var ch = Math.max(MIN_HEIGHT, _representation.options.svg.height);
        var chartWidth = cw + "px;"
        var chartHeight = ch + "px";
        
        if (_representation.options.svg.fullscreen && _representation.runningInView) {
            chartWidth = "100%";
            chartHeight = "100%";
        }
        
        var div = d3.select("#svgContainer")
            .style("height", chartHeight)
            .style("width", chartWidth);
        
        var d3svg = d3.select("svg").attr({width : cw, height : ch}).style({width : chartWidth, height : chartHeight});
        
        var mTop = (_value.options.subtitle || _value.options.title) ? 60 : 10;

        var margin = {top : mTop, left : 40, bottom : 50, right : 10};
        
        var plotG = d3svg.select("#plotG")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        var w = Math.max(50, parseInt(d3svg.style('width')) - margin.left - margin.right);
        var h = Math.max(50, parseInt(d3svg.style('height')) - margin.top - margin.bottom);

        d3svg.select("#bgr").attr({width : w + margin.left + margin.right, height : h + margin.top + margin.bottom});

        var width = w, height = h;
	    
	    var xScale = d3.scale.linear().domain(d3.extent(_data, function(d) { return d[0]; })).range([0, w]);
	    var yScale = d3.scale.linear().domain(d3.extent(_data, function(d) { return d[1]; })).range([h, 0]);
	    
	    var xAxis = d3.svg.axis()
        	.scale(xScale.nice())
        	.orient("bottom");

	    var yAxis = d3.svg.axis()
	        .scale(yScale.nice())
	        .orient("left");

	    var color;
	    if (_representation.options.coloring === "Random") {
		    color = d3.scale.category20().domain([0, 19]);
	    } else if (_representation.options.coloring === "Column") {
	    	if (_possibleValues) {
	    		color = d3.scale.category20().domain(_possibleValues);
	    	} else {
	    		color = d3.scale.linear()
	    	    .domain(d3.extent(_data, function(d) { return d[2]; }))
	    	    .range([_representation.options.minColor || "white", _representation.options.maxColor || "steelblue"])
	    	    .interpolate(d3.interpolateLab);
	    	}
	    } else {
	    	color = function(d) { return _representation.options.daColor; };
	    }
	    
	    var vertices = _data.map(function(d) { return [xScale(d[0]), yScale(d[1])]; });
	    
	    var voronoi = d3.geom.voronoi()
	    .clipExtent([[0, 0], [width, height]]);
		
	    var cells = plotG.select("#cells");
	    cells.selectAll("path.cell").remove();
	    
		var path = cells.selectAll("path");
		path = path.data(voronoi(vertices), polygon);
		path.enter().append("path")
			.attr("class", "cell")
		    .attr("d", polygon)
		    .attr("stroke", "black")
		    .attr("fill", function(d, i) {
		    	if (_representation.options.coloring === "Table\xa0Spec") {
		    		return _data[i][2];
		    	} else {
			    	var param = i % 20;
			    	if (_representation.options.coloring === "Column") {
			    		param = _data[i][2];
			    	}
			    	return color(param);
		    	}
		    });
		
		path.order();
		
		var circles = plotG.selectAll("circle.center").data(vertices.slice(1));
		circles.attr("transform", function(d) { return "translate(" + d + ")"; })
		
		circles.enter().append("circle").attr("class", "center")
		    .attr("transform", function(d) { return "translate(" + d + ")"; })
		    .attr("r", 1.5);
	    
		plotG.selectAll(".axis path").attr({"stroke-width" : 1, fill : "none", stroke : "black"});
		
		plotG.selectAll(".axis").remove();
	    plotG.append("g")
	    .attr("class", "y axis")
	    .call(yAxis);
	
		plotG.append("g")
		    .attr("class", "x axis")
		    .attr("transform", "translate(0," + h + ")")
		    .call(xAxis);
	    
		plotG.selectAll(".axis path").attr({"stroke-width" : 1, fill : "none", stroke : "black"});
		
        if (_representation.options.svg.fullscreen) {
            var win = document.defaultView || document.parentWindow;
            win.onresize = resize;
        }  
    }
    
	function polygon(d) {
		  return "M" + d.join("L") + "Z";
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