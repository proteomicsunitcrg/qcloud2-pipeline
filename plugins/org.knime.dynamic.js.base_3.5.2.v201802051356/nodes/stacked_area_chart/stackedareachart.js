(boxplot_namespace = function() {
    var input = {};
    var _data = {};
    var layoutContainer;
    var MIN_HEIGHT = 300, MIN_WIDTH = 400;
    var _representation, _value;
    var yMax = Number.NEGATIVE_INFINITY;
    var maxX = 0;
    
    input.init = function(representation, value) {  
        _value = value;
        _representation = representation;
        
        if (!_value.options.numCol) {
            _value.options.numCol = _representation.options.columns[0];
        }
        
        if (_representation.options.columns.length == 0) {
            alert("No numeric columns selected");
            return;
        }

        d3.select("html").style("width", "100%").style("height", "100%")
        d3.select("body").style("width", "100%").style("height", "100%").style("margin", "0").style("padding", "0");

        var body = d3.select("body");
        
        layoutContainer = body.append("div").attr("id", "layoutContainer")
                .style("width", "100%").style("height", "calc(100% - 0px)")
                .style("min-width", MIN_WIDTH + "px");
        
        var controlHeight;
        if (_representation.enableControls || true) {
             var controlsContainer = body.append("div").style({position : "relative", bottom : "0px",
                         width : "100%", padding : "5px", "padding-left" : "60px",
                          "border-top" : "1px solid black", "background-color" : "white", "box-sizing" : "border-box"}).attr("id", "controlContainer");

            createControls(controlsContainer);
            controlHeight = controlsContainer.node().getBoundingClientRect().height;
        } else {
            controlHeight = 0;
        }

        layoutContainer.style({
            "height" : "calc(100% - " + controlHeight + "px)",
            "min-height" :  (MIN_HEIGHT + controlHeight) + "px"
        });
        
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
        plotG.append("rect").attr("id", "da").attr("fill", _representation.options.daColor);
        
         plotG.append("g")
            .attr("class", "x axis");
         plotG.append("g")
            .attr("class", "y axis");
        
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
        
        _data = transformData(_representation.inObjects[0]);
        
        drawChart();
        
        if (parent != undefined && parent.KnimePageLoader != undefined) {
            parent.KnimePageLoader.autoResize(window.frameElement.id);
        }
    }
    
    function createControls(controlsContainer) {
        if (_representation.options.enableViewControls) {
        
           if (_representation.options.enableInterpolationChooser) {
                var interpolationDiv = controlsContainer.append("div");
                interpolationDiv.append("label").attr("for", "interpolationSelect").text("Interpolation: ");
                var select = interpolationDiv.append("select").attr("id", "interpolationSelect");
                var INTERPOLATIONS = ["linear", "basis", "cardinal", "step"];
                for (var i = 0; i < INTERPOLATIONS.length; i++) {
                    var interp = INTERPOLATIONS[i];
                    var o = select.append("option").text(interp).attr("value", interp);
                    if (interp === _value.options.interpolation) {
                        o.property("selected", true);
                    }
                }
                select.on("change", function() {
                    _value.options.interpolation = select.property("value");
                    drawChart();
                });
                
                interpolationDiv.append("input").attr("type", "checkbox")
                    .style("margin-left", "10px")
                    .attr("name", "showXGrid")
                    .property("value", "showXGrid")
                    .attr("id", "showXGrid")
                    .property("checked", _value.options.showXGrid).on("click", function() {
                        _value.options.showXGrid = d3.select(this).property("checked");
                        drawChart();
                    });
               interpolationDiv.append("label").attr("for", "showXGrid").style("margin-left", "5px").text("Show X Grid");
               
               interpolationDiv.append("input").attr("type", "checkbox")
                    .style("margin-left", "10px")
                    .attr("name", "showYGrid")
                    .property("value", "showYGrid")
                    .attr("id", "showYGrid")
                    .property("checked", _value.options.showYGrid).on("click", function() {
                        _value.options.showYGrid = d3.select(this).property("checked");
                        drawChart();
                    });
               interpolationDiv.append("label").attr("for", "showYGrid").style("margin-left", "5px").text("Show Y Grid");
            }
        
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
    
    function transformData(input) {
        var d = [];
        var knimeTable = new kt();
        knimeTable.setDataTable(input);
        
        var cols = _representation.options.columns;

        for (var i = 0; i < cols.length; i++) {
            var datum = {};
            var col = cols[i];
            datum.name = col;
            datum.values = knimeTable.getColumn(col).map(function(d, i) {
                return {y : d, x : i + 1};
            });
            d.push(datum);
            maxX = datum.values.length;
        }
        for (var i = 0; i < maxX; i++) {
            var sum = 0;
            for (var j = 0; j < cols.length; j++) {
                sum += input.rows[i].data[j];
            }
            yMax = Math.max(yMax, sum);
        }
        return d;
    }
    
    function norm(d) {
        return d / yMax;
    }
    
    function drawChart(resizing) {

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

        var margin = {top : (_value.options.subtitle || _value.options.title) ? 60 : 10, left : 40, bottom : 40, right : 10};

        var d3svg = d3.select("svg").attr({width : cw, height : ch}).style({width : chartWidth, height : chartHeight});
        
        var plotG = d3svg.select("#plotG")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        var w = Math.max(50, parseInt(d3svg.style('width')) - margin.left - margin.right);
        var h = Math.max(50, parseInt(d3svg.style('height')) - margin.top - margin.bottom);
        
        plotG.select("#da").attr({width : w, height : h + 5});
        d3svg.select("#bgr").attr({width : w + margin.left + margin.right, height : h + margin.top + margin.bottom});
        
        var x = d3.scale.linear().domain([1,maxX])
            .range([0, w]);
            
        var hwidth = w / maxX / 2;
        var gridlines = [];
        for (var g = x.domain()[0]; g < x.domain()[1]; g++) {
            gridlines.push(g);
        }
        
        var y = d3.scale.linear().domain([0, 1])
            .range([h, 0]).nice();
        
        var color = d3.scale.category20();
        
        var stack = d3.layout.stack()
            .values(function(d) { return d.values; });
            
        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");
        
        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");
            
        var area = d3.svg.area().interpolate(_value.options.interpolation)
            .x(function(d, i) { return x(d.x); })
            .y0(function(d) { return y(d.y0); })
            .y1(function(d) { return y(d.y0 + d.y); });
        
        color.domain(d3.keys(_data));
        
        var data = stack(_data);

        var a = plotG.selectAll(".stacked-area")
          .data(data);

        var plot = a
            .enter().append("g")
            .attr("class", "stacked-area");

        plot.append("path")
          .attr("class", "area")
          .style("fill", function(d) { return color(d.name); });
          
         a.selectAll(".area").attr("d", function(d) { return area(d.values); });
          
         plotG.select(".x")
            .attr("transform", "translate(0," + (h + 5) + ")")
            .call(xAxis);

        plotG.select(".y").call(yAxis);
        
        plotG.selectAll(".axis line, .axis path").style({"fill" : "none", "stroke" : "#000", "shape-rendering" : "crispEdges"});

        plotG.selectAll(".grid").remove();
        if (_value.options.showXGrid) {
            var gl = plotG.selectAll(".gridline").data(gridlines);
            
            gl.enter().append("line")
                .attr("class", "gridline grid")
                .attr("y1", 0);
            
            gl.attr("x1", function(d) { return x(d) + ((_value.options.interpolation == "step") ? hwidth : (hwidth * 2)); })
                .attr("x2", function(d) { return x(d) + ((_value.options.interpolation == "step") ? hwidth : (hwidth * 2)); })
                .attr("y1", h);
          } 
          if (_value.options.showYGrid) {  
             
             plotG.append("g")         
                .attr("class", "grid")
                .call(yAxis
                    .tickSize(-w, 0, 0)
                    .tickFormat("")
                );
        }
        if (_value.options.showYGrid || _value.options.showXGrid) {
               plotG.selectAll("line.grid, .grid line")
                    .attr("stroke", "black")
                    .style("opacity", 0.3)
                    .style("shape-rendering" , "crispEdges");
        }
            
        a.enter().append("text")
          .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
          .attr("text-anchor", "end")
          .style("font-weight", "bold")
          .attr("x", -6)
          .attr("dy", ".35em")
          .attr("class", "label")
          .text(function(d) { return d.name; });
          
         plotG.selectAll(".label")
            .attr("transform", function(d) { return "translate(" + x(d.value.x) + "," + y(d.value.y0 + d.value.y / 2) + ")"; })
          
        if (_representation.options.svg.fullscreen) {
            var win = document.defaultView || document.parentWindow;
            win.onresize = resize;
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