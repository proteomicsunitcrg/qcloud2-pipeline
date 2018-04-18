
(parallelcoords_namespace = function() {
    var input = {};
    var _data;
    var layoutContainer;
    var MIN_HEIGHT = 300, MIN_WIDTH = 400;
    var MISSING_VALUE_MODE = "Show\u00A0missing\u00A0values";
    
    var _representation, _value;
    var mzd, w, h, plotG, bottomBar, scales;
    var scaleCols, extents;
    var brushes = {};
    var xBrush, xExtent;
    var draggingNow = false;
    var dragging = {};
    var line;
    var rowsSelected = false;
    var colors;
    var sortedCols = [];
    var oldHeight,oldWidth, ordinalScale, xBrushScale;
    var filterIds = [];
    var currentFilter = null;
    
    input.init = function(representation, value) {  
        _value = value;
        _representation = representation;
        //alert(JSON.stringify(_value.options.selectedrows));
        
        d3.select("html").style("width", "100%").style("height", "100%");
        d3.select("body").style("width", "100%").style("height", "100%").style("margin", "0").style("padding", "0");
        
        var body = d3.select("body");
        
        _data = createData(representation);
        // initially included columns
        sortedCols =_data.colNames;

        layoutContainer = body.append("div").attr("id", "layoutContainer")
                .style("min-width", MIN_WIDTH + "px");

        if (_representation.options.svg.fullscreen && _representation.runningInView) {
            layoutContainer.style("width", "100%")
            .style("height", "100%");
        } else {
            layoutContainer.style("width", _representation.options.svg.width + "px")
            .style("height", _representation.options.svg.height + "px");
        }

        createControls();

        var div = layoutContainer.append("div")
            .attr("id", "svgContainer")
            .style("min-width", MIN_WIDTH + "px")
            .style("min-height", MIN_HEIGHT + "px")
            .style("box-sizing", "border-box")
            .style("overflow", "hidden")
            .style("margin", "0");

        var svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        div[0][0].appendChild(svg1);

        var d3svg = d3.select("svg").style("font-family", "sans-serif");
        d3svg.append("rect").attr("id", "bgr").attr("fill", _representation.options.backgroundColor);

        var plotG = d3svg.append("g").attr("id", "plotG");
        plotG.append("rect").attr("id", "da").attr("fill", _representation.options.daColor);
        
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
        
        plotG.append("line")
        	.attr("stroke", "rgba(0,0,0,0.5)")
        	.attr("stroke-width", "2")
        	.attr("id", "yMarker")
        	.attr("visibility", "hidden");

        drawChart(); 
        
        // draw saved brushes
        if (_representation.options.enableSelection && _representation.options.enableBrushing){
        	drawSavedBrushes();
        }
        // select saved (selected) rows
        if (_representation.options.enableSelection && _representation.options.enableBrushing && !_value.options.selections){
        	selectRows();
        }
        if (_representation.options.enableSelection && _value.options.selectedrows){
        	selectRows();
        }
        checkClearSelectionButton();
        saveSelected();
    };
    
    function sortArray(sorted, toInclude){
		var array = [];
		for (i = 0; i < sorted.length; i++){
			for (j = 0; j < toInclude.length; j++){
				if (sorted[i] == toInclude[j]){
					array.push(sorted[i]);
				} 
			}
		}
		return array;
	};
	
	function filterColumns(cols){
		var includedColumns = [];
		for (var col = 0; col < cols.length; col++){
			var idx = getDataColumnID(cols[col], _representation.inObjects[0]);
			if (_representation.inObjects[0].spec.colTypes[idx] === "string" || _representation.inObjects[0].spec.colTypes[idx] === "number" 
				|| _representation.inObjects[0].spec.colTypes[idx] === "dateTime"){
				includedColumns.push(cols[col]);
			}
		}
		return includedColumns;
	}

    function createData(representation) {
    	var data = { objects : [], colNames : [], colTypes : {}, domains : {}, minmax : {} };
    	var table = representation.inObjects[0];
    	
    	filterIds = [];
    	for (var i = 0; i < table.spec.filterIds.length; i++) {
    		if (table.spec.filterIds[i]) {
    			filterIds.push(table.spec.filterIds[i]);
    		}
    	}
    	if (filterIds.length < 1) {
    		filterIds = null;
    	}

    	var catColIdx = getDataColumnID(_representation.options.catCol, table);
    	var indices = {};

    	var columnNames;
    	if (_representation.options.enableAxesSwapping && _value.options.sortedCols 
    			&& _value.options.sortedCols.length > 0 && !_value.options.columns) {
    		columnNames = _value.options.sortedCols;
    	}
    	if (_representation.options.enableAxesSwapping && _value.options.sortedCols 
    			&& _value.options.sortedCols.length > 0 && _value.options.columns) {
    		if (_value.options.sortedCols.length < _value.options.columns.length){
        		columnNames = sortArray(sortedCols, _value.options.columns);
        	} else {
        		columnNames = sortArray(_value.options.sortedCols, _value.options.columns);
        		//sortedCols[_value.options.sortedCols.length] = _value.options.sortedCols;
        	}
    		/*if (_value.options.sortedCols.length == _data.colNames.length){
    			sortedCols =_value.options.sortedCols;
    		}*/
    	} else {
    		columnNames = filterColumns(_value.options.columns);	
    	};
    	
    	for (var col = 0; col < columnNames.length; col++) {
    		var columnName;
        	columnName = columnNames[col];
    		data.colNames.push(columnName);
    		var idx = getDataColumnID(columnName, table);
    		indices[columnName] = idx;
    		data.colTypes[columnName] = table.spec.colTypes[idx];
    		if (table.spec.colTypes[idx] === "string") {
    			data.domains[columnName] = d3.set();
    		} else {
    			data.minmax[columnName] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    		}
    	}

    	if (catColIdx != null) {
    		data.domains[_representation.options.catCol] = d3.set();
    	}
	    for (var r = 0; r < table.rows.length; r++) {
			var row = table.rows[r].data;
			var obj = {};
			for (var col = 0; col < _value.options.columns.length; col++) {
				obj[_value.options.columns[col]] = row[indices[_value.options.columns[col]]];
				if(obj[_value.options.columns[col]]===null) {
					obj.containsMissing = true;
				};
			}
			if (_representation.options.useColors) {
				obj.color = table.spec.rowColorValues[r];
			} else if (catColIdx) {
				obj.color = row[catColIdx];
			}
	
			for (var key in data.domains) {
				var val = row[indices[key]];
				if (val != null) {
					data.domains[key].add(val);
				}
			}
			for(var key in data.minmax) {
				var val = row[indices[key]];
				if (val != null) {
					data.minmax[key][0] = Math.min(data.minmax[key][0], val);
					data.minmax[key][1] = Math.max(data.minmax[key][1], val);
				}
			}
			obj.id = table.rows[r].rowKey; 
			data.objects.push(obj);
		}

    	return data;
    };
    
    function isSorted(cols) {
        for (i = 1; i < cols.length; i++) {
            if (position(cols[i]) < position(cols[i-1])) return false;
        }
        return true;
    };

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

    function createControls() {
    	
    	if (!knimeService) {
			// TODO: error handling?
			return;
		}
		
    	// -- Buttons --
		if (_representation.options.displayFullscreenButton) {
			knimeService.allowFullscreen();
		}
		
		if (_representation.options.displayClearSelectionButton &&  _representation.options.enableSelection) {
			knimeService.addButton("clearSelectionButton", "minus-square-o", "Clear selection", function(){
				d3.selectAll(".row").classed({"selected": false, "unselected": false });
				clearBrushes();
				publishCurrentSelection();
			});
			d3.select("#clearSelectionButton").classed("inactive", true);
		}
		
		// -- Initial interactivity settings --
        if (knimeService.isInteractivityAvailable()) {
        	if (_representation.options.enableSelection && _value.options.subscribeSelection) {
        		knimeService.subscribeToSelection(_representation.inObjects[0].id, selectionChanged);
			}
        	if (filterIds && _value.options.subscribeFilter) {
				knimeService.subscribeToFilter(_representation.inObjects[0].id, filterChanged, filterIds);
			}
        }
		
        // -- Menu Items --
		if (!_representation.options.enableViewControls) {
			return;
		}
		
		if (_representation.options.enableTitleEdit) {
			var plotTitleText = knimeService.createMenuTextField('plotTitleText', _value.options.title, function() {
				var hadTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
				_value.options.title = this.value;
				var hasTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
				d3.select("#title").text(this.value);
				if (hasTitles != hadTitles) {
					drawChart(true);
					applyFilter();
				}}, true);
			knimeService.addMenuItem('Plot Title:', 'header', plotTitleText);
		};

		if (_representation.options.enableSubtitleEdit) {
			var plotSubtitleText = knimeService.createMenuTextField('plotSubtitleText', _value.options.subtitle, function() {
				var hadTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
				_value.options.subtitle = this.value;
				var hasTitles = (_value.options.title.length > 0) || (_value.options.subtitle.length > 0);
				d3.select("#subtitle").text(this.value);
				if (hasTitles != hadTitles) {
					drawChart(true);
					applyFilter();
				}
			}, true);
			knimeService.addMenuItem('Plot Subtitle:', 'header', plotSubtitleText, null, knimeService.SMALL_ICON);
		}
		if (_representation.options.enableTitleEdit || _representation.options.enableSubtitleEdit 
				|| _representation.options.enableMValuesHandling && containMissing()) {
			knimeService.addMenuDivider();
		}
		if (_representation.options.enableMValuesHandling && containMissing()) {


			var missingMenuSelect = knimeService.createMenuSelect('missingMenuSelect','Skip\u00A0rows\u00A0with\u00A0missing\u00A0values', ['Skip\u00A0rows\u00A0with\u00A0missing\u00A0values','Skip\u00A0missing\u00A0values',MISSING_VALUE_MODE], function() {
				_value.options.mValues = this.value;
				if (this.value == 'Skip\u00A0rows\u00A0with\u00A0missing\u00A0values'){
					if (_representation.options.enableSelection && _representation.options.enableBrushing 
							&& noBrushes() && !d3.selectAll(".row.selected").empty() ) {
						saveSelectedRows();
					}
					if (_representation.options.enableSelection && !_representation.options.enableBrushing 
							&& !d3.selectAll(".row.selected").empty()) {
						saveSelectedRows();
					}
					if (_representation.options.enableSelection &&_representation.options.enableBrushing && brushes && !rowsSelected){
						getExtents();
					};
					drawChart();
					if (_representation.options.enableSelection && _representation.options.enableBrushing && brushes && !rowsSelected){
						drawBrushes();
						brush();
					};
					applyFilter();
				}
				if (this.value == 'Skip\u00A0missing\u00A0values'){
					if (_representation.options.enableSelection && _representation.options.enableBrushing 
							&& noBrushes() && !d3.selectAll(".row.selected").empty() ) {
						saveSelectedRows();
					}
					if (_representation.options.enableSelection && !_representation.options.enableBrushing 
							&& !d3.selectAll(".row.selected").empty()) {
						saveSelectedRows();
					}
					if (_representation.options.enableSelection &&_representation.options.enableBrushing && brushes && !rowsSelected){
						getExtents();
					};
					drawChart();
					if (_representation.options.enableSelection && _representation.options.enableBrushing && brushes && !rowsSelected){
						drawBrushes();
						brush();
					};
					extraRows();
					applyFilter();
				}
				if (this.value == MISSING_VALUE_MODE){
					if (_representation.options.enableSelection && _representation.options.enableBrushing 
							&& noBrushes() && !d3.selectAll(".row.selected").empty()) {
						saveSelectedRows();
					}

					if (_representation.options.enableSelection && !_representation.options.enableBrushing 
							&& !d3.selectAll(".row.selected").empty()) {
						saveSelectedRows();
					}

					if (_representation.options.enableSelection &&_representation.options.enableBrushing && brushes && !rowsSelected){
						getExtents();
					};
					drawChart();
					if (_representation.options.enableSelection && _representation.options.enableBrushing && brushes && !rowsSelected){
						drawBrushes();
						brush();
					};
					extraRows();
					applyFilter();
				}
			});
			knimeService.addMenuItem('Missing values:', 'braille', missingMenuSelect);
		}

		if ((_representation.options.enableTitleEdit || _representation.options.enableSubtitleEdit) 
				&& _representation.options.enableMValuesHandling && containMissing()) {
			knimeService.addMenuDivider();
		}

		if (_representation.options.enableLineChange) {
			var lineTypeRadio = knimeService.createInlineMenuRadioButtons('lineType', 'lineType', 
					_value.options.lType, ["Straight", "Curved"], function() {
				_value.options.lType = this.value;
				if (_representation.options.enableSelection && _representation.options.enableBrushing 
						&& noBrushes() && !d3.selectAll(".row.selected").empty() ) {
					saveSelectedRows();
				}
				if (_representation.options.enableSelection && !_representation.options.enableBrushing 
						&& !d3.selectAll(".row.selected").empty()) {
					saveSelectedRows();
				}
				if (_representation.options.enableSelection &&_representation.options.enableBrushing && brushes && !rowsSelected){
					getExtents();
				};
				drawChart();
				if (_representation.options.enableSelection && _representation.options.enableBrushing && brushes && !rowsSelected){
					drawBrushes();
					brush();
				};
				applyFilter();
			});
			knimeService.addMenuItem('Line type:', 'bars', lineTypeRadio);

			var lineThicknessSpin = knimeService.createMenuNumberField("lineThickness", _value.options.lThickness, 0.1, 100, 0.1, function(){
				_value.options.lThickness = Number(this.value);
				d3.selectAll(".row").attr("stroke-width", this.value);
			}, true);
			knimeService.addMenuItem('Line thickness:', 'minus', lineThicknessSpin);
		}
            
         // temporarily use controlContainer to solve th resizing problem with ySelect
            if (_representation.options.enableColumnSelection){
	            var layoutContainer = "layoutContainer";
	            var containerID = "plotContainer";
	            var defaultFont = "sans-serif";
	            var defaultFontSize = 12;
		    	var controlContainer = d3.select("#"+layoutContainer).insert("table", "#" + containerID + " ~ *")
		    	.attr("id", "plotControls")
		    	.style("width", "100%")
		    	.style("padding", "10px")
		    	.style("margin", "0 auto")
		    	.style("box-sizing", "border-box")
		    	.style("font-family", defaultFont)
		    	.style("font-size", defaultFontSize+"px")
		    	.style("border-spacing", 0)
		    	.style("border-collapse", "collapse");			   	
	
		    	var columnChangeContainer = controlContainer.append("tr");		   	
		    	var ySelect = new twinlistMultipleSelections();	
		    	var ySelectComponent = ySelect.getComponent().get(0);
		    	columnChangeContainer.append("td").attr("colspan", "3").node().appendChild(ySelectComponent);
		    	ySelect.setChoices(filterColumns(_value.options.columns));
		    	ySelect.setSelections(filterColumns(_value.options.columns));
		    	ySelect.addValueChangedListener(function() {
		    		_value.options.columns = ySelect.getSelections();
		    		saveSettingsToValue();
		    		_data = createData(_representation);
		    		drawChart();
		    		applyFilter();
		    		if (_representation.options.enableSelection && _representation.options.enableBrushing){
		            	drawSavedBrushes();
		            }
		            // select saved (selected) rows
		            if (_representation.options.enableSelection && _representation.options.enableBrushing && !_value.options.selections){
		            	selectRows();
		            }
		            if (_representation.options.enableSelection && _value.options.selectedrows){
		            	selectRows();
		            }
		    	});
		    	
		    	knimeService.addMenuItem('Axes:', 'long-arrow-up', ySelectComponent);
		    	ySelectComponent.style.fontFamily = defaultFont;				
		    	ySelectComponent.style.fontSize = defaultFontSize + 'px';				
		    	ySelectComponent.style.margin = '0';
		    	ySelectComponent.style.outlineOffset = '-3px';
		    	ySelectComponent.style.width = '';
		    	ySelectComponent.style.height = '';
		    	controlContainer.remove();
	        }
        
        if ((_representation.options.enableTitleEdit || _representation.options.enableSubtitleEdit) 
        		|| (_representation.options.enableMValuesHandling && containMissing()) || _representation.options.enableLineChange 
        		&& knimeService.isInteractivityAvailable() && _representation.options.enableSelection) {
        	knimeService.addMenuDivider();
        }
        
        if (knimeService.isInteractivityAvailable()) {
			if (_representation.options.enableSelection) {
				var pubSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-right', 'faded left sm', 'right bold');
				var pubSelCheckbox = knimeService.createMenuCheckbox('publishSelectionCheckbox', _value.options.publishSelection, function() {
					if (this.checked) {
						_value.options.publishSelection = true;
						publishCurrentSelection();
					} else {
						_value.publishSelection = false;
					}
				});
				knimeService.addMenuItem('Publish selection', pubSelIcon, pubSelCheckbox);
				var subSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-double-right', 'faded right sm', 'left bold');
				var subSelCheckbox = knimeService.createMenuCheckbox('subscribeSelectionCheckbox', _value.options.subscribeSelection, function() {
					if (this.checked) {
						knimeService.subscribeToSelection(_representation.inObjects[0].id, selectionChanged);
					} else {
						knimeService.unsubscribeSelection(_representation.inObjects[0].id, selectionChanged);
					}
				});
				knimeService.addMenuItem('Subscribe to selection', subSelIcon, subSelCheckbox);
			}
        }
        
        if (filterIds) {//.length > 0
			if (_representation.enableSelection) {
				knimeService.addMenuDivider();
			}
			var subFilIcon = knimeService.createStackedIcon('filter', 'angle-double-right', 'faded right sm', 'left bold');
			var subFilCheckbox = knimeService.createMenuCheckbox('subscribeFilterCheckbox', _value.options.subscribeFilter, function() {
				if (this.checked) {
					knimeService.subscribeToFilter(_representation.inObjects[0].id, filterChanged, filterIds);
				} else {
					knimeService.unsubscribeFilter(_representation.inObjects[0].id, filterChanged);
				}
			});
			knimeService.addMenuItem('Subscribe to filter', subFilIcon, subFilCheckbox);
		}
    };
    
    function filterChanged(data){
    	currentFilter = data;
    	applyFilter(true);
    };
    
    function applyFilter(clear){
    	if (currentFilter){
    		d3.selectAll(".row").each(function(d){
    			d3.select(this).classed("filtered", !isRowIncludedInFilter(d.id));
    		});
    		if (clear) {
    			clearBrushes();
    		}
    	};
    };
    
    
    publishCurrentSelection = function() {
		if (knimeService && knimeService.isInteractivityAvailable() && _value.options.publishSelection) {
			var selArray = [];
	    	// set to true selected
	    	d3.selectAll(".row").filter(".selected").each(function (row){
	    		selArray.push(row.id);
	    	});
			knimeService.setSelectedRows(_representation.inObjects[0].id, selArray, selectionChanged);
		}
		checkClearSelectionButton();
	};
	
	function checkClearSelectionButton(){
		var button = d3.select("#clearSelectionButton");
		if (!button.empty()){
			button.classed("inactive", function(){return d3.select(".row.selected").empty()});
		}
	}
	
	selectionChanged = function(data) {
		clearBrushes();
		if (data.changeSet) {
			if (data.changeSet.removed) {
				for (var i = 0; i < data.changeSet.removed.length; i++) {
					var removedId = data.changeSet.removed[i];
					var row = d3.select("#"+ removedId);
					if (!row.empty() && !row.classed("filtered")) {
						row.classed({"unselected": true, "selected": false});
					}
				}
				if (d3.selectAll(".selected").empty()){
    				d3.selectAll(".row").classed("unselected", false);
    				rowsSelected = false;
    			}
			}
			if (data.changeSet.added) {
				for (var i = 0; i < data.changeSet.added.length; i++) {
					var addedId = data.changeSet.added[i];
					var row = d3.select("#"+ addedId);
					if (!row.empty() && !row.classed("filtered")) {
						if (d3.selectAll(".selected").empty()) {
							d3.selectAll(".row").classed("unselected", true);
						}
						row.classed({"selected": true, "unselected": false});
					}
				}
			}
			saveSelectedRows();
		} 
		checkClearSelectionButton();
	};

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
        
        var mTop = (_value.options.subtitle || _value.options.title) ? 80 : 30;

        colors = _representation.options.catCol ?
        				d3.scale.category10().domain(_data.domains[_representation.options.catCol].values())
        				: null;

        var maxLength = 0;
        
        d3.select(".legend").remove();
        if (_representation.options.catCol && _representation.options.showLegend && !_representation.options.useColors) {
	        var legendG = d3svg.append("g").attr("class", "legend");
	        var maxLength = 0;
	        var catValues = _data.domains[_representation.options.catCol].values();
	        for (var i = 0; i < catValues.length; i++) {
	        	var cat = catValues[i];
	        	var txt = legendG.append("text").attr("x", 20).attr("y", i * 23).text(cat);
	        	maxLength = Math.max(maxLength, txt.node().getComputedTextLength());
	        	legendG.append("circle").attr("cx", 5).attr("cy", i * 23 - 4).attr("r", 5)
	        	.attr("fill", colors(cat));
	        }
	        maxLength += 35;
	        legendG.attr("transform", "translate(" + (parseInt(d3svg.style('width')) - maxLength) + "," + (mTop + 20) + ")");
        }
        
        var bottomMargin;
        _value.options.mValues == MISSING_VALUE_MODE && containMissing() ? bottomMargin = 60 : bottomMargin = 30;

        var margin = {top : mTop, left : 40, bottom : bottomMargin, right : 10 + maxLength};

        plotG = d3svg.select("#plotG")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        w = Math.max(50, parseInt(d3svg.style('width')) - margin.left - margin.right);
        h = Math.max(50, parseInt(d3svg.style('height')) - margin.top - margin.bottom);

        plotG.select("#da").attr({y : -10, width : w, height : h + 45});
        d3svg.select("#bgr").attr({width : w + margin.left + margin.right, height : h + margin.top + margin.bottom});

        scaleCols = d3.scale.ordinal().domain(_data.colNames).rangePoints([0, w], 0.5);

        scales = {};
        
        for (var c = 0; c < _data.colNames.length; c++) {
        	var colName = _data.colNames[c];
        	var scale;
        	if (_data.colTypes[colName] === "number" || _data.colTypes[colName] === "dateTime") {
        		scale = d3.scale.linear().range([h, 0]).domain(_data.minmax[colName]).nice();
        	} else {
        		scale = d3.scale.ordinal().domain(_data.domains[colName].values()).rangePoints([h, 0], 1.0);
        	}
        	scales[colName] = scale;
        } 

        mzd = _data.objects;
        
        plotG.selectAll("text, path, .axis, .xAxis").remove();
        
     // create an additional axis for the missing values selection
       if (_representation.options.enableMValuesHandling 
        		&& _representation.options.enableViewControls 
        		&& _representation.runningInView) {
        	if (_value.options.mValues == MISSING_VALUE_MODE && _representation.options.enableSelection 
        			&& _representation.options.enableBrushing && containMissing()){
        		createXAxis();
	        };
        };   
        
        var g;
        g = plotG.selectAll("g.axis")
        .data(_data.colNames, function(d) { return d; })
        .enter().append("g").attr("class", "axis").attr("id", function(d){return d;}).style("font-weight", "bold")
        .attr("transform", function(d) { return "translate(" + scaleCols(d) + ",0)"; })
    	.each(function(d) {
        	var scale = scales[d];
        	var axis = d3.svg.axis()
            .scale(scale).orient("left");       	
        	d3.select(this).call(axis);
        })
        .each(function(d, i) {
	        	d3.select(this).append("text").datum(_data.colNames[i])
	        	.attr("class", "label").attr("text-anchor", "middle")
	        	.attr("transform", function(d) { return "translate(0," + (-15) + ")"; })// h + 40
	        	.attr("text-anchor", "middle")
	        	.text(function(d) { return d; });
	        });
        
        if (_representation.options.enableAxesSwapping){
	        g.call(d3.behavior.drag()
	        		.origin(function(d) { 
	        			return {x: scaleCols(d)}; 
	        			})
	        		.on("dragstart", function(d) {
	        			dragging[d] = scaleCols(d);
	        			draggingNow = true;
	        		 })
	        .on("drag", function(d) {
	        	if (draggingNow) {
		          dragging[d] = Math.min(w, Math.max(0, d3.event.x));
		          _data.colNames.sort(function(a, b) { return position(a) - position(b); });
		          scaleCols.domain(_data.colNames);
		          d3.selectAll(".row").attr("d", path);
		          g.attr("transform", function(d) { return "translate(" + position(d) + ",0)"; });
	        	};
	        })
	        .on("dragend", function(d) {	
	          delete dragging[d];
	          draggingNow = false;
	          transition(d3.select(this)).attr("transform", "translate(" + scaleCols(d) + ")");
	          transition(d3.selectAll(".row")).attr("d", path); 
	          if (_value.options.mValues == MISSING_VALUE_MODE && containMissing()){
	        	  if (!xBrush.empty()) {
		        		xBrush.extent(xBrush.extent());
		        		d3.select(".xBrush").call(xBrush);
		        		brush();
	        	  }
	        	};
	        }));
	        d3.selectAll(".label").style("cursor", "move");
	        if (_data.colNames.length == sortedCols.length){
	        	sortedCols = _data.colNames;
	        };
	        
        };
        d3.selectAll(".axis path").attr("stroke-width", 1).attr("stroke", "black").attr("fill", "none");
        
        // brush - rows selection
        if (_representation.options.enableSelection && _representation.options.enableBrushing) {
        g.append("g")
	      .attr("class", "brush")
	      .each(function(d,i) { 
	    	  d3.select(this).call(brushes[d] = d3.svg.brush().y(scales[d]).on("brush", brush).on("brushend", publishCurrentSelection).on("brushstart", brushstart)); 
	    	  d3.select(this).attr("id", i);
	    	  })
	      .selectAll("rect")
	      .attr("x", -8)
	      .attr("width", 16)
	      .attr("fill-opacity", "0.2")
	      .attr("stroke", "#fff")
	      .attr("shape-rendering","crispEdges");
        };

        function transition(g) {
    	  return g.transition().duration(500);
    	};
        
        function path(d) {
        	return getLine(d);
        };
        
        //representation.options.enableViewControls
		//&& _representation.runningInView_

        if (_representation.options.enableMValuesHandling && containMissing()) {
        	bottomBar = (_value.options.mValues == MISSING_VALUE_MODE);
        }

	    if (bottomBar) {
        	plotG.append("text")
            .attr("id", "missingVtitle")
            .attr("font-size", 12)
            .attr("x", -30)
            .attr("y", h + 38)
            .style("font-weight", "bold")
            .text("Miss.values");
	    };
	    
	    line = d3.svg.line()
        .x(function(d, i) { 
        	return position(_data.colNames[i]);})
        .y(function(d, i) {
        	if (bottomBar && d === null) {
	        	return h + 40;
        	}else if (d === null){
        		return h;
        	}
        	return scales[_data.colNames[i]](d);
        });
        
        // Skipping missing cells
        if (_representation.options.enableMValuesHandling 
        		&& _representation.options.enableViewControls 
        		&& _representation.runningInView) {
        	if (_value.options.mValues == "Skip\u00A0missing\u00A0values" ){
	        	line.defined(function(d) {
	                	return d != null;
	            });
	        };
        };
        
        if (_representation.options.enableMValuesHandling 
        		&& _representation.options.enableViewControls 
        		&& _representation.runningInView) {
        	if (_value.options.mValues == "Skip\u00A0rows\u00A0with\u00A0missing\u00A0values"){
	        	mzd = mzd.filter(function(d) {
	        		return !d.containsMissing;
	        	});
	        };
        };   
        
        // Curved lines
        if (_representation.options.enableLineChange 
        		&& _representation.options.enableViewControls 
        		&& _representation.runningInView) {
        	if (_value.options.lType == "Curved"){
                line.interpolate("monotone");
        	};
        };
        
        plotG.selectAll("path.row").each(function(d, i) {
        	d3.select(this).datum(mzd[i]);
        });

        drawElements(mzd); 
        
        if (_representation.options.svg.fullscreen) {
            var win = document.defaultView || document.parentWindow;
            win.onresize = resize;
        }; 
    };
    
    var getLine = function(dp) {
    	return line(_data.colNames.map(function(col) {
    		return dp[col];
    	}));
    };
    
    function key(d) {
    	  return d.id;
    };
    
    function drawElements(data){
     var rows = plotG.selectAll("path.row").data(data).enter()
            .insert("path", ".axis").attr("class", "row")
            .attr("id", function(d) { return d.id; })
            .attr("d", getLine )
            .attr("stroke", function(d) {
            	if (_representation.options.useColors) {
            		return d.color;
            	} else if (_representation.options.catCol) {
            		return colors(d[_representation.options.catCol]);
            	} else {
            		return "black";
            	}
            })
            .attr("stroke-width", function() {
            	if (_representation.options.enableLineChange) {
            		return _value.options.lThickness;
            	} else {
            		return 1;
            	}
            })
            .attr("stroke-opacity", 0.9) 
            .attr("fill", "none");
     
     if (_representation.options.enableSelection){
    	 rows.on("click", function(d,i){
        		if( !d3.event.shiftKey) {
        			d3.selectAll(".selected").classed("selected", false);
        			d3.selectAll(".row").classed("unselected", true);
        			d3.select(this).classed({"selected": true, "unselected": false});
        			rowsSelected = true;
        			if (knimeService && knimeService.isInteractivityAvailable() && _value.options.publishSelection) {
						knimeService.setSelectedRows(_representation.inObjects[0].id, [this.getAttribute("id")], selectionChanged);
					}
        		} else {
        			var selected = d3.select(this).classed("selected");
        			d3.select(this).classed({"selected": !selected, "unselected": selected});
        			if (selected && d3.selectAll(".selected").empty()){
        				rowsSelected = false;
        			}
        			if (!selected && d3.selectAll(".selected").empty()){
        				rowsSelected = false;
        			}
        			if (!selected && !d3.selectAll(".selected").empty()){
        				rowsSelected = true;
        			}
        			if (knimeService && knimeService.isInteractivityAvailable() && _value.options.publishSelection) {
						if (selected){
							knimeService.removeRowsFromSelection(_representation.inObjects[0].id, [this.getAttribute("id")], selectionChanged);
						} else {
							knimeService.addRowsToSelection(_representation.inObjects[0].id, [this.getAttribute("id")], selectionChanged);
						}
					}
        			if (d3.selectAll(".selected").empty()){
        				d3.selectAll(".row").classed("unselected", false);
        				d3.selectAll(".row").datum(function(d){
        					delete d["selected"];
        					return d;
        				})
        				rowsSelected = false;
        			}
        		};
        		clearBrushes();
        		checkClearSelectionButton();
        		d3.event.stopPropagation();
         }).on("mouseover", function(d,i) {
    		 var selected = d3.select(this).classed("selected"); // returns true if selected
    		 selected &= d3.event.shiftKey;
    		 d3.select(this).classed({"addSelection": !selected, "removeSelection": selected}); 
    	 }).on("mouseout", function(d, i) {
    		 d3.selectAll(".rows").classed({"addSelection": false, "removeSelection": false});
    	 });
     };
     
     //select previously selected rows
     var selected = false;
     for (i = 0; i < data.length; i++ ){
    	 selected = selected || (data[i].selected == true);
     };
     if (selected){
    	 rows.classed( "selected", function(d){
    		 return d.selected;
    	 });
    	 
    	 rows.classed( "unselected", function(d){
    		 return d.selected == false;
    	 });
     	};
     	
     // render rows with a delay	
     /*d3.selectAll(".row").style("visibility", "hidden");	
     d3.selectAll(".row").transition().style("visibility", "visible").delay(function(d,i){
    	 arraySize = d3.selectAll(".row").length;
    	 return arraySize / i * 5000;
     });*/
     
    };

    function position(d) {
  	  var v = dragging[d];
  	  return v == null ? scaleCols(d) : v;
  	};

    input.getSVG = function() {
        var svg = d3.select("svg")[0][0];
        return (new XMLSerializer()).serializeToString(svg);
    };
    
    function createXAxis(){
	    xAxis = d3.svg.axis().scale(scaleCols).tickSize(5).orient("bottom");
	    gx = plotG.append("g").attr("class", "xAxis")
	    .attr("transform", function(d) { return "translate(0," + (h + 40	) + ")"; })
	    .attr("stroke", "transparent")
	    .call(xAxis);        
	
	    gx.append("g")
	      .attr("class", "xBrush")
	      .call(xBrush = d3.svg.brush().x(scaleCols).on("brush", brush).on("brushend", publishCurrentSelection).on("brushstart", function(){rowsSelected = false;}))
	      .selectAll("rect")
	      .attr("y", -8)
	      .attr("height", 16)
	      .attr("fill-opacity", "0.2")
	      .attr("stroke", "#fff")
	      .attr("shape-rendering","crispEdges");
    };
    
    function clearBrushes(){
    	if (_representation.options.enableSelection && _representation.options.enableBrushing && brushes){
			d3.selectAll(".brush").each(function(d,i){
				d3.select(this).call(brushes[_data.colNames[i]].clear());
				if (extents){
					if (d3.entries(extents).length > 0){
						extents = {};
					}
				}
			});

			if (_representation.options.enableSelection && _representation.options.enableBrushing 
					&& _value.options.mValues == MISSING_VALUE_MODE && xBrush && containMissing()){
				d3.select(".xBrush").call(xBrush.clear());
				if (xExtent){
				xExtent = [];
				}
			};
		};
    }
    
    function brush(axis, start, end, par){
    	par = par || false;
    	var data = _data;
    	extents = _data.colNames.map(function(p) { return brushes[p].extent(); });
    	var missingSelected = xBrush && !xBrush.empty() && _value.options.mValues == MISSING_VALUE_MODE;
    	if (xBrush){
    		var xExtent = xBrush.extent();
    	}
    	var nothingSelected = true;
    	for (var i = 0; i < _data.colNames.length; i++) {
    		nothingSelected &= brushes[_data.colNames[i]].empty();
    	};
    	if (_value.options.mValues == MISSING_VALUE_MODE && xBrush && containMissing()){
    		nothingSelected &= xBrush.empty();
    	}
    	if (nothingSelected) {
    		d3.selectAll(".row").classed({"selected": false, "unselected": false});
    		return;
    	};
    	d3.selectAll(".row").each(function(dp) {
    		var row = d3.select(this);
    		if (row.classed('filtered')) {
    			return;
    		};
    		var selected = _data.colNames.every(function(p,i){
    			var extentEmpty = brushes[p].empty();
    			if (xBrush){
	    			if (extentEmpty && !missingSelected){
	    				return true;
	    			};
    			} else {
    				if (extentEmpty){
    				return true;
    				}
    			}
    			var missValueSelected = false;
    			if (missingSelected){
    				var xScale = scaleCols(_data.colNames[i]);
    				if (par){
    					missValueSelected = xBrushScale(xExtent[0]) <= xScale && xScale <= xBrushScale(xExtent[1]);
    				} else {
    					missValueSelected = xExtent[0] <= xScale && xScale <= xExtent[1];
    				};
    				if (extentEmpty && !missValueSelected){
    					return true;
    				};
    			};
    			if (dp[p] == null){
    				return missValueSelected;
    			};
    			if (extentEmpty){
    				return false;
    			};
    			if (_data.colTypes[p] == "string"){
    				if (par){
    					return ordinalScale(extents[i][0]) <= scales[p](dp[p]) && scales[p](dp[p]) <= ordinalScale(extents[i][1]);
    				} else {
    					return extents[i][0] <= scales[p](dp[p]) && scales[p](dp[p]) <= extents[i][1];
    				}
    	    	} else if (_data.colTypes[p] == "number") {
    	    		return extents[i][0] <= dp[p] && dp[p] <= extents[i][1];
    	    	};
    		});
    		row.classed({"selected": selected, "unselected": !selected});
    	});
    };
    
    function getExtents(){
    	extents = {};
    	d3.entries(brushes).forEach(function(brush) {
    		if(!brush.value.empty()) {
    			extents[brush.key] = brush.value.extent();
    		};
    	});
    	xExtent = [];
    	if (_value.options.mValues == MISSING_VALUE_MODE && xBrush && containMissing()){
    		if (!xBrush.empty()){
    			xExtent = xBrush.extent();
    		};
    	};
    };
    
    function drawSavedBrushes(){
    	if (_value.options.selections) {
    		var yScale;
    		if (d3.entries(_data.domains).length > 0){
    			yScale = d3.scale.linear().domain([_value.options.oldHeight, 0]).range([h, 0]);
    		};
    		d3.keys(brushes).forEach(function(b) {
    	        	if(_value.options.selections.extents[b]) {
    	        		if (_data.colTypes[b] == "string" && _value.options.oldHeight){
    	        			brushes[b].extent([yScale(_value.options.selections.extents[b][0]), yScale(_value.options.selections.extents[b][1])]);
    	        		} else {
    	        			brushes[b].extent(_value.options.selections.extents[b]);
    	        		}
    	        	};
    	        });
    	        d3.selectAll(".brush").each(function(d) {
    		    	  d3.select(this).call(brushes[d]); 
    	   	  	});
    	        // draw xBrush
    	        if (_value.options.selections.xBrush){
    	        	if (_value.options.oldWidth){
    	        		var xScale = d3.scale.linear().domain([0, _value.options.oldWidth]).range([0, w]);
    	        		xBrush.extent([xScale(_value.options.selections.xBrush[0]), xScale(_value.options.selections.xBrush[1])]);
    	        	} else {
    	        		xBrush.extent(_value.options.selections.xBrush);
    	        	};
    	        	d3.select(".xBrush").call(xBrush);
    	        }
    	      brush();
    	};
    	
    };
    
    function selectRows(optSelection){
    	var selection = optSelection || _value.options.selectedrows; 
   		d3.selectAll(".row").each(function(d, i) {
   			var selected = false, unselected = false;
   			if (selection && selection.length > 0) {
   				selected = selection && selection.indexOf(this.getAttribute("id")) > -1;
   				unselected = !selected;
   				
   			}
   			var row = d3.select(this);
   			if (!row.classed("filtered")) {
   				d3.select(this).classed({"selected": selected, "unselected": unselected});
   			}
   		});
   		if (selection && selection.length > 0) {
   			rowsSelected = true;
   		}
   		if (d3.select(".selected").empty()) {
   			d3.selectAll(".row.unselected").classed("unselected", false);
   			rowsSelected = false;
   		}
    };
    
    function brushstart() {
		rowsSelected = false;
	  d3.event.sourceEvent.stopPropagation();
	};
    
    function drawBrushes(par){
    	par = par || false;
        d3.keys(brushes).forEach(function(b) {
        	if(extents[b]) {
        		if (par && _data.colTypes[b] == "string"){
        			brushes[b].extent([ordinalScale(extents[b][0]),ordinalScale(extents[b][1])]);
        		} else {
        			brushes[b].extent(extents[b]);
        		}
        	}
        });
        d3.selectAll(".brush").each(function(d) {
	    	  d3.select(this).call(brushes[d]); 
   	  	});
        // draw xBrush
        if (_value.options.mValues == MISSING_VALUE_MODE && xExtent && containMissing()){
        	if (par){
        		xBrush.extent([xBrushScale(xExtent[0]),xBrushScale(xExtent[1])]);
        	} else {
        		xBrush.extent(xExtent);
        	}
        	d3.select(".xBrush").call(xBrush);
        };
    };
    
    function resize(event) {
    	if (_representation.options.enableSelection && _representation.options.enableBrushing && brushes && !rowsSelected) {
    		getExtents();
    		oldHeight = h;
    		oldWidth = w;
    	};
    	if (_representation.options.enableSelection && _representation.options.enableBrushing 
    			&& noBrushes() && !d3.selectAll(".row.selected").empty()){
    		saveSelectedRows();
    	};
    	if (_representation.options.enableSelection && !_representation.options.enableBrushing 
    			&& !d3.selectAll(".row.selected").empty()) {
    		saveSelectedRows();
    	}
    	drawChart();
    	if (_representation.options.enableSelection && _representation.options.enableBrushing && brushes && !rowsSelected) {
    		ordinalScale = d3.scale.linear().domain([oldHeight, 0]).range([h, 0]);
    		if (_value.options.mValues == MISSING_VALUE_MODE && xExtent && containMissing()){
    			xBrushScale = d3.scale.linear().domain([0, oldWidth]).range([0, w]);
    		}
	    	drawBrushes(true);
	    	brush(null, null, null, true);
    	};
    	applyFilter();
    };
    
    function saveSelected(){
    	_value.outColumns.selection = {};
    	// set every RowId to false 
    	d3.selectAll(".row").each(function (row){
    		_value.outColumns.selection[row.id] = false;
    	});
    	// set to true selected
    	d3.selectAll(".row").filter(".selected").each(function (row){
    		_value.outColumns.selection[row.id] = true;
    	});
    };

    input.validate = function() {
        return true;
    };
    
    function saveSelectedRows(){
	    var selected = d3.selectAll(".row.selected");
	    if (!selected.empty()){
	    d3.selectAll(".row.selected").datum(function( d ) {
	    	d.selected = true;
	    				  return d;
	    				});
	    d3.selectAll(".row.unselected").datum(function( d ) {
	    	d.selected = false;
	    				  return d;
	    				});
	    	};
    };
    
    function isRowIncludedInFilter(rowId) {
    	var table = _representation.inObjects[0];
    	if (currentFilter && currentFilter.elements) {
			var included = true;
			var row = getTableRow(rowId);
			for (var i = 0; i < currentFilter.elements.length; i++) {
				var filterElement = currentFilter.elements[i];
				if (filterElement.type == "range" && filterElement.columns) {
					for (var col = 0; col < filterElement.columns.length; col++) {
						var column = filterElement.columns[col];
						var columnIndex = getTableColumnId(column.columnName);
						if (columnIndex != null) {
							var rowValue = row.data[columnIndex];
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
    
    function getTableColumnId( columnName) {
    	var table = _representation.inObjects[0];
    	var colID = null;
		for (var i = 0; i < table.spec.numColumns; i++) {
			if (table.spec.colNames[i] === columnName) {
				colID = i;
				break;
			};
		};
		return colID;
    }
    
    function getTableRow(rowId) {
    	var table = _representation.inObjects[0];
		for (var i = 0; i < table.spec.numRows; i++) {
			if (table.rows[i].rowKey == rowId) {
				return table.rows[i];
			}
		}
    }
    
    function noBrushes(){
    	var noBrushes = true;
    	for (var i = 0; i < _data.colNames.length; i++) {
    		//noBrushes &= brushes[_data.colNames[i]].empty();
    		noBrushes = noBrushes && brushes[_data.colNames[i]].empty();
    	};
    	if (_value.options.mValues == MISSING_VALUE_MODE && xBrush && containMissing()){
    		noBrushes = noBrushes && xBrush.empty();
    	};
    	if (xBrush){
    		noBrushes = noBrushes && xBrush.empty();
    	};
    	return noBrushes;
    }
    
    function extraRows(){
    	if (!d3.selectAll(".row.selected").empty()){
	    	d3.selectAll(".row").each(function(d){
	    		if (!d3.select(this).classed("selected") && !d3.select(this).classed("unselected")){
	    			d3.select(this).classed("unselected", true);
	    		};
	    	})
    	};
    };
    
    input.getComponentValue = function() {
    	if (!d3.selectAll(".axis").empty()){
    		saveSettingsToValue(true);
    		return _value;
    	} else {
    		return null;
    	}
    }
    
    function containMissing(){
    	 var missing = false;
         for (i = 0; i < _data.objects.length; i++ ){
        	 missing = missing || (_data.objects[i].containsMissing == true);
         };
         return missing;
    }
    
    function saveSettingsToValue(par){
    	par = par || false;
    	if (_representation.options.enableSelection && _representation.options.enableBrushing) {
	    	getExtents();
	    	_value.options.selections = {};
	    	_value.options.selections.extents = extents;
	    	if (_value.options.mValues == MISSING_VALUE_MODE && containMissing()){
	    		if (!xBrush.empty()){
	    			_value.options.selections.xBrush = xExtent;
	    		}
	    	}
	    	// empty saved single rows selection
	    	if (_value.options.selectedrows){
	    		delete _value.options["selectedrows"];
	    	};
    	};
    	
    	if ((_representation.options.enableSelection && _representation.options.enableBrushing && noBrushes() && !d3.selectAll(".row.selected").empty()) 
    			|| _representation.options.enableSelection && !_representation.options.enableBrushing && !d3.selectAll(".row.selected").empty()){
    		_value.options.selectedrows = [];
    		d3.selectAll(".row.selected").each(function (row){
        		_value.options.selectedrows.push(row.id);
        	});
        	// empty saved brushes
        	if (_value.options.selections){
        		delete _value.options["selection"];
        	};
    	};
    	if (_representation.options.enableAxesSwapping) {
    		_value.options.sortedCols = _data.colNames;
    	}
    	if (par){
    		_value.options.oldHeight = h;
    		_value.options.oldWidth = w;
    	}
    	// save selected rows for the node output column
    	saveSelected();
    }
    
    return input;

}());
