knime_table_view = function(table, containerElement) {
	var tableView = {
		version : "1.0.0"
	};
	tableView.name = "KNIME HTML Table View";

	//TODO: sanity check table and container
	var knimeTable = table;
	var container = containerElement;

	var tableDrawn = false;
	
	var showColumnHeader = true;
	var showRowKeys = false;
	var sortable = false;
	var sortColumn = null;
	var sortAscending = true;
	var enableSelection = true;
	var tableHeight = 300;
	var fullFrame = false;
	var selectAllCheckbox;
	
	var initialSelections = [];
	
	var drawingStartTime = 0;
	
	var formatterForType = [];
	
	var additionalDrawFunctions = [];
	
	tableView.draw = function() {
		if (typeof knimeTable == 'undefined' || knimeTable == null) {
			return;
		}
		var table = $('<table>');
		table.attr('class', 'knimeTableView');
		container.append(table);
		if (showColumnHeader || sortable) {
			var headerRow = $('<tr>');
			headerRow.attr('class', 'knimeTableRow knimeTableHeaderRow');
			table.append(headerRow);
			if (enableSelection) {
				var tableHeader = $('<th>');
				selectAllCheckbox = $('<input type="checkbox">');
				selectAllCheckbox.change(function() {
					$('td.knimeTableSelectCell input').prop('checked', selectAllCheckbox.get(0).checked);
				});
				selectAllCheckbox.prop('disabled', true);
				tableHeader.attr('class', 'knimeTableCell knimeTableHeaderCell knimeTableSelectAll');
				showColumnHeader && tableHeader.append(selectAllCheckbox);
				headerRow.append(tableHeader);
			}
			if (showRowKeys) {
				var tableHeader = $('<th>');
				showColumnHeader && tableHeader.text("Row ID");
				tableHeader.attr('class', 'knimeTableCell knimeTableHeaderCell knimeTableRowKeyHeaderCell');
				headerRow.append(tableHeader);
			}
			for ( var i = 0; i < knimeTable.getColumnNames().length; i++) {
				var tableHeader = $('<th>');
				showColumnHeader && tableHeader.text(knimeTable.getColumnNames()[i]);
				tableHeader.attr('class', 'knimeTableCell knimeTableHeaderCell');
				headerRow.append(tableHeader);
			}
		}
		var initialChunkSize = 20;
		drawingStartTime = new Date().getTime();
		_renderChunk(table, 0, initialChunkSize);
		
		for (var i = 0; i < additionalDrawFunctions.length; i++) {
			additionalDrawFunctions[i]();
		}
		tableDrawn = true;
	};
	
	_renderChunk = function(table, startIndex, chunkSize) {
		var startTime = new Date().getTime();
		var endIndex  = Math.min(knimeTable.getNumRows(), startIndex + chunkSize);
		_renderRows(table, startIndex, endIndex);
		var endTime = new Date().getTime();
		var chunkDuration = endTime - startTime;
		//var timeRemaining = (knimeTable.getNumRows() - endIndex) * totalDrawDuration / endIndex;
		//console.log("Rendered row " + startIndex + " to " + (endIndex-1) + ". Took " + chunkDuration + "ms. Estimated time remaining: " + Math.round(timeRemaining) + "ms.");
		var newChunkSize = chunkSize;
		if (startIndex + chunkSize < knimeTable.getNumRows()) {
			if (chunkDuration > 300) {
				newChunkSize = Math.max(1, Math.floor(chunkSize / 2));
			} else if (chunkDuration < 100) {
				newChunkSize = chunkSize * 2;
			}
			setTimeout((function(t, i, c) {
				return function() {
					_renderChunk(t, i, c);
				};
			})(table, startIndex + chunkSize, newChunkSize), chunkDuration);
		} else {
			if (enableSelection) {
				selectAllCheckbox.prop('disabled', false);
			}
			if (fullFrame) {
				_resizeParent();
			} else {
				var height = Math.min(tableHeight, table.outerHeight(true));
				_resizeParent(null, height);
			}
			//var totalDrawDuration = new Date().getTime() - drawingStartTime;
			//console.log("Total layout time " + totalDrawDuration + "ms.");
		}
	};
	
	_renderRows = function(table, startIndex, endIndex) {
		for ( var i = startIndex; i < endIndex; i++) {
			var tableRow = $('<tr>');
			tableRow.attr('id', 'row' + i);
			tableRow.attr('class', 'knimeTableRow');
			var rowKey = knimeTable.getRows()[i].rowKey;
			
			if (enableSelection) {
				var selectCell = $('<td>');
				selectCell.attr('class', 'knimeTableCell knimeTableSelectCell');
				var selectCheckbox = $('<input type="checkbox">');
				selectCheckbox.addClass(rowKey);
				var selected = $.inArray(rowKey, initialSelections) >= 0;
				selectCheckbox.prop('checked', selected);
				selectCell.append(selectCheckbox);
				tableRow.append(selectCell); 
			}
			
			if (showRowKeys) {
				var rowKeyCell = $('<td>');
				rowKeyCell.attr('class', 'knimeTableCell knimeTableRowKeyCell');
				var rowKeyWrapper = $('<div>');
				rowKeyWrapper.attr('class', 'knimeTableRowKeyWrapper');
				var colorBox = $('<div>');
				colorBox.attr('class', 'knimeTableRowColor');
				colorBox.css('background-color', knimeTable.getRowColors()[i]);
				colorBox.css('width', 16).css('height', 16);
				rowKeyWrapper.append(colorBox);
				var rowKeyTextBox = $('<div>');
				rowKeyTextBox.attr('class', 'knimeTableRowKeyText');
				rowKeyTextBox.text(knimeTable.getRows()[i].rowKey);
				rowKeyWrapper.append(rowKeyTextBox);
				rowKeyCell.append(rowKeyWrapper);
				tableRow.append(rowKeyCell);
			}
			
			for ( var j = 0; j < knimeTable.getNumColumns(); j++) {
				var columnType = knimeTable.getColumnTypes()[j];
				var cellContent = knimeTable.getRows()[i].data[j];
				var tableData = $('<td>');
				tableData.attr('class', 'knimeTableCell ' + columnType);
				if (cellContent != undefined) {
					if (columnType === "boolean" || columnType === "number" || columnType === "string") {
						var formatter = tableView.getFormatterForType(columnType);
						var textContent = cellContent;
						if (formatter) {
							textContent = formatter.format(cellContent);
						}
						tableData.text(textContent);
					} else if (columnType === "svg") {
						tableData.append($.parseHTML(cellContent));
					}
					else if (columnType === "png") {
						var image = $('<img>');
						tableData.append(image);
						image.attr('src', 'data:image/png;base64,' + cellContent);
					}
				} else {
					tableData.text('?');
				}
				tableRow.append(tableData);
			}
			table.append(tableRow);
		}
	};
	
	_resizeParent = function(width, height) {
		if (parent != undefined && parent.KnimePageLoader != undefined) {
			parent.KnimePageLoader.autoResize(window.frameElement.id, width, height);
		}
	};
	
	tableView.setSelection = function(selections) {
		initialSelections = selections;
	};
	
	tableView.getSelectedRowKeys = function() {
		var selected = [];
		$('td.knimeTableSelectCell input').each(function() {
			$(this).prop('checked') && selected.push($(this).attr('class'));
		});
		if (selected.length == 0) {
			return null;
		}
		return selected;
	};
	
	tableView.redraw = function() {
		if (tableDrawn) {
			container.empty();
			tableDrawn = false;
			//TODO: check if there is any other cleanup to be done
			tableView.draw();
		}
	};
	
	tableView.setEnableSelection = function(enable) {
		enableSelection = enable;
	}
	tableView.isEnableSelection = function() {
		return enableSelection;
	}
	
	tableView.setTableHeight = function(height) {
		tableHeight = height;
	}
	
	tableView.getTableHeight = function() {
		return tableHeight;
	}

	tableView.setFullFrame = function(full) {
		fullFrame = full;
	}
	tableView.isFullFrame = function() {
		return fullFrame;
	}
	
	tableView.setShowColumnHeader = function(show, redraw) {
		showColumnHeader = show;
		redraw && tableView.redraw();
	};
	tableView.isShowColumnHeader = function() {
		return showColumnHeader;
	};
	
	tableView.setShowRowKeys = function(show, redraw) {
		showRowKeys = show;
		redraw && tableView.redraw();
	};
	tableView.isShowRowKeys = function() {
		return showRowKeys;
	};
	
	tableView.getFormatterForType = function(type) {
		for (var i = 0; i < formatterForType.length; i++) {
			var formatter = formatterForType[i];
			if (formatter.type === type) {
				return formatter;
			}
		}
	};
	
	tableView.setNumberFormatter = function(decimal_places, decimal_separator, thousands_separator) {
		formatterForType.push({type: "number", format: function(value) {
			return $.number(value, decimal_places, decimal_separator, thousands_separator);
		}});
	};
		
	tableView.setSortable = function(isSortable, redraw) {
		sortable = isSortable;
		redraw && tableView.redraw();
	};
	tableView.isSortable = function() {
		return sortable;
	};
	
	tableView.setSorting = function(column, ascending, redraw) {
		sortColumn = column;
		sortAscending = ascending;
		sortable && knimeTable.sort(column, ascending);
		redraw && tableView.redraw();
	};
	tableView.getSortColumn = function() {
		return sortColumn;
	};
	tableView.getSortAscending = function() {
		return sortAscending;
	};
	
	tableView.addDrawFunction = function(func) {
		$.isFunction(func) && additionalDrawFunctions.push(func);
	};
	tableView.clearDrawFunctions = function() {
		additionalDrawFunctions = [];
	};

	return tableView;
};
