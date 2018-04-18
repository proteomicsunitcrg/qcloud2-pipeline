// used sources:
// https://bl.ocks.org/mbostock/4062006
// http://bl.ocks.org/mbostock/1308257

(chord_namespace = function() {

  var view = {};
  var _representation, _value;
  var _data = {};
  var _colorRange;
  var matrixSize;
  var layoutContainer;
  var MIN_HEIGHT = 300, MIN_WIDTH = 400;


  view.init = function(representation, value) {
    _representation = representation;
    _value = value;

    // create Knime table from data (adjacency matrix with relationship size).
    var knimeTable1 = new kt();
    knimeTable1.setDataTable(_representation.inObjects[0]);
    var columnKeys = _representation.options.columns;

    // Load data from port 2 into knime table (information on each of the node).
    var knimeTable2 = null;
    if (_representation.inObjects[1] !== null) {
      knimeTable2 = new kt();
      knimeTable2.setDataTable(_representation.inObjects[1]);
    }

    // Check if there is data in first table.
    if (columnKeys.length === 0 || knimeTable1.getNumRows() === 0) {
      alert("No data given.");
      return;
    }

    // Get size of the quadratic (sub) matrix.
    matrixSize = Math.min(columnKeys.length, knimeTable1.getNumRows(), knimeTable1.getNumColumns());

    // Check if row- and column-count is identically for first table.
    if (knimeTable1.getNumColumns() !== knimeTable1.getNumRows()) {
       alert("A table with an equal number of rows and columns is required." +
             "Only the first " + matrixSize +  "columns/rows are used.");
    }

    // Check if table2 has right number of rows.
    if (knimeTable2 !== null &&
        knimeTable1.getNumColumns() !== knimeTable2.getNumRows()) {

      alert("Number of objects is not equal between data port one and two.");
    }

    _colorRange = getColors(knimeTable1, knimeTable2, columnKeys, _representation.options["customColors"]);
    _data = transformData(knimeTable1, knimeTable2, columnKeys);

    drawChart(false);

    if (parent != undefined && parent.KnimePageLoader != undefined) {
      parent.KnimePageLoader.autoResize(window.frameElement.id);
    }
  }

  function drawChart(redraw) {
    // Parse the options

    var optTitle = _value.options["title"];
    var optSubtitle = _value.options["subtitle"];

    var customColors = _representation.options["customColors"];
    var enableLabels = _representation.options["labels"];
    var enableTicks = _representation.options["ticks"];
    var showControls = _representation.options["enableViewControls"];
    var runningInView = _representation.runningInView;
    var optFullscreen = _representation.options["svg"]["fullscreen"] && runningInView;
    var optWidth = _representation.options["svg"]["width"]
    var optHeight = _representation.options["svg"]["height"]


    var body = d3.select("body");

    if (redraw) {
      d3.select("svg").remove();
      var svgContainer = d3.select("#svgContainer");
    } else {
      d3.selectAll("html, body")
        .style("width", "100%")
        .style("height", "100%")
        .style("margin", "0")
        .style("padding", "0");

      layoutContainer = body.append("div")
        .attr("id", "layoutContainer")
        .style("min-width", MIN_WIDTH + "px")
        .style("min-height", MIN_HEIGHT + "px");

      // Size layout container based on sizing settings
      if (optFullscreen) {
          layoutContainer
            .style("width", "100%")
            .style("height", "100%");
      } else {
          layoutContainer
            .style("width", optWidth + "px")
            .style("height", optHeight + "px");
      }

      // Add container for user controls at the bottom if they are enabled and we are running in a view
      var controlHeight;
      if (showControls && runningInView) {
        var controlsContainer = body.append("div")
          .attr("id", "controlContainer")
          .style({
            "bottom" : "0px",
            "width" : "100%",
            "padding" : "5px",
            "padding-left" : "60px",
            "border-top" : "1px solid black",
            "background-color" : "white",
            "box-sizing" : "border-box"
          });

        createControls(controlsContainer);
        controlHeight = controlsContainer.node().getBoundingClientRect().height;
        layoutContainer
          .style("min-height", (MIN_HEIGHT + controlHeight) + "px");
        if (optFullscreen) {
          layoutContainer
            .style("height", "calc(100% - " + controlHeight + "px)");
        }
      } else {
        controlHeight = 0;
      }

      // create container for svg
      var svgContainer = layoutContainer.append("div")
        .attr("id", "svgContainer")
        .style("min-width", MIN_WIDTH + "px")
        .style("min-height", "calc(" + MIN_HEIGHT + "px - " + controlHeight + "px")
        .style("box-sizing", "border-box")
        .style("overflow", "hidden")
        .style("margin", "0");
    }


    // Create the SVG object
    var svg = svgContainer.append("svg");
    svg.style("font-family", "sans-serif");

    var boundingRect = layoutContainer.node().getBoundingClientRect();
    var computedWidth = boundingRect.width;
    var computedHeight = boundingRect.height;

    var width, heigth;
    if (optFullscreen) {
      width = computedWidth;
      height = computedHeight;
    } else {
      width = optWidth;
      height = optHeight;
    }
    svgContainer.style("width", width + "px");
    svg.attr("width", width);
    svgContainer.style("height", height + "px");
    svg.attr("height", height);

    // Title
    svg.append("text")
      .attr("id", "title")
      .attr("font-size", 24)
      .attr("x", 20)
      .attr("y", 30)
      .text(_value.options.title);

    // Subtitle
    svg.append("text")
      .attr("id", "subtitle")
      .attr("font-size", 12)
      .attr("x", 20)
      .attr("y", 46)
      .text(_value.options.subtitle);


    // The margins for the plot area
    var margin = {
      top : (optTitle || optSubtitle) ? 60 : 10,
      left : 40,
      bottom : 40,
      right : 10
    };

    var plottingSurface = svg.append("g")
      .attr("id", "plottingSurface")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    // Calculate size of the plot area
    var w = Math.max(50, width - margin.left - margin.right);
    var h = Math.max(50, height - margin.top - margin.bottom);

    var options = {
      enableTicks: enableTicks,
      enableLabels: enableLabels
    };
    drawChordDiagram(_data, plottingSurface, w, h, options);

    // Set resize handler
    if (optFullscreen) {
      var win = document.defaultView || document.parentWindow;
      win.onresize = resize;
    }
  }

  function drawChordDiagram(_data, plottingSurface, width, height, options) {
    // chord chart
    var chord = d3.layout.chord()
        .padding(.05)
        .sortSubgroups(d3.descending)
        .matrix(_data.matrix);

    var fill = d3.scale.ordinal()
        .domain(d3.range(matrixSize))
        .range(_colorRange);

    var innerRadius = Math.min(width, height) * .41,
        outerRadius = innerRadius * 1.1;


    // Add chords.
    plottingSurface.append("g")
        .attr("class", "chord")
      .selectAll("path")
        .data(chord.chords)
      .enter().append("path")
        .attr("d", d3.svg.chord().radius(innerRadius))
        .style("fill", function(d) { return fill(d.target.index); })
        .style("opacity", 1);

    // Add groups.
    var g = plottingSurface.selectAll(".group")
        .data(chord.groups)
      .enter().append("g")
        .attr("class", "group");

    // Add arcs to groups.
    g.append("path")
      .attr("id", function(d, i) { return "group" + i; })
      .style("fill", function(d) { return fill(d.index); })
      .style("stroke", function(d) { return fill(d.index); })
      .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
      .on("mouseover", fade(.1))
      .on("mouseout", fade(1));

    // Add labels to groups.
    if (options.enableLabels) {
      g
        .append("text")
          .attr("x", 6)
          .attr("dy", Math.max(11, (outerRadius - innerRadius) / 2))
          .append("textPath")
            .attr(":xlink:href", function(d, i) { return "#group" + i.toString()       ; })
          .text(function(d, i) { return _data.labels[i]; });
    }

    // Add ticks.
    if (options.enableTicks) {
      var ticks = plottingSurface.append("g").selectAll("g")
          .data(chord.groups)
        .enter().append("g").selectAll("g")
          .data(groupTicks)
        .enter().append("g")
          .attr("transform", function(d) {
            return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                + "translate(" + outerRadius + ",0)";
          });

      ticks.append("line")
        .attr("x1", 1)
        .attr("y1", 0)
        .attr("x2", 5)
        .attr("y2", 0)
        .style("stroke", "#000");

      ticks.append("text")
        .attr("x", 8)
        .attr("dy", ".35em")
        .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180)translate(-16)" : null; })
        .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .text(function(d) { return d.label; });
    }

    // Returns an array of tick angles and labels, given a group.
    function groupTicks(d) {
      var k = (d.endAngle - d.startAngle) / d.value;
      return d3.range(0, d.value, 1000).map(function(v, i) {
        return {
          angle: v * k + d.startAngle,
          label: i % 5 ? null : v / 1000 + "k"
        };
      });
    }

    // Returns an event handler for fading a given chord group.
    function fade(opacity) {
      return function(g, i) {
        plottingSurface.selectAll(".chord path")
            .filter(function(d) { return d.source.index != i && d.target.index != i; })
          .transition()
            .style("opacity", opacity);
      };
    }
  }

  transformData = function(knimeTable1, knimeTable2, columnKeys) {
    // transform data from table into array of array
    var matrix = [];
    for (var i = 0; i < matrixSize; i++) {
      var columnKey = columnKeys[i];
      var columnIndex = knimeTable1.getColumnNames().indexOf(columnKey);

      matrix.push(
        knimeTable1.getColumn(columnIndex).map(function(d, i) {
          return d;
        })
      );
    }

    // load labels form second table
    var labels = []
    if (knimeTable2 !== null) {
      var allLabels = knimeTable2.getColumn(0);
      for (var i = 0; i < columnKeys.length; i++) {
        var rowIndex = knimeTable1.getColumnNames().indexOf(columnKeys[i]);
        var label = allLabels[rowIndex] || i.toString();
        labels.push(label);
      }
    } else {
      for (var i = 0; i < columnKeys.length; i++) {
        var label = i.toString();
        labels.push(label);
      }
    }

    return {matrix: matrix, labels: labels};
  };

  getColors = function(knimeTable1, knimeTable2, columnKeys, customColors) {
    // Set color scale: custom or default.
    var colorScale = [];
    if (customColors && knimeTable2 !== null) {
      var rowColors = knimeTable2.getRowColors();

      var numColumns = columnKeys.length;
      for (var i = 0; i < numColumns; i++) {
        var columnName = columnKeys[i]
        var rowIndex = knimeTable1.getColumnNames().indexOf(columnName);
        var color = rowColors[rowIndex];

        if (!color) {
          color = "#7C7C7C";
        }
        colorScale.push(color);
      }
    } else {
      colorScale = d3.scale.category10();
      if (columnKeys.length > 10) {
        colorScale = d3.scale.category20();
      }
    }

    return customColors ? colorScale : colorScale.range();
  }

  function updateTitles(updateChart) {
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
  }

  function createControls(controlsContainer) {
    if (_representation.options.enableViewControls) {

      if (!_representation.options.multi && _representation.options.enableColumnSelection) {
        var colSelectDiv = controlsContainer.append("div");
        colSelectDiv.append("label").attr("for", "colSelect").text("Selected column: ");
        var select = colSelectDiv.append("select").attr("id", "colSelect");
        for (var i = 0; i < _representation.options.columns.length; i++) {
          var txt = _representation.options.columns[i];
          var o = select.append("option").text(txt).attr("value", txt);
          if (txt === _value.options.numCol) {
            o.property("selected", true);
          }
        }
        select.on("change", function() {
          _value.options.numCol = select.property("value");
          drawChart();
        });
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

  view.validate = function() {
    return true;
  }

  function resize(event) {
    drawChart(true);
  };

  view.getComponentValue = function() {
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
      if (!styles[i].cssRules) continue;

      for (var j = 0; j < styles[i].cssRules.length; j++) {
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

  return view;

}());
