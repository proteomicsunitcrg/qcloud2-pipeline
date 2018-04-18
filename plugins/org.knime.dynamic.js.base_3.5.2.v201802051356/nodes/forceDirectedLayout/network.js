// used sources:
// http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/
// http://mbostock.github.io/d3/talk/20110921/bounding.html
// http://bl.ocks.org/mbostock/1667139

// TODO: duration, resizing, test table2's column types

(network_namespace = function() {

  var view = {};
  var _representation, _value;
  var _data = {};
  var matrixSize;
  var force;
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

    _data = transformData(knimeTable1, knimeTable2, columnKeys);

    drawChart(false);

    if (parent != undefined && parent.KnimePageLoader != undefined) {
      parent.KnimePageLoader.autoResize(window.frameElement.id);
    }
  }


  transformData = function(knimeTable1, knimeTable2, columnKeys) {
    // Collect nodes and links.
    // (knimetable1 holds adjacency matrix)
    // (knimetable2 holds informations for each node - id & group)
    var nodes = [];
    var links = [];

    // loop column-wise
    for (var i = 0; i < matrixSize; i++) {
      var columnId = knimeTable1.getColumnNames().indexOf(columnKeys[i]);
      var adjacencyDataColumn = knimeTable1.getColumn(columnId);

      // Get information about node.
      // Push it to nodes-list.
      // Is there data about this node in the table from port two?
      if (knimeTable2 !== null &&
          typeof knimeTable2.getRows()[columnId] !== 'undefined') { // yes

        nodes.push({
          id: knimeTable2.getRows()[columnId].data[0] || i,
          group: (knimeTable2.getRows()[columnId].data[1] + 1) || 0
        });
      } else { // no
        nodes.push({ // default values
          id: i,
          group: 0
        });
      }

      // loop row-wise
      // Get information about links.
      // Push them to link-list.
      for (var j = 0; j < i; j++) {
        var rowId = knimeTable1.getColumnNames().indexOf(columnKeys[j]);
        var weight = adjacencyDataColumn[rowId];
        links.push({
          source: i, // nodes[i].id,
          target: j, // nodes[j].id,
          value: weight
        });
      }
    }

    return {nodes: nodes, links: links};
  };

  function createControls(controlsContainer) {
    var titleEdit = _representation.options.enableTitleEdit;
		var subtitleEdit = _representation.options.enableSubtitleEdit;
    var enableGravityEdit = _representation.options.enableGravityEdit;
    var enableChargeEdit = _representation.options.enableChargeEdit;
    var enableLinkDistanceEdit = _representation.options.enableLinkDistanceEdit;
    var enableLinkStrengthEdit = _representation.options.enableLinkStrengthEdit;

    if (_representation.options.enableViewControls) {
      var titleDiv;

      if (titleEdit || subtitleEdit) {
        titleDiv = controlsContainer.append("div").style({"margin-top" : "5px"});

        if (titleEdit) {
          titleDiv.append("label").attr("for", "titleIn").text("Title:").style({"display" : "inline-block", "width" : "150px"});
          titleDiv.append("input")
          .attr({id : "titleIn", type : "text", value : _value.options.title})
          .style("width", "150px")
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

        if (subtitleEdit) {
          titleDiv.append("label").attr("for", "subtitleIn").text("Subtitle:").style({"margin-left" : "10px", "display" : "inline-block", "width" : "150px"});
          titleDiv.append("input")
          .attr({id : "subtitleIn", type : "text", value : _value.options.subtitle})
          .style("width", "150px")
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

      if (enableGravityEdit || enableChargeEdit) {
        var gravityChargeDiv = controlsContainer.append("div").style({"margin-top" : "5px"});

        if (enableGravityEdit) {
          gravityChargeDiv.append("label").attr("for", "gravity").text("Gravity:").style({"display" : "inline-block", "width" : "150px"});
          gravityChargeDiv.append("input")
            .style("width", "150px")
            .style("text-align", "right")
            .attr("type", "number")
            .attr("id", "gravity")
            .attr("value", _value.options.gravity)
            .on("change", function() {
              _value.options.gravity = this.value;
              drawChart(true);
            })
            .on("keyup", function() {
              _value.options.gravity = this.value;
              drawChart(true);
            });
        }

        if (enableChargeEdit) {
          gravityChargeDiv.append("label").attr("for", "charge").text("Charge:").style({"margin-left" : "10px", "display" : "inline-block", "width" : "150px"});
          gravityChargeDiv.append("input")
            .style("width", "150px")
            .style("text-align", "right")
            .attr("type", "number")
            .attr("id", "charge")
            .attr("value", _value.options.charge)
            .on("change", function() {
              _value.options.charge = this.value;
              drawChart(true);
            })
            .on("keyup", function() {
              _value.options.charge = this.value;
              drawChart(true);
            });
        }
      }

      if (enableLinkDistanceEdit || enableLinkStrengthEdit) {
        var linkDiv = controlsContainer.append("div").style({"margin-top" : "5px"});

        if (enableLinkDistanceEdit) {
          linkDiv.append("label").attr("for", "linkDistance").text("Link-distance:").style({"display" : "inline-block", "width" : "150px"});
          linkDiv.append("input")
            .style("width", "150px")
            .style("text-align", "right")
            .attr("type", "number")
            .attr("id", "linkDistance")
            .attr("min", 0).attr("step", 1)
            .attr("value", _value.options.linkDistance)
            .on("change", function() {
              _value.options.linkDistance = this.value;
              drawChart(true);
            })
            .on("keyup", function() {
              _value.options.linkDistance = this.value;
              drawChart(true);
            });
        }

        if (enableLinkStrengthEdit) {
          linkDiv.append("label").attr("for", "linkStrength").text("Link-strength:").style({"margin-left" : "10px", "display" : "inline-block", "width" : "150px"});
          linkDiv.append("input")
            .style("width", "150px")
            .style("text-align", "right")
            .attr("type", "number")
            .attr("id", "linkStrength")
            .attr("min", 0).attr("max", 1)
            .attr("value", _value.options.linkStrength)
            .on("change", function() {
              _value.options.linkStrength = this.value;
              drawChart(true);
            })
            .on("keyup", function() {
              _value.options.linkStrength = this.value;
              drawChart(true);
            });
        }
      }

    }
  }

  // Draws the chart. If redraw is true, there are no animations.
  function drawChart(redraw) {
    // Parse the options

    var optTitle = _value.options["title"];
    var optSubtitle = _value.options["subtitle"];
    var optGravity = _value.options["gravity"];
    var optCharge = _value.options["charge"];
    var optLinkDistance = _value.options["linkDistance"];
    var optLinkStrength = _value.options["linkStrength"];


    var optShowControls = _representation.options["enableViewControls"];
    var optCollisionDetection = _representation.options["collisionDetection"];
    var optHighlighting = _representation.options["highlighting"];
    var optLabels = _representation.options["labels"];
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
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Calculate size of the plot area
    var w = Math.max(50, width - margin.left - margin.right);
    var h = Math.max(50, height - margin.top - margin.bottom);

    var options = {
      collisionDetection: optCollisionDetection,
      highlighting: optHighlighting,
      labels: optLabels,
      gravity: optGravity,
      charge: optCharge,
      linkDistance: optLinkDistance,
      linkStrength: optLinkStrength,
      runningInView: runningInView
    };
    drawNetwork(_data, plottingSurface, w, h, options);

    // Set resize handler
    if (optFullscreen) {
      var win = document.defaultView || document.parentWindow;
      win.onresize = resize;
    }
  }

  function drawNetwork(graph, plottingSurface, width, height, options) {
    //Set up the colour scale
    var color = d3.scale.category20();

    //Set up the force layout
    if (force) {
      force.stop();
    }
    force = d3.layout.force()
        .gravity(options.gravity)
        .charge(options.charge)
        .linkDistance(options.linkDistance)
        .linkStrength(options.linkStrength)
        .size([width, height])
        .nodes(graph.nodes)
        .links(graph.links)

    //Create all the line svgs but without locations yet
    var link = plottingSurface.selectAll(".link")
      .data(graph.links)
      .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function (d) {
        return Math.sqrt(d.value);
      });

    //Do the same with the circles for the nodes
    var node = plottingSurface.selectAll(".node")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .call(force.drag);

    node.append("circle")
      .attr("r", 8)
      .style("fill", function (d) {
        return color(d.group);
      });

    // Highlighting
    if (options.highlighting) {
      node.on('dblclick', connectedNodes);
    }

    // labels
    if (options.labels) {
      node.append("text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text(function(d) { return d.id; });
    }

    // Now we are giving the svgs co-ordinates - the force layout is
    // generating the co-ordinates which this code is using to update
    // the attributes of the svg elements
    force.on("tick", function () {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      if (options.collisionDetection) {
        // TODO: does this work?
        node.each(collide(0.5));
      }
    });

    // start the simulation
    if (options.runningInView) {
      // if we are in view:
      // show simulation animated till there is no/little change
      force.start();
    } else {
      // if we are in view:
      // do not show simulation animated; run a predifined number of steps
      force.start();
      var n = Math.max(graph.nodes.length * graph.links.length, 2000);
      for (var i = 0; i < n; ++i) {
        force.tick();
        // stop if there is no change anymore
        if (force.alpha() === 0) {
          break;
        }
      }
      force.stop();
    }

    // collision detection
    var padding = 1,
        radius=8;
    function collide(alpha) {
      var quadtree = d3.geom.quadtree(graph.nodes);
      return function(d) {
        var rb = 2*radius + padding,
            nx1 = d.x - rb,
            nx2 = d.x + rb,
            ny1 = d.y - rb,
            ny2 = d.y + rb;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y);
              if (l < rb) {
              l = (l - rb) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      };
    }

    // Highlighting
    //Toggle stores whether the highlighting is on
    var toggle = 0;
    //Create an array logging what is connected to what
    var linkedByIndex = {};
    for (i = 0; i < graph.nodes.length; i++) {
        linkedByIndex[i + "," + i] = 1;
    }
    graph.links.forEach(function (d) {
        linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });
    //This function looks up whether a pair are neighbours
    function neighboring(a, b) {
        return linkedByIndex[a.index + "," + b.index];
    }
    function connectedNodes() {
        if (toggle === 0) {
            //Reduce the opacity of all but the neighbouring nodes
            d = d3.select(this).node().__data__;
            node.style("opacity", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
            });
            link.style("opacity", function (o) {
                return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1;
            });
            //Reduce the op
            toggle = 1;
        } else {
            //Put them back to opacity=1
            node.style("opacity", 1);
            link.style("opacity", 1);
            toggle = 0;
        }
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
  }

  view.validate = function() {
    return true;
  };

  view.getComponentValue = function() {
    return _value;
  };

  return view;

}());
