// https://bost.ocks.org/mike/sankey/

(sankey_namespace = function() {

  var view = {};
  var _representation, _value;
  var _data = {};
  var matrixSize;
  var layoutContainer;
  var columnIndexes = [];
  var MIN_HEIGHT = 300, MIN_WIDTH = 400;


  view.init = function(representation, value) {
    // Store value and representation for later.
    _representation = representation;
    _value = value;

    // Load data from port 1 into knime table (edge list with weights).
    var knimeTable1 = new kt();
    knimeTable1.setDataTable(_representation.inObjects[0]);

    // Load data from port 2 into knime table (information on each of the nodes).
    var knimeTable2 = null;
    if (_representation.inObjects[1] !== null) {
      knimeTable2 = new kt();
      knimeTable2.setDataTable(_representation.inObjects[1]);
    }

    // Collect column indexes for table1.
    columnIndexes[0] = knimeTable1.getColumnNames().indexOf(_representation.options.source);
    columnIndexes[1] = knimeTable1.getColumnNames().indexOf(_representation.options.target);
    columnIndexes[2] = knimeTable1.getColumnNames().indexOf(_representation.options.value);

    // Check if there is data in first table.
    if (knimeTable1.getNumRows() === 0) {
      alert("No data given.");
      return;
    }

    // Check if target != source column.
    if (columnIndexes[0] === columnIndexes[1]) {
      alert("Source and target column have to be different.");
      return;
    }

    // Check if data from table2 has right format
    var columnTypes2 = knimeTable2.getColumnTypes();
    if (columnTypes2[0] !== "string") {
      alert("Expected data format at port two: Node label (string).");
      return;
    }

    // Check if row- and column-count is identically for first table.
    var sourceColumn = knimeTable1.getColumn(columnIndexes[0]);
    var targetColumn = knimeTable1.getColumn(columnIndexes[1]);
    var redundantNodeIds = sourceColumn.concat(targetColumn);
    // remove NaN's
    redundantNodeIds = redundantNodeIds.filter(function(n){ return n != undefined });
    // find max node Id.
    var numNodes = Math.max.apply(null, redundantNodeIds) + 1;
    if (knimeTable2 !== null &&
        knimeTable2.getNumRows() !== numNodes) {

       alert("Number of given nodes is not equal for both data ports");
    }

    _data = transformData(knimeTable1, knimeTable2);

    drawChart(false);

    if (parent != undefined && parent.KnimePageLoader != undefined) {
      parent.KnimePageLoader.autoResize(window.frameElement.id);
    }
  }


  transformData = function(knimeTable1, knimeTable2) {
    // Collect nodes and links.
    // (knimetable1 holds collumns for: source, target, value)
    // (knimetable2 holds labels for each node
    nodes = [];
    links = [];

    var rows = knimeTable1.getRows();
    var sourceIndex = columnIndexes[0];
    var targetIndex = columnIndexes[1];
    var valueIndex = columnIndexes[2];

    // loop row-wise over links (table1)
    var numNodes = 0;
    for (var i = 0; i < knimeTable1.getNumRows(); i++) {
      var source = rows[i].data[sourceIndex];
      var target = rows[i].data[targetIndex];
      var value = rows[i].data[valueIndex];

      links.push({
        source: source,
        target: target,
        value: value
      });

      numNodes = Math.max(numNodes, source + 1, target + 1);
    }

    if (knimeTable2 !== null) {
      rows = knimeTable2.getRows();

      // loop over nodes (table2)
      for (var i = 0; i < numNodes; i++) {
        var name = rows[i] ? rows[i].data[0] : i.toString();
        nodes.push({name: name});
      }
    } else {
      for (var i = 0; i < numNodes; i++) {
        nodes.push({name: i.toString()});
      }
    }

    return {nodes: nodes, links: links};
  };

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

  // Draws the chart. If redraw is true, there are no animations.
  function drawChart(redraw) {
    // Parse the options

    var optTitle = _value.options["title"];
    var optSubtitle = _value.options["subtitle"];

    var optShowControls = _representation.options["enableViewControls"];
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
      if (optShowControls && runningInView) {
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

    // set width / height
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
    svgContainer.style("width", width + "px")
    svg.attr("width", width);
    svgContainer.style("height", height + "px")
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
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Calculate size of the plot area
    var w = Math.max(50, width - margin.left - margin.right);
    var h = Math.max(50, height - margin.top - margin.bottom);

    var options = {
    };
    drawSankey(_data, plottingSurface, w, h, options);

    // Set resize handler
    if (optFullscreen) {
      var win = document.defaultView || document.parentWindow;
      win.onresize = resize;
    }
  }

  function drawSankey(graph, parent, width, height, options) {
    var formatNumber = d3.format(",.0f"),
        format = function(d) { return formatNumber(d) + " TWh"; },
        color = d3.scale.category20();

    var sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .size([width, height]);

    var path = sankey.link();

    sankey
        .nodes(graph.nodes)
        .links(graph.links)
        .layout(32);

    var link = parent.append("g").selectAll(".link")
        .data(graph.links)
      .enter().append("path")
        .attr("class", "link")
        .attr("d", path)
        .style("stroke-width", function(d) { return Math.max(1, d.dy); })
        .sort(function(a, b) { return b.dy - a.dy; });

    link.append("title")
        .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value); });

    var node = parent.append("g").selectAll(".node")
        .data(graph.nodes)
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() { this.parentNode.appendChild(this); })
        .on("drag", dragmove));

    node.append("rect")
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
        .style("fill", function(d) {
          return d.color = color(d.name.replace(/ .*/, ""));
        })
        .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
      .append("title")
        .text(function(d) { return d.name + "\n" + format(d.value); });

    node.append("text")
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .text(function(d) { return d.name; })
      .filter(function(d) { return d.x < width / 2; })
        .attr("x", 6 + sankey.nodeWidth())
        .attr("text-anchor", "start");

    function dragmove(d) {
      d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
      sankey.relayout();
      link.attr("d", path);
    }
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
  };

  function resize(event) {
    drawChart(true);
  };

  view.validate = function() {
    return true;
  }

  view.getComponentValue = function() {
    return _value;
  }

  return view;

}());
