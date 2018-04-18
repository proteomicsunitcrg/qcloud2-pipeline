(sunburst_namespace = function() {

	var view = {};
	var _representation, _value;
	var knimeTable1, knimeTable2;
	var _data = {};
	var uniqueLabels;
	var nodes;
	var selectedRows = [];
	var highlitedPath;
	var zoomNode;
	var rowKey2leaf = {};
	var currentFilter = null;
	var _colorMap;
	var mouseMode = "highlite";
	var totalSize;
	var selectionChangedFlag = false;


	var layoutContainer;
	var MIN_HEIGHT = 300, MIN_WIDTH = 400;

	var rootNodeName = "root";
	var nullNodeName = "?";

	var innerLabelStyles = ['sum', 'percentage'];

	view.init = function(representation, value) {
		_representation = representation;
		_value = value;

		// Load data from port 1 into knime table.
		knimeTable1 = new kt();
		knimeTable1.setDataTable(_representation.inObjects[0]);

		if (_value.options.mouseMode) {
			mouseMode = _value.options.mouseMode;
		}
		if (_value.options.selectedRows) {
			selectedRows = _value.options.selectedRows;
		}
		if (_value.options.highlitedPath) {
			highlitedPath = _value.options.highlitedPath;
		}

		transformData();
		setColors();
		drawControls();
		drawChart();
		toggleFilter();

		if (_representation.warnMessage != "") {
			knimeService.setWarningMessage(_representation.warnMessage, "representation_warnMessage");
		}

		if (_value.options.subscribeSelection) {
			knimeService.subscribeToSelection(knimeTable1.getTableId(), selectionChanged);
		}

		outputSelectionColumn();

	};

	// Transform data from first port into a hierarchical structure suitable
	// for a partition layout.
	var transformData = function() {
		// Get indices for path columns and frequency column.
		function indexOf(column) {
			return knimeTable1.getColumnNames().indexOf(column);
		}
		var pathColumns = _representation.options.pathColumns.map(indexOf);
		var freqColumn = indexOf(_representation.options.freqColumn);

		// Check which rows are included by the filter/selection.
		var includedRows = knimeTable1.getRows().filter(function(row) {
			var includedInFilter = !currentFilter || knimeTable1.isRowIncludedInFilter(row.rowKey, currentFilter);
			// var includedInSelection = !_value.options.showSelectedOnly || selectedRows.length == 0 || selectedRows.indexOf(row.rowKey) != -1;
			var includedInSelection = !_value.options.showSelectedOnly || selectedRows.indexOf(row.rowKey) != -1;
			return includedInFilter && includedInSelection;
		});

		// Get all unique labels from path columns.
		var notNull = function(value) { return value !== null; };
		var accumulate = function(accumulator, array) { return accumulator.concat(array); };
		var onlyUnique = function(value, index, self) { return self.indexOf(value) === index; };

		uniqueLabels = pathColumns
		.map(function(columnId) {
			var uniqueLabelsOfColumn = includedRows.map(function(row) {
				return row.data[columnId];
			})
			.filter(notNull)
			.filter(onlyUnique);

			return uniqueLabelsOfColumn;
		})
		.reduce(accumulate, [])
		.filter(onlyUnique);


		// make sure that reserved names do not collide whith user given classes
		while (uniqueLabels.indexOf(rootNodeName) > -1) {
			rootNodeName += "_";
		}
		while (uniqueLabels.indexOf(nullNodeName) > -1) {
			nullNodeName += "_";
		}

		var id = 0;

		// Initialize _data object
		_data = {
				id: id++,
				name: rootNodeName,
				children: [],
				active: false,
				highlited: false,
				selected: false
		};


		var missingSizeCount = 0;
		var missingPathCount = 0;

		// Create hierarchical structure.
		for (var i = 0; i < includedRows.length; i++) {

			var size = includedRows[i].data[freqColumn];
			if (size === null || isNaN(size)) {
				missingSizeCount++;
				size = 0;
			}
			size = Math.abs(size);

			// get array of path elements from current row
			var parts = pathColumns.map(function(col) { return includedRows[i].data[col]; });
			// Remove trailing nulls
			while(parts[parts.length-1] === null) {
				parts.pop();
			}

			if (parts.length === 0) {
				missingPathCount++;
			}

			// Loop over path elements,
			// append to hierarchical structure
			var currentNode = _data;
			for (var j = 0; j < parts.length; j++) {
				var children = currentNode["children"];
				if (parts[j] === null) {
					var nodeName = nullNodeName;
				} else {
					var nodeName = parts[j];
				}

				var childNode;
				if (j + 1 < parts.length) {
					// Not yet at the end of the sequence; move down the tree.
					var foundChild = false;
					for (var k = 0; k < children.length; k++) {
						if (children[k]["name"] === nodeName) {
							childNode = children[k];
							foundChild = true;
							break;
						}
					}
					// If we don't already have a child node for this branch, create it.
					if (!foundChild) {
						childNode = {
								id: id++,
								name: nodeName,
								children: [],
								active: false,
								highlited: false,
								selected: false
						};
						children.push(childNode);
					}
					currentNode = childNode;
				} else {
					// Reached the end of the sequence; create a leaf node.
					childNode = {
							id: id++,
							name: nodeName,
							size: size,
							children: [],
							active: false,
							highlited: false,
							selected: false,
							rowKey: includedRows[i].rowKey
					};
					children.push(childNode);

					// Add id of leaf to [row -> leaf]-data-structure. 
					rowKey2leaf[includedRows[i].rowKey] = childNode;
				}
			}
		}
		if (missingPathCount > 0) {
			knimeService.setWarningMessage(missingPathCount + " rows are not display because of missing path.", "missingPathCount");
		}
		if ((_representation.options.freqColumn != null) && (missingSizeCount > 0) ) {
			knimeService.setWarningMessage(missingSizeCount + " have a missing numeric value. The value defaults to zero.", "missingSizeCount");
		}
	};

	var setColors = function() {
		var useCustomColors = (_representation.inObjects[1] != null) && (_representation.inObjects[1].labels != null);
		var showWarning = (_representation.inObjects[1] != null) && (_representation.inObjects[1].labels == null);

		if (showWarning) {
			knimeService.setWarningMessage("Your color model does not provide a 'label' attribute.", "colormodel");
		}

		if (useCustomColors) {
			var colors = _representation.inObjects[1].colors;
			var labels = _representation.inObjects[1].labels;
			var colorMap = {}
			for (var i = 0; i < colors.length; i++) {
				colorMap[labels[i]] = colors[i];
			}
		} else {
			if (uniqueLabels.length <= 10) {
				var scale = d3.scale.category10();
			} else {
				var scale = d3.scale.category20();
			}

			var colorMap = {};
			uniqueLabels.forEach(function(label) { colorMap[label] = scale(label); });
		}

		_colorMap = function(label) {
			if (label === rootNodeName || label === nullNodeName) {
				return "#FFFFFF";
			} else {
				if (colorMap.hasOwnProperty(label)) {
					return colorMap[label];
				} else {
					return "#000000";
				}
			}
		}
		_colorMap.entries = d3.entries(colorMap);
		_colorMap.keys = d3.keys(colorMap);
	};

	var updateTitles = function(updateChart) {
		d3.select("#title").text(this.value);
		d3.select("#subtitle").text(_value.options.subtitle);

		if (updateChart) {
			drawChart();
		}
	};

	var drawChart = function() {
		// Remove earlier chart.
		d3.select("#layoutContainer").remove();

		/*
		 * Parse some options.
		 */
		var optFullscreen = _representation.options.svg.fullscreen && _representation.runningInView;
		var isTitle = _value.options.title !== "" || _value.options.subtitle !== "";

		d3.selectAll("html, body")
		.style({
			"width": "100%",
			"height": "100%",
			"margin": "0",
			"padding": "0"
		});

		var body = d3.select("body");
		body.style({
			"font-family": "sans-serif",
			"font-size": "12px",
			"font-weight": "400",
		})

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
		.attr({
			"id": "svg",
			"font-family": "sans-serif",
			"font-size": "12px",
			"font-weight": "400",
		});

		// set width / height of svg
		if (optFullscreen) {
			var boundingRect = svgContainer.node().getBoundingClientRect();
			var svgWidth = boundingRect.width;
			var svgHeight = boundingRect.height;
		} else {
			var svgWidth = _representation.options.svg.width;
			var svgHeight = _representation.options.svg.height;
		}
		svg
		.style("width", svgWidth + "px")
		.style("height", svgHeight + "px")
		.attr("width", svgWidth)
		.attr("height", svgHeight);

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


		// Compute plotting options
		var margin = {
				top : isTitle ? 60 : 10,
						left : 10,
						bottom : 10,
						right : 10
		};

		var plottingSurface = svg.append("g")
		.attr("id", "plottingSurface")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var w = Math.max(50, svgWidth - margin.left - margin.right);
		var h = Math.max(50, svgHeight - margin.top - margin.bottom);

		var options = {
				legend: _value.options.legend,
				breadcrumb: _value.options.breadcrumb,
				zoomable: _representation.options.zoomable,
				donutHole: _value.options.donutHole,
				aggregationType: _value.options.aggregationType,
				filterSmallNodes: _value.options.filterSmallNodes
		};
		
		// Check if there is data.
		if (_data.children.length == 0) {
			if (knimeTable1.getNumRows() == 0) {
				svg.append("text")
				.attr("text-anchor", "middle")
				.attr("alignment-baseline", "central")
				.attr("x", w/2)
				.attr("y", h/2)
				.attr("id", "errorMsg")
				.text("Error: No data available");
			} else {   
				knimeService.setWarningMessage("There is no data to display due to a filter or selection.", "filter_warnMessage");
				drawSunburst(_data, plottingSurface, w, h, options);
			}
		} else {
			knimeService.setWarningMessage(null, "filter_warnMessage");
			drawSunburst(_data, plottingSurface, w, h, options);
		}

		// Set resize handler
		if (optFullscreen) {
			var win = document.defaultView || document.parentWindow;
			win.onresize = resize;
		}
	};

	var drawSunburst = function(data, plottingSurface, width, height, options) {
		var marginTop = options.breadcrumb ? 40 : 0;
		var marginLeft = options.legend ? 85 : 0;

		// Dimensions of sunburst.
		var radius = Math.min(width - marginLeft, height - marginTop) / 2;

		// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
		var b = { w: 100, h: 30, s: 3, t: 10 };

		var partition = d3.layout.partition()
		.value(
				_representation.options.freqColumn == null
				? function(d) { return 1; }
				: function(d) { return d.size; }
		)

		// Create list of segment objects with cartesian orientation from data.
		if (options.filterSmallNodes) {
			// For efficiency, filter nodes to keep only those large enough to see.
			nodes = partition.nodes(data)
			.filter(function(d) {
				return (d.dx > _representation.options.filteringThreshold);
			});
		} else {
			nodes = partition.nodes(data);
		}

		// The partition layout returns a rectengular hierarchical layout in
		// a cartesian coordinate space. That is, nodes of the tree get the
		// attributes x, y, dx, dy (dx,dy = extent of node position).
		// In its original form the layout has a size of 1x1.
		// x maps the node's x and dx attribute to an angle.
		// y maps the node's y and dy attribute to vector length.
		var x = d3.scale.linear()
		.range([0, 2 * Math.PI]);

		var y = d3.scale.sqrt()
		.range([0, radius])

		if (options.donutHole) {
			y.domain([0, 1]);
		} else {
			y.domain([nodes[0].dy, 1]);
		}

		// Functions to map cartesian orientation of partition layout into radial
		// orientation of sunburst chart.
		var arc = d3.svg.arc()
		.startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
		.endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
		.innerRadius(function(d) { return Math.max(0, y(d.y)); })
		.outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

		// create new group for the sunburst plot (not legend, not breadcrumb)
		var sunburstGroup = plottingSurface.append("g")
		.attr("transform", "translate(" + ((width - marginLeft) / 2) + "," + ((height + marginTop) / 2) + ")")
		.attr("id", "sunburstGroup");

		// Bounding circle underneath the sunburst, to make it easier to detect
		// when the mouse leaves the plottingSurface g.
		sunburstGroup.append("svg:circle")
		.attr("r", radius)
		.attr("opacity", 0);


		var path = sunburstGroup.selectAll("path")
		.data(nodes)
		.enter().append("path")
		.attr("d", arc)
		.attr("fill-rule", "evenodd")
		.attr("fill", function(d) { return _colorMap(d.name); })
		.attr("stroke",function(d) { return d.selected ? "black" : "white" })
		.attr("stroke-width", 1)
		.on("mouseover", mouseover)
		.on("click", click);

		// Basic setup of page elements.
		if (options.breadcrumb) {
			initializeBreadcrumbTrail(plottingSurface);
		}

		if (options.legend) {
			drawLegend(plottingSurface, options.breadcrumb, b.h);
		}

		var rootRadius = d3.scale.sqrt().range([0, radius])(nodes[0].dy);

		// add explanation in the middle of the circle
		var explanation = sunburstGroup.append("g")
		.attr("id", "explanation")
		.attr("width", rootRadius * 2)
		.style({
			"position": "absolute",
			"top": "260px",
			"left": "0",
			"text-align": "center",
			"color": "#666",
			"z-index": "-1",
		})
		.attr("display", (options.donutHole && !options.zoom) ? "inline" : "none");

		explanation.append("text")
		.attr("id", "percentage")
		.attr("text-anchor", "middle")
		.attr("alignment-baseline", "middle")
		.attr("width", rootRadius * 2)
		.attr("font-size", "2.5em")

		explanation.append("text")
		.attr("id", "explanationText")
		.attr("text-anchor", "middle")
		.attr("alignment-baseline", "middle")
		.attr("y", 30)
		.attr("width", rootRadius * 2)
		.attr("font-size", "1.8em")
		.attr("font-weight", "lighter");


		// Add transparent circle on top. This is used for clicking / zooming out when donut hole is enabbled.
		if (options.donutHole) {
			sunburstGroup.append("svg:circle")
			.attr("id", "donut_hole_button")
			.attr("r", rootRadius)
			.attr("fill", "none")
			.attr("pointer-events", "all")
			.on('click', function() {
				if (mouseMode == "zoom") {
					if (zoomNode != null && zoomNode.parent != null) {
						zoom(zoomNode.parent);
					}
				}
				if (mouseMode == "select") {
					clearSelection();
					if (_value.options.showSelectedOnly) {
						highlitedPath = null;
						transformData();
						drawChart();
					} 
				}
				if (mouseMode == "highlite") {
					clearHighliting();
				}
			})
			.on("mouseover", function() {
				if (mouseMode == "highlite" && highlitedPath == null) {
					setPropAllNodes('active', true);
					sunburstGroup.selectAll("path")
					.attr("opacity", function(d) { return ((highlitedPath == null) || d.highlited) ? 1 : 0.3; });

					toggleBreadCrumb(false);
					toggleInnerLabel(false);
				}
			});
		}

		// Get total size of the tree = value of root node from partition.
		totalSize = path.node().__data__.value;

		// Set highliting
		if (_representation.options.highliting && mouseMode != "zoom" && highlitedPath != null) {
			var d = getNodeFromPath(highlitedPath); // nodes.filter(function(node) { return node.id == highlitedPath })[0];
			if (d != null) {
				highlite(d);
			}
		}

		// Set selection
		if (!_value.options.showSelectedOnly && selectedRows.length > 0 ) {
			selectedRows.forEach(function(rowKey) { rowKey2leaf[rowKey].selected = true; addNodeToSelectionBackward(rowKey2leaf[rowKey]); });
			renderSelection();
		}

		// Set zoom
		if (_value.options.zoomedPath && _representation.options.zoomable) {
			zoomNode = getNodeFromPath(_value.options.zoomedPath);

			if (_value.options.breadcrumb && zoomNode.parent != null) {
				updateBreadcrumb(zoomNode.parent);
				toggleBreadCrumb(true);
			}


			path.transition()
			.duration(0)
			.attrTween("d", arcTweenZoom(zoomNode));
		}

		// Add the mouseleave handler to the bounding circle.
		sunburstGroup.on("mouseleave", mouseleave);

		// Handle clicks on sunburst segments
		function click(d) {
			if (mouseMode == "zoom") {
				clearHighliting();
				zoom(d);
			} else if (mouseMode == "select"){
				select(d);
				if (_value.options.showSelectedOnly) {
					highlitedPath = null;
					transformData();
					drawChart();
				} 
			} else {
				clearHighliting();
				setPropAllNodes('active', false);
				highlite(d);
			}
		}

		// Handle mouseover on sunburst segments
		function mouseover(d) {
			if ((d.name != rootNodeName) &&
					(mouseMode == "highlite") && highlitedPath == null) {

				// set sunburst segment properties
				setPropAllNodes('active', false);
				setPropsBackward(d, 'active', true);
				sunburstGroup.selectAll("path")
				.attr("opacity", function(d) { return (d.active || d.highlited) ? 1 : 0.3; });

				updateStatisticIndicators(d);
				toggleBreadCrumb(true);
				toggleInnerLabel(true);
			}
		}

		// Handle mouseleave on sunburst segments
		function mouseleave(d) {
			if ((mouseMode == "highlite") && highlitedPath == null) {
				// set sunburst segment properties
				setPropAllNodes('active', true);
				sunburstGroup.selectAll("path")
				.attr("opacity", function(d) { return ((highlitedPath == null) || d.highlited) ? 1 : 0.3; });

				toggleBreadCrumb(false);
				toggleInnerLabel(false);
			}
		}

		// Highliting one node and it's ancestors, show inner label / breadcrumb.
		function highlite(node) {
			highlitedPath = getUniquePathToNode(node);
			setPropAllNodes('active', false);
			setPropAllNodes('highlited', false);
			setPropsBackward(node, 'highlited', true);
			sunburstGroup.selectAll("path")
			.attr("opacity", function(d) { return d.highlited ? 1 : 0.3; });

			updateStatisticIndicators(node);
			toggleBreadCrumb(true);
			toggleInnerLabel(true);
		}

		function select(node) {
			selectionChangedFlag = true;

			if (d3.event.shiftKey) {
				if (node.selected) {
					// Remove elements from selection.
					setPropsBackward(node, "selected", false);
					var leafs = setPropsForward(node, "selected", false);
					var rowKeys = leafs.map(function(leaf) { return leaf.rowKey; });
					for (var i = 0; i < rowKeys.length; i++) {
						var index = selectedRows.indexOf(rowKeys[i]);
						if (index > -1) {
							selectedRows.splice(index, 1);
						}
					}

					if (_value.options.publishSelection) {
						knimeService.removeRowsFromSelection(knimeTable1.getTableId(), rowKeys, selectionChanged);
					}
				} else {
					// Add element to selection.
					var leafs = setPropsForward(node, 'selected', true);
					addNodeToSelectionBackward(node);
					var rowKeys = leafs.map(function(leaf) { return leaf.rowKey; });
					for (var i = 0; i < rowKeys.length; i++) {
						var index = selectedRows.indexOf(rowKeys[i]);
						if (index == -1) {
							selectedRows.push(rowKeys[i]);
						}
					}

					if (_value.options.publishSelection) {
						knimeService.addRowsToSelection(knimeTable1.getTableId(), rowKeys, selectionChanged);
					}
				}
			} else {
				// Set selection.
				setPropAllNodes('selected', false);
				var leafs = setPropsForward(node, 'selected', true);
				addNodeToSelectionBackward(node);
				selectedRows =  leafs.map(function(leaf) { return leaf.rowKey; });

				if (_value.options.publishSelection) {
					knimeService.setSelectedRows(knimeTable1.getTableId(), selectedRows, selectionChanged);
				}
			}
			renderSelection();
		}

		// Restore everything to full opacity when moving off the visualization.
		clearHighliting = function(d) {
			highlitedPath = null;
			setPropAllNodes('highlited', false);

			sunburstGroup.selectAll("path")
			.attr("opacity", 1);

			toggleBreadCrumb(false);
			toggleInnerLabel(false);
		}

		clearSelection = function() {
			selectionChangedFlag = true;

			selectedRows = [];
			setPropAllNodes('selected', false);
			renderSelection();
			if (_value.options.publishSelection) {
				knimeService.setSelectedRows(knimeTable1.getTableId(), [], selectionChanged);
			}
		}
		
		// Traverse through tree and add nodes to selection.
		addNodeToSelectionBackward = function(node) {
			if (!node) {
				return;
			}
			node.selected = true;
			var parent = node.parent;
			while (parent != null) {
				var allChildrenSelected = parent.children.every(function(child) { return child.selected; });
				if (allChildrenSelected) {
					parent.selected = true;
				} else {
					break;
				}
				parent = parent.parent;
			}
		}
		
		// Draw border around all selected segments.
		renderSelection = function() {
			//var sunburstGroup = d3.select("g#sunburstGroup");
			if (_value.options.showSelectedOnly) {
				sunburstGroup.selectAll("path")
				.attr("stroke-width", 1)
				.attr("stroke", "white");
			} else {
				sunburstGroup.selectAll("path")
				.attr("stroke-width", function(d) {
					return d.selected ? 2 : 1;
				})
				.attr("stroke",function(d) {
					return d.selected ? "#333333" : "white";
				});

				// Resort elements in dom so that selected elements
				// are drawn last.
				sunburstGroup.selectAll("path").sort(function(a, b) {
					if (a.selected == b.selected) {
						return 0;
					}
					if (a.selected) {
						return 1;
					}
					return -1;
				});
			}
		}

		var zoom = function(d) {
			path.transition()
			.duration(750)
			.attrTween("d", arcTweenZoom(d));

			if (_value.options.breadcrumb) {
				var parent = d.parent;
				if (parent != null) {
					updateBreadcrumb(parent);
					toggleBreadCrumb(true);
				} else {
					toggleBreadCrumb(false);
				}
			}

			if (d.name === rootNodeName) {
				zoomNode = null;
				delete _value.options.zoomedPath;
			} else {
				zoomNode = d;
				_value.options.zoomedPath = getUniquePathToNode(d);
			}
		}

		resetZoom = function() {
			zoom(nodes[0]);
		}

		// When zooming: interpolate the scales.
		function arcTweenZoom(d) {
			var zoomToStart = (d.parent == null) || (d.parent.name == rootNodeName); 

			if (_value.options.donutHole) {
				y.clamp(true);
				var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
				yd = d3.interpolate(y.domain(), [zoomToStart ? 0 : d.y, 1]),
				yr = d3.interpolate(y.range(), [zoomToStart ? 0 : rootRadius, radius]);
			} else {
				y.clamp(false);
				var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
				yd = d3.interpolate(y.domain(), [zoomToStart ? nodes[0].dy : d.y, 1]),
				yr = d3.interpolate(y.range(), [zoomToStart ? 0 : 20, radius]);
			}

			return function(d, i) {
				if (i) {
					return function(t) { return arc(d); };
				} else {
					return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
				}
			};
		}

		// Updates inner label and breadcrumb
		function updateStatisticIndicators(d) {
			if (_value.options.innerLabelStyle === "percentage") {
				var statistic = (100 * d.value / totalSize).toPrecision(3);
				var statisticString = statistic + "%";
				if (statistic < 0.1) {
					statisticString = "< 0.1%";
				}
			} else {
				var statistic = d.value;
				var statisticString = d3.format("s")(statistic);
			}

			// set inner label and breadcrumb
			updateInnerLabel(statisticString);
			updateBreadcrumb(d, statisticString);
		}

		function updateInnerLabel(statisticString) {
			d3.select("#percentage")
			.text(statisticString)
			.each(wrap)

			d3.select("#explanationText")
			.text(_value.options.innerLabelText)
			.each(wrap);
		}

		// Update the breadcrumb trail to show the current sequence and percentage.
		function updateBreadcrumb(d, statisticString) {
			// Get Ancestors
			var nodeArray = [];
			var current = d;
			while (current.parent) {
				nodeArray.unshift(current);
				current = current.parent;
			}

			// Data join; key function combines name and depth (= position in sequence).
			var g = d3.select("#trail")
			.selectAll("g")
			.data(nodeArray, function(d) { return d.name + d.depth; });

			// Add breadcrumb and label for entering nodes.
			var entering = g.enter().append("svg:g");

			entering.append("svg:polygon")
			.attr("points", breadcrumbPoints)
			.attr("fill", function(d) { return _colorMap(d.name); })
			.attr("stroke", function(d) { return d.name === nullNodeName ? "black" : "none"; })
			.on("click", function(d) {
				if (mouseMode == "zoom" && zoomNode != null) {
					zoom(d);
				}
			});

			entering.append("svg:text")
			.attr("x", (b.w + b.t) / 2)
			.attr("y", b.h / 2)
			.attr("width", b.w)
			.attr("dy", "0.35em")
			.attr("text-anchor", "middle")
			.attr("pointer-events", "none")
			.attr("fill", function() {
				var polygonElement = this.previousElementSibling;
				var fill = getComputedStyle(polygonElement).fill;
				var rgb = d3.rgb(fill);
				// brightness formula taken from: https://www.w3.org/TR/AERT#color-contrast
				// brightness range: 0-255
				var brightness = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
				if (brightness <= 127) {
					return "white";
				} else {
					return "black";
				}
			})
			.text(function(d) { return d.name; })
			.each(wrap);

			setBreadcrumbCursor();

			// Set position for entering and updating nodes.
			g.attr("transform", function(d, i) {
				return "translate(" + i * (b.w + b.s) + ", 0)";
			});

			// Remove exiting nodes.
			g.exit().remove();

			// Now move and update the percentage at the end.
			d3.select("#trail").select("#endlabel")
			.attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
			.attr("y", b.h / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", "middle")
			.text(statisticString)
		}

		// Generate a string that describes the points of a breadcrumb polygon.
		function breadcrumbPoints(d, i) {
			var points = [];
			points.push("0,0");
			points.push(b.w + ",0");
			points.push(b.w + b.t + "," + (b.h / 2));
			points.push(b.w + "," + b.h);
			points.push("0," + b.h);
			if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
				points.push(b.t + "," + (b.h / 2));
			}
			return points.join(" ");
		}

		// Show/hide inner label
		function toggleInnerLabel(visible) {
			if (_value.options.innerLabel && _value.options.donutHole) {
				d3.select("#explanation")
				.attr("display", visible ? "inline" : "none");
			}
		}

		// Show/hide inner breadcrumb
		function toggleBreadCrumb(visible) {
			if (_value.options.breadcrumb)  {
				d3.select("#trail")
				.attr("display", visible ? "inline" : "none");
			}
		}

		// Travers through tree and set property of nodes.
		function setPropsForward(start, prop, val) {
			var stack = [start];
			var leafs = [];

			while (stack.length > 0) {
				start = stack.pop();
				if (prop != null && val != null) {
					start[prop] = val;
				}

				if ((start.children == null) || (start.children.length === 0)) {
					leafs.push(start);
				} else {
					for (var i = 0; i < start.children.length; i++) {
						stack.push(start.children[i]);
					}
				}
			}

			return leafs;
		}

		// Travers through tree and set property of nodes.
		function setPropsBackward(start, prop, val) {
			while (start) {
				start[prop] = val;
				start = start.parent;
			}
		}

		function setPropAllNodes(prop, val) {
			for (var i = 0; i < nodes.length; i++) {
				nodes[i][prop] = val;
			}
		}

		function getUniquePathToNode(d) {
			var sequence = [] ;
			var parent = d;
			while (parent != null) {
				sequence.unshift(parent.name);
				parent = parent.parent;
			}
			var path = {sequence: sequence, isLeaf: ((d.children == null) || (d.children.length == 0))};
			return path;
		}

		function getNodeFromPath(path) {
			var current = nodes[0];
			for (var i = 1; i < path.sequence.length-1; i++) {
				current = current.children
				.filter(function(child) { return child.name == path.sequence[i]; })[0];
			}
			var node = current.children
			.filter(function(child) { return child.name == path.sequence[path.sequence.length-1]; })
			.filter(function(child) { return ((child.children == null) || (child.children.length == 0)) == path.isLeaf; })[0];

			return node;
		}

		function initializeBreadcrumbTrail(plottingSurface) {
			// var trail = plottingSurface.append("svg:svg")
			//    .attr("width", width)
			//    .attr("height", 50)
			var trail = plottingSurface.append("svg:g")
			.attr("id", "trail")

			// Add the label at the end, for the percentage.
			trail.append("svg:text")
			.attr("id", "endlabel")
			.attr("fill", "#000");
		}

		function drawLegend(plottingSurface, breadcrumb, breadcrumbHeight) {
			var entries = uniqueLabels.map(function(label) {
				return { key: label, value: _colorMap(label) };
			}); 

			// Dimensions of legend item: width, height, spacing.
			var li = { w: 100, h: 15, s: 6, r: 6 };

			var legend = plottingSurface.append("g")
			.attr("width", li.w)
			.attr("height", entries.length * (li.h + li.s))
			.attr("transform", "translate(" + (width - li.w) + ", " + (breadcrumb * breadcrumbHeight + 10) + ")");

			var g = legend.selectAll("g")
			.data(entries)
			.enter().append("svg:g")
			.attr("transform", function(d, i) {
				return "translate(0," + i * (li.h + li.s) + ")";
			});


			g.append("svg:circle")
			.attr("cx", 0)
			.attr("cy", 0.5 * (li.h - li.r))
			.attr("r", li.r)
			.attr("fill", function(d) { return d.value; });

			g.append("svg:text")
			.attr("x", li.r + 5)
			.attr("y", li.r)
			.attr("width", li.w)
			.attr("font-size", 12)
			.attr("dy", "0.35em")
			.text(function(d) { return d.key; })
			.each(wrap);
		}

		// Wrap text if too long.
		function wrap() {
			var self = d3.select(this),
			textLength = self.node().getComputedTextLength(),
			text = self.text(),
			width = self.attr("width");
			while (textLength+5 > width && text.length > 0) {
				text = text.slice(0, -1);
				self.text(text + '...');
				textLength = self.node().getComputedTextLength();
			}
		} 
	}

	function setBreadcrumbCursor() {
		d3.selectAll("#trail g polygon").style("cursor", mouseMode == 'zoom' ? "pointer" : "default");
	}

	var drawControls = function() {
		if (!knimeService || !_representation.options.enableViewControls) {
			// TODO: error handling?
			return;
		}

		if (_representation.options.displayFullscreenButton) {
			knimeService.allowFullscreen();
		}

		knimeService.addNavSpacer();


		// Reset controls.
		if (_representation.options.zoomable) {
			knimeService.addButton('zoom-reset-button', 'search-minus', 'Reset Zoom', function() {
				resetZoom();
			});
		}
		if (_representation.options.selection) {
			knimeService.addButton('selection-reset-button', 'minus-square-o', 'Reset Selection', function() {
				clearSelection();
				if (_value.options.showSelectedOnly) {
					transformData();
					drawChart();
				}
			});
		}
		if (_representation.options.highliting) {
			knimeService.addButton('highlite-reset-button', 'star-o', 'Reset Focus', function() {
				clearHighliting();
			});
		}

		knimeService.addNavSpacer();

		if (mouseMode == null) {
			mouseMode = "highlite";
		}

		function toggleButton() {
			var targetID = "mouse-mode-" + mouseMode;
			d3.selectAll("#knime-service-header .service-button")
			.classed("active", function() {
				return targetID == this.getAttribute("id");
			});
			setBreadcrumbCursor();
		}

		// mouse mode controls.
		if (_representation.options.zoomable) {
			knimeService.addButton('mouse-mode-zoom', 'search', 'Mouse Mode "Zoom"', function() {
				mouseMode = "zoom";
				toggleButton();
			});
		}
		if (_representation.options.selection) {
			knimeService.addButton('mouse-mode-select', 'check-square-o', 'Mouse Mode "Select"', function() {
				mouseMode = "select";
				toggleButton();
			});
		}
		if (_representation.options.highliting) {
			knimeService.addButton('mouse-mode-highlite', 'star', 'Mouse Mode "Focus"', function() {
				mouseMode = "highlite";
				toggleButton();
			});
		}
		toggleButton();

		// Title / Subtitle configuration
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

		// Filter-small-nodes configuration
		var filterSmallNodesToggle = _representation.options.filterSmallNodesToggle;
		if (filterSmallNodesToggle) {
			knimeService.addMenuDivider();

			var filterSmallCheckbox = knimeService.createMenuCheckbox(
					'filterSmallNodesCheckbox', _value.options.filterSmallNodes, function() {
						_value.options.filterSmallNodes = this.checked;
						drawChart();
					});
			knimeService.addMenuItem('Filter out small nodes:', 'search', filterSmallCheckbox);
		}

		// Legend / Breacdcrumb
		var legendToggle = _representation.options.legendToggle;
		var breadcrumbToggle = _representation.options.breadcrumbToggle;
		if (legendToggle || breadcrumbToggle) {
			knimeService.addMenuDivider();

			if (legendToggle) {
				var legendCheckbox = knimeService.createMenuCheckbox(
						'legendCheckbox', _value.options.legend,
						function() {
							_value.options.legend = this.checked;
							drawChart();
						});
				knimeService.addMenuItem('Legend:', 'info-circle', legendCheckbox);
			}

			if (breadcrumbToggle) {
				var breadcrumbCheckbox = knimeService.createMenuCheckbox(
						'breadcrumbCheckbox', _value.options.breadcrumb,
						function() {
							_value.options.breadcrumb = this.checked;
							drawChart();
							if (this.checked && highlitedPath != null) {
								toggleBreadCrumb(true);
							}
						});

				knimeService.addMenuItem('Breadcrumb:', 'ellipsis-h', breadcrumbCheckbox);
			}
		}

		// Donut hole configuration
		var donutHoleToggle = _representation.options.donutHoleToggle;
		if (donutHoleToggle) {
			knimeService.addMenuDivider();

			var donutHoleCheckbox = knimeService.createMenuCheckbox(
					'donutHoleCheckbox', _value.options.donutHole, function() {
						_value.options.donutHole = this.checked;
						drawChart();
					});
			knimeService.addMenuItem('Donut hole:', 'search', donutHoleCheckbox);
		}

		// Inner label configuration
		var innerLabelToggle = _representation.options.innerLabelToggle;
		var innerLabelStyleSelect = _representation.options.innerLabelStyleSelect;
		var enableInnerLabelEdit = _representation.options.enableInnerLabelEdit;
		if (innerLabelToggle || innerLabelStyleSelect || enableInnerLabelEdit) {
			knimeService.addMenuDivider();

			if (innerLabelToggle) {
				var innerLabelCheckbox = knimeService.createMenuCheckbox(
						'innerLabelCheckbox', _value.options.innerLabel,
						function() {
							_value.options.innerLabel = this.checked;
							toggleInnerLabel(true);
						});
				knimeService.addMenuItem('Inner Label:', 'dot-circle-o', innerLabelCheckbox);
			}

			if (innerLabelStyleSelect) {
				var innerLabelStyleSelector =
					knimeService.createMenuSelect('innerLabelStyleSelector', _value.options.innerLabelStyle, innerLabelStyles, function() {
						_value.options.innerLabelStyle = this.options[this.selectedIndex].value;
						drawChart();
					});
				knimeService.addMenuItem('Inner Label Style:', 'percent', innerLabelStyleSelector);
			}

			if (enableInnerLabelEdit) {
				var innerLabelText = knimeService.createMenuTextField(
						'innerLabelText', _value.options.innerLabelText, function() {
							_value.options.innerLabelText = this.value;
							drawChart();
						}, true);
				knimeService.addMenuItem('Inner Label Text:', 'header', innerLabelText);
			}
		}

		// show selection only
		if (_representation.options.selection && _representation.options.showSelectedOnlyToggle) {
			knimeService.addMenuDivider();
			var showSelectedOnlyCheckbox = knimeService.createMenuCheckbox('showSelectedOnlyCheckbox', _value.options.showSelectedOnly, function() {
				_value.options.showSelectedOnly = this.checked;
				if (this.checked) {
					highlitedPath = null;
				}
				transformData();
				drawChart();
			});
			knimeService.addMenuItem('Show selected rows only', 'filter', showSelectedOnlyCheckbox);
		}

		if (knimeService.isInteractivityAvailable()) {
			// Selection / Filter configuration
			var publishSelectionToggle = _representation.options.publishSelectionToggle;
			var subscribeSelectionToggle = _representation.options.subscribeSelectionToggle;
			var subscribeFilterToggle = _representation.options.subscribeFilterToggle;
			if (publishSelectionToggle || subscribeSelectionToggle || subscribeFilterToggle) {
				knimeService.addMenuDivider();

				if (publishSelectionToggle) {
					var pubSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-right', 'faded left sm', 'right bold');
					var pubSelCheckbox = knimeService.createMenuCheckbox('publishSelectionCheckbox', _value.options.publishSelection, function() {
						if (this.checked) {
							_value.options.publishSelection = true;
						} else {
							_value.options.publishSelection = false;
						}
					});

					knimeService.addMenuItem('Publish selection', pubSelIcon, pubSelCheckbox);
				}

				if (subscribeSelectionToggle) {
					var subSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-double-right', 'faded right sm', 'left bold');
					var subSelCheckbox = knimeService.createMenuCheckbox('subscribeSelectionCheckbox', _value.options.subscribeSelection, function() {
						if (this.checked) {
							_value.options.subscribeSelection = true;
							knimeService.subscribeToSelection(knimeTable1.getTableId(), selectionChanged);
						} else {
							_value.options.subscribeSelection = false;
							knimeService.unsubscribeSelection(knimeTable1.getTableId(), selectionChanged);
						}
					});
					knimeService.addMenuItem('Subscribe to selection', subSelIcon, subSelCheckbox);
				}

				if (subscribeFilterToggle) {
					var subFilIcon = knimeService.createStackedIcon('filter', 'angle-double-right', 'faded right sm', 'left bold');
					var subFilCheckbox = knimeService.createMenuCheckbox('subscribeFilterCheckbox', _value.options.subscribeFilter, function() {
						_value.options.subscribeSelection = this.checked;
						toggleFilter();
					});
					knimeService.addMenuItem('Subscribe to filter', subFilIcon, subFilCheckbox);
				}
			}
		}
	}

	var selectionChanged = function(data) {
		if (data.changeSet) {
			if (data.changeSet.removed) {
				for (var i = 0; i < data.changeSet.removed.length; i++) {
					var removedKey = data.changeSet.removed[i];
					var parent = rowKey2leaf[removedKey];
					while (parent != null) {
						parent.selected = false;
						parent = parent.parent;
					}
					var index = selectedRows.indexOf(removedKey);
					if (index > -1) {
						selectedRows.splice(index, 1);
					}           
				}
			}
			if (data.changeSet.added) {
				for (var i = 0; i < data.changeSet.added.length; i++) {
					var addedKey = data.changeSet.added[i];
					var leaf = rowKey2leaf[addedKey];
					addNodeToSelectionBackward(leaf);
					var index = selectedRows.indexOf(addedKey);
					if (index == -1) {
						selectedRows.push(addedKey);
					}           
				}
			}
		} else if (data.reevaluate) {
			selectedRows = knimeService.getAllRowsForSelection(knimeTable1.getTableId());
			setPropAllNodes("selected", false);
			for (var i = 0; i < selectedRows.length; i++) {
				var leaf = rowKey2leaf[rowKey];
				addNodeToSelectionBackward(leaf);
			}
		}

		if (_value.options.showSelectedOnly) {
			highlitedPath = null;
			transformData();
			drawChart();
		}
		renderSelection();
	};

	var toggleFilter = function() {
		if (_value.options.subscribeFilter) {
			knimeService.subscribeToFilter(
					knimeTable1.getTableId(), filterChanged, knimeTable1.getFilterIds()
			);
		} else {
			knimeService.unsubscribeFilter(knimeTable1.getTableId(), filterChanged);
		}
	};

	var filterChanged = function(filter) {
		currentFilter = filter;
		highlitedPath = null;
		transformData();
		drawChart();
	};

	var resize = function(event) {
		drawChart();
	};

	var outputSelectionColumn = function() {
		if (_representation.options.selection) {
			_value.outColumns.selection = {};
			// set selected = false for every row
			knimeTable1.getRows().forEach(function(row) {
				_value.outColumns.selection[row.rowKey] = false;
			});
			// set selected = true for every selected row
			selectedRows.forEach(function(rowKey) {
				_value.outColumns.selection[rowKey] = true;
			});
		}
	};

	view.validate = function() {
		return true;
	};

	view.getComponentValue = function() {
		if (selectionChangedFlag) {
			outputSelectionColumn();
		}

		// Save mousemode unless it is default mode.
		_value.options.mouseMode = mouseMode;
		if (_value.options.mouseMode == "highlite") {
			delete _value.options.mouseMode;
		}
		_value.options.selectedRows = selectedRows;
		if (_value.options.selectedRows.length == 0) {
			delete _value.options.selectedRows;
		}
		_value.options.highlitedPath = highlitedPath;
		if (_value.options.highlitedPath == null) {
			delete _value.options.highlitedPath;
		}

		return _value;
	};

	view.getSVG = function() {
		var svgElement = d3.select("svg")[0][0];
		// Return the SVG as a string.
		return (new XMLSerializer()).serializeToString(svgElement);
	};

	return view;
}());
