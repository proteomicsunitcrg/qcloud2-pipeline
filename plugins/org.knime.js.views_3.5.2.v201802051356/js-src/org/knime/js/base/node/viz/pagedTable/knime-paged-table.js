knime_paged_table = function() {
	
	var table_viewer = {};
	var _representation = null;
	var _value = null;
	var knimeTable = null;
	var dataTable = null;
	var selection = {};
	var partialSelectedRows = [];
	//var allCheckboxes = [];
	var currentFilter = null;
	var initialized = false;
	
	//register neutral ordering method for clear selection button
	$.fn.dataTable.Api.register('order.neutral()', function () {
	    return this.iterator('table', function (s) {
	        s.aaSorting.length = 0;
	        s.aiDisplay.sort( function (a,b) {
	            return a-b;
	        });
	        s.aiDisplayMaster.sort( function (a,b) {
	            return a-b;
	        } );
	    } );
	});
	
	table_viewer.init = function(representation, value) {
		if (!representation || !representation.table) {
			$('body').append("Error: No data available");
			return;
		}
		_representation = representation;
		_value = value;

		if (parent && parent.KnimePageLoader) {
			drawTable();
		} else {
			$(document).ready(function() {
				drawTable();
			});
		}
	};
	
	drawTable = function() {
		// Set locale for moment.js.
		if (_representation.dateTimeFormats.globalDateTimeLocale !== 'en') {
			moment.locale(_representation.dateTimeFormats.globalDateTimeLocale);
		}
		
		var body = $('body');
		if (_representation.enableSelection && _value.selection) {
			for (var i = 0; i < _value.selection.length; i++) {
				selection[_value.selection[i]] = true;
			}
		}
		try {
			knimeTable = new kt();
			knimeTable.setDataTable(_representation.table);
			
			var wrapper = $('<div id="knimePagedTableContainer">');
			body.append(wrapper);
			if (_representation.title != null && _representation.title != '') {
				wrapper.append('<h1>' + _representation.title + '</h1>')
			}
			if (_representation.subtitle != null && _representation.subtitle != '') {
				wrapper.append('<h2>' + _representation.subtitle + '</h2>')
			}
			var table = $('<table id="knimePagedTable" class="table table-striped table-bordered" width="100%">');
			wrapper.append(table);
			if (_representation.enableColumnSearching) {
				$('#knimePagedTable').append('<tfoot><tr></tr></tfoot>');
				var footerRow = $('#knimePagedTable tfoot tr');
				if (_representation.enableSelection) {
					footerRow.append('<th></th>');
				}
				if (_representation.displayRowIndex) {
					footerRow.append('<th></th>');						
				}
				if (_representation.displayRowColors || _representation.displayRowIds) {
					footerRow.append('<th></th>');
				}
				for (var i = 0; i < knimeTable.getColumnNames().length; i++) {
					if (isColumnSearchable(knimeTable.getColumnTypes()[i])) {
						footerRow.append('<th>' + knimeTable.getColumnNames()[i] + '</th>')
					} else {
						footerRow.append('<th></th>');
					}
				}
				
				$('#knimePagedTable tfoot th').each(function() {
			        var title = $(this).text();
			        if (title == '') {
			        	return;
			        }
			        $(this).html('<input type="text" placeholder="Search '+title+'" />' );
			    });
			}
			
			var colArray = [];
			var colDefs = [];
			if (_representation.enableSelection) {
				if (_representation.singleSelection) {
					var titleElement = _representation.enableClearSelectionButton 
						? ('<button type="button" id="clear-selection-button" class="btn btn-default btn-xs" title="Clear selection">' 
							+ '<span class="glyphicon glyphicon-remove-circle" aria-hidden="true"></span></button>')
						: '';
					colArray.push({'title': titleElement});
					colDefs.push({
						'targets': 0,
						'searchable':false,
						'orderable':false,
						'className': 'dt-body-center selection-cell',
						'render': function (data, type, full, meta) {
							return '<input type="radio" name="radio_single_select"'
							+ (selection[data] ? ' checked' : '')
							+' value="' + $('<div/>').text(data).html() + '">';
						}
					});
				} else {
					var all = _value.selectAll;
					colArray.push({'title': '<input name="select_all" value="1" id="checkbox-select-all" type="checkbox"' + (all ? ' checked' : '')  + ' />'});
					colDefs.push({
						'targets': 0,
						'searchable':false,
						'orderable':false,
						'className': 'dt-body-center selection-cell',
						'render': function (data, type, full, meta) {
							//var selected = selection[data] ? !all : all;
							setTimeout(function(){
								var el = $('#checkbox-select-all').get(0);
								/*if (all && selection[data] && el && ('indeterminate' in el)) {
								el.indeterminate = true;
							}*/
							}, 0);
							return '<input type="checkbox" name="id[]"'
							+ (selection[data] ? ' checked' : '')
							+' value="' + $('<div/>').text(data).html() + '">';
						}
					});
				}
			}
			if (_representation.displayRowIndex) {
				colArray.push({
					'title': "Row Index",
					'searchable': false
				})
			}
			if (_representation.displayRowIds || _representation.displayRowColors) {
				var title = _representation.displayRowIds ? 'RowID' : '';
				var orderable = _representation.displayRowIds;
				colArray.push({
					'title': title, 
					'orderable': orderable,
					'className': 'no-break'
				});
			}
			for (var i = 0; i < knimeTable.getColumnNames().length; i++) {
				var colType = knimeTable.getColumnTypes()[i];
				var knimeColType = knimeTable.getKnimeColumnTypes()[i];
				var colDef = {
					'title': knimeTable.getColumnNames()[i],
					'orderable' : isColumnSortable(colType),
					'searchable': isColumnSearchable(colType)					
				}
				if (_representation.displayMissingValueAsQuestionMark) {
					colDef.defaultContent = '<span class="missing-value-cell">?</span>';
				}
				if (knimeColType == 'Date and Time' && _representation.dateTimeFormats.globalDateTimeFormat) {
					colDef.render = function (data, type, full, meta) {
						// Check if date is given as ISO-string or time stamp (legacy).
						if (isNaN(data)) {
							// ISO-string:
							// date is parsed and rendered in local time. 
							return moment(data).format(type === 'sort' || type === 'type' ? 'x' : _representation.dateTimeFormats.globalDateTimeFormat);
						} else {
							// time stamp (legacy):
							// date is parsed and rendered in UTC.
							return moment(data).utc().format(type === 'sort' || type === 'type' ? 'x' : _representation.dateTimeFormats.globalDateTimeFormat);
						}
					}
				}
				if (knimeColType == 'Local Date' && _representation.dateTimeFormats.globalLocalDateFormat) {
				  colDef.render = function (data, type, full, meta) {
				    return moment(data).format(type === 'sort' || type === 'type' ? 'x' : _representation.dateTimeFormats.globalLocalDateFormat);
				  }
				}

				if (knimeColType == 'Local Date Time' && _representation.dateTimeFormats.globalLocalDateTimeFormat) {
				  colDef.render = function (data, type, full, meta) {
				    return moment(data).format(type === 'sort' || type === 'type' ? 'x' : _representation.dateTimeFormats.globalLocalDateTimeFormat);
				  }
				}

				if (knimeColType == 'Local Time' && _representation.dateTimeFormats.globalLocalTimeFormat) {
				  colDef.render = function (data, type, full, meta) {
				    return moment(data, "hh:mm:ss.SSSSSSSSS").format(type === 'sort' || type === 'type' ? 'x' : _representation.dateTimeFormats.globalLocalTimeFormat);
				  }
				}

				if (knimeColType == 'Zoned Date Time' && _representation.dateTimeFormats.globalZonedDateTimeFormat) {
					colDef.render = function (data, type, full, meta) {
						var regex = /(.*)\[(.*)\]$/
						var match = regex.exec(data);

						if (match == null) {
							var date = moment.tz(data, "");
						} else {
							dateTimeOffset = match[1];
							zone = match[2];

							if (moment.tz.zone(zone) == null) {
								var date = moment.tz(dateTimeOffset, "");
							} else {
								var date = moment.tz(dateTimeOffset, zone);
							}
						}

						return date.format(type === 'sort' || type === 'type' ? 'x' : _representation.dateTimeFormats.globalZonedDateTimeFormat);
					}
				}
				if (colType == 'number' && _representation.enableGlobalNumberFormat) {
					if (knimeTable.getKnimeColumnTypes()[i].indexOf('double') > -1) {
						colDef.render = function(data, type, full, meta) {
							if (!$.isNumeric(data)) {
								return data;
							}
							return Number(data).toFixed(_representation.globalNumberFormatDecimals);
						}
					}
				}
				if (colType == 'png') {
					colDef.render = function (data, type, full, meta) {
						return '<img src="data:image/png;base64,' + data + '" />';
					}
				}
				colArray.push(colDef);
				
			}
			var pageLength = _representation.initialPageSize;
			if (_value.pageSize) {
				pageLength = _value.pageSize;
			}
			var pageLengths = _representation.allowedPageSizes;
			if (_representation.pageSizeShowAll) {
				var first = pageLengths.slice(0);
				first.push(-1);
				var second = pageLengths.slice(0);
				second.push("All");
				pageLengths = [first, second];
			}
			var order = [];
			if (_value.currentOrder) {
				order = _value.currentOrder;
			}
			var buttons = [];
			if (_representation.enableSorting && _representation.enableClearSortButton) {
				var unsortButton = {
						'text': "Clear Sorting",
						'action': function (e, dt, node, config) {
							dt.order.neutral();
							dt.draw();
						},
						'enabled': (order.length > 0)
				}
				buttons.push(unsortButton);
			}
			
			var firstChunk = getDataSlice(0, _representation.initialPageSize);
			//search is also used for filtering, so consider all possible options
			var searchEnabled = _representation.enableSearching || _representation.enableColumnSearching
				|| (_representation.enableSelection && (_value.hideUnselected || _representation.enableHideUnselected)) 
				|| (knimeService && knimeService.isInteractivityAvailable());

			dataTable = $('#knimePagedTable').DataTable( {
				'columns': colArray,
				'columnDefs': colDefs,
				'order': order,
				'paging': _representation.enablePaging,
				'pageLength': pageLength,
				'lengthMenu': pageLengths,
				'lengthChange': _representation.enablePageSizeChange,
				'searching': searchEnabled,
				'ordering': _representation.enableSorting,
				'processing': true,
				'deferRender': !_representation.enableSelection,
				'data': firstChunk,
				'buttons': buttons,
				'fnDrawCallback': function() {
					if (!_representation.displayColumnHeaders) {
						$("#knimePagedTable thead").remove();
				  	}
					if (searchEnabled && !_representation.enableSearching) {
						$('#knimePagedTable_filter').remove();
					}
				}
			});
			
			//Clear sorting button placement and enable/disable on order change
			if (_representation.enableSorting && _representation.enableClearSortButton) {
				dataTable.buttons().container().appendTo('#knimePagedTable_wrapper .col-sm-6:eq(0)');
				$('#knimePagedTable_length').css({'display': 'inline-block', 'margin-right': '10px'});
				dataTable.on('order.dt', function () {
					var order = dataTable.order();
					dataTable.button(0).enable(order.length > 0);
				});
			}
			
			$('#knimePagedTable_paginate').css('display', 'none');

			$('#knimePagedTable_info').html(
				'<strong>Loading data</strong> - Displaying '
				+ 1 + ' to ' + Math.min(knimeTable.getNumRows(), _representation.initialPageSize)
				+ ' of ' + knimeTable.getNumRows() + ' entries.');
			
			if (knimeService) {
				if (_representation.enableSearching && !_representation.title) {
					knimeService.floatingHeader(false);
				}
				if (_representation.displayFullscreenButton) {
					knimeService.allowFullscreen();
				}
				if (_representation.enableSelection) {
					$.fn.dataTable.ext.search.push(function(settings, searchData, index, rowData, counter) {
						if (_value.hideUnselected) {
							return selection[rowData[0]] || partialSelectedRows.indexOf(rowData[0]) > -1;
						}
						return true;
					});
					if (_representation.enableHideUnselected && !_representation.singleSelection) {
						var hideUnselectedCheckbox = knimeService.createMenuCheckbox('showSelectedOnlyCheckbox', _value.hideUnselected, function() {
							var prev = _value.hideUnselected;
							_value.hideUnselected = this.checked;
							if (prev !== _value.hideUnselected) {
								dataTable.draw();
							}
						});
						knimeService.addMenuItem('Show selected rows only', 'filter', hideUnselectedCheckbox);
						if (knimeService.isInteractivityAvailable()) {
							knimeService.addMenuDivider();
						}
					}
					
				}
				
				if (knimeService.isInteractivityAvailable()) {
					if (_representation.enableSelection) {
						var pubSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-right', 'faded left sm', 'right bold');
						var pubSelCheckbox = knimeService.createMenuCheckbox('publishSelectionCheckbox', _value.publishSelection, function() {
							if (this.checked) {
								_value.publishSelection = true;
								publishCurrentSelection();
							} else {
								_value.publishSelection = false;
							}
						});
						knimeService.addMenuItem('Publish selection', pubSelIcon, pubSelCheckbox);
						if (_value.publishSelection && selection && Object.keys(selection).length > 0) {
							publishCurrentSelection();
						}
						if (!_representation.singleSelection) {
							var subSelIcon = knimeService.createStackedIcon('check-square-o', 'angle-double-right', 'faded right sm', 'left bold');
							var subSelCheckbox = knimeService.createMenuCheckbox('subscribeSelectionCheckbox', _value.subscribeSelection, function() {
								if (this.checked) {
									knimeService.subscribeToSelection(_representation.table.id, selectionChanged);
								} else {
									knimeService.unsubscribeSelection(_representation.table.id, selectionChanged);
								}
							});
							knimeService.addMenuItem('Subscribe to selection', subSelIcon, subSelCheckbox);
							if (_value.subscribeSelection) {
								knimeService.subscribeToSelection(_representation.table.id, selectionChanged);
							}
						}
					}
					if (_representation.subscriptionFilterIds && _representation.subscriptionFilterIds.length > 0) {
						if (_representation.enableSelection) {
							knimeService.addMenuDivider();
						}

						/*var pubFilIcon = knimeService.createStackedIcon('filter', 'angle-right', 'faded left sm', 'right bold');
						var pubFilCheckbox = knimeService.createMenuCheckbox('publishFilterCheckbox', _value.publishFilter, function() {
							if (this.checked) {
								//publishFilter = true;
							} else {
								//publishFilter = false;
							}
						});
						knimeService.addMenuItem('Publish filter', pubFilIcon, pubFilCheckbox);
						if (_value.publishFilter) {
							//TODO
						}*/
						$.fn.dataTable.ext.search.push(function(settings, searchData, index, rowData, counter) {
							if (currentFilter) {
								return knimeTable.isRowIncludedInFilter(index, currentFilter);
							}
							return true;
						});
						var subFilIcon = knimeService.createStackedIcon('filter', 'angle-double-right', 'faded right sm', 'left bold');
						var subFilCheckbox = knimeService.createMenuCheckbox('subscribeFilterCheckbox', _value.subscribeFilter, function() {
							if (this.checked) {
								knimeService.subscribeToFilter(_representation.table.id, filterChanged, _representation.subscriptionFilterIds);
							} else {
								knimeService.unsubscribeFilter(_representation.table.id, filterChanged);
							}
						});
						knimeService.addMenuItem('Subscribe to filter', subFilIcon, subFilCheckbox);
						if (_value.subscribeFilter) {
							knimeService.subscribeToFilter(_representation.table.id, filterChanged, _representation.subscriptionFilterIds);
						}
					}
				}
			}
			
			if (_representation.enableSelection) {
				if (_representation.singleSelection) {
					// Handle click on clear selection button
					var clearSelectionButton = $('#clear-selection-button').get(0);
					if (clearSelectionButton) {
						clearSelectionButton.addEventListener('click', function() {
							selectAll(false);
						});
					}
					// Handle click on radio button to set selection and publish event
					$('#knimePagedTable tbody').on('change', 'input[type="radio"]', function() {
						selection = {};
						selection[this.value] = this.checked;
						if (knimeService && knimeService.isInteractivityAvailable() && _value.publishSelection) {
							if (this.checked) {
								knimeService.setSelectedRows(_representation.table.id, [this.value], selectionChanged);
							}
						}
					});
				} else {
					// Handle click on "Select all" control
					var selectAllCheckbox = $('#checkbox-select-all').get(0);
					if (selectAllCheckbox) {
						if (selectAllCheckbox.checked && ('indeterminate' in selectAllCheckbox)) {
							selectAllCheckbox.indeterminate = _value.selectAllIndeterminate;
						}
						selectAllCheckbox.addEventListener('click', function() {
							selectAll(this.checked);
						});
					}

					// Handle click on checkbox to set state of "Select all" control
					$('#knimePagedTable tbody').on('change', 'input[type="checkbox"]', function() {
						//var el = $('#checkbox-select-all').get(0);
						//var selected = el.checked ? !this.checked : this.checked;
						// we could call delete _value.selection[this.value], but the call is very slow 
						// and we can assume that a user doesn't click on a lot of checkboxes
						selection[this.value] = this.checked;
						// in either case the row is not partially selected
						var partialIndex = partialSelectedRows.indexOf(this.value);
						if (partialIndex > -1) {
							partialSelectedRows.splice(partialIndex, 1);
						}

						if (this.checked) {
							if (knimeService && knimeService.isInteractivityAvailable() && _value.publishSelection) {
								knimeService.addRowsToSelection(_representation.table.id, [this.value], selectionChanged);
							}
						} else {
							if (_value.hideUnselected) {
								dataTable.draw('full-hold');
							}
							if (knimeService && knimeService.isInteractivityAvailable() && _value.publishSelection) {
								knimeService.removeRowsFromSelection(_representation.table.id, [this.value], selectionChanged);
							}
						}
						checkSelectAllState();
					});
					if (knimeService && _representation.enableClearSelectionButton) {
						knimeService.addButton('pagedTableClearSelectionButton', 'minus-square-o', 'Clear Selection', function() {
							selectAll(false, true);
						});
					}
					dataTable.on('search.dt', function () {
						checkSelectAllState();
					});
				}
				dataTable.on('draw.dt', function () {
					setSelectionOnPage();
				});
			}
			
			if (_representation.enableColumnSearching) {
				dataTable.columns().every(function () {
			        var that = this;
			        $('input', this.footer()).on('keyup change', function () {
			            if (that.search() !== this.value) {
			                that.search(this.value).draw();
			            }
			        });
			    });
			}
			
			//load all data
			setTimeout(function() {
				var initialChunkSize = 100;
				addDataToTable(_representation.initialPageSize, initialChunkSize);
			}, 0);

		} catch (err) {
			if (err.stack) {
				alert(err.stack);
			} else {
				alert (err);
			}
		}
	}
	
	addDataToTable = function(startIndex, chunkSize) {
		var startTime = new Date().getTime();
		var tableSize = knimeTable.getNumRows()
		var endIndex  = Math.min(tableSize, startIndex + chunkSize);
		var chunk = getDataSlice(startIndex, endIndex);
		dataTable.rows.add(chunk);
		var endTime = new Date().getTime();
		var chunkDuration = endTime - startTime;
		var newChunkSize = chunkSize;
		if (startIndex + chunkSize < tableSize) {
			$('#knimePagedTable_info').html(
				'<strong>Loading data ('
				+ endIndex + ' of ' + tableSize + ' records)</strong> - Displaying '
				+ 1 + ' to ' + Math.min(tableSize, _representation.initialPageSize) 
				+ ' of ' + tableSize + ' entries.');
			if (chunkDuration > 300) {
				newChunkSize = Math.max(1, Math.floor(chunkSize / 2));
			} else if (chunkDuration < 100) {
				newChunkSize = chunkSize * 2;
			}
			setTimeout((function(i, c) {
				return function() {
					addDataToTable(i, c);
				};
			})(startIndex + chunkSize, newChunkSize), chunkDuration);
		} else {
			$('#knimePagedTable_paginate').css('display', 'block');
			applyViewValue();
			dataTable.draw();
			finishInit();
		}
	}
	
	getDataSlice = function(start, end) {
		if (typeof end == 'undefined') {
			end = knimeTable.getNumRows();
		}
		var data = [];
		for (var i = start; i < Math.min(end, knimeTable.getNumRows()); i++) {
			var row = knimeTable.getRows()[i];
			var dataRow = [];
			if (_representation.enableSelection) {
				dataRow.push(row.rowKey);
			}
			if (_representation.displayRowIndex) {
				dataRow.push(i);
			}
			if (_representation.displayRowIds || _representation.displayRowColors) {
				var string = '';
				if (_representation.displayRowColors) {
					string += '<div class="knimeTableRowColor" style="background-color: '
							+ knimeTable.getRowColors()[i]
							+ '; width: 16px; height: 16px; '
							+ 'display: inline-block; margin-right: 5px; vertical-align: text-bottom;"></div>'
				}
				if (_representation.displayRowIds) {
					string += '<span class="rowKey">' + row.rowKey + '</span>';
				}
				dataRow.push(string);
			}
			var dataRow = dataRow.concat(row.data);
			data.push(dataRow);
		}
		return data;
	}
	
	applyViewValue = function() {
		if (_representation.enableSearching && _value.filterString) {
			dataTable.search(_value.filterString);
		}
		if (_representation.enableColumnSearching && _value.columnFilterStrings) {
			for (var i = 0; i < _value.columnFilterStrings.length; i++) {
				var curValue = _value.columnFilterStrings[i];
				if (curValue.length > 0) {
					var column = dataTable.column(i);
					$('input', column.footer()).val(curValue);
					column.search(curValue);
				}
			}
		}
		if (_representation.enablePaging && _value.currentPage) {
			setTimeout(function() {
				dataTable.page(_value.currentPage).draw('page');
			}, 0);
		}
	}
	
	finishInit = function() {
		//Used to collect all checkboxes here, 
		//but now keeping selection and checkbox state separate and applying checked state on every call of draw()
		/*allCheckboxes = dataTable.column(0).nodes().to$().children();*/
		initialized = true;
	}
	
	selectAll = function(all, ignoreSearch) {
		// cannot select all rows before all data is loaded
		if (!initialized) {
			setTimeout(function() {
				selectAll(all);
			}, 500);
		}
		
		if (ignoreSearch) {
			selection = {};
			partialSelectedRows = [];
		}
		if (all || !ignoreSearch) {
			var selIndices = dataTable.column(0, { 'search': 'applied' }).data();
			for (var i = 0; i < selIndices.length; i++) {
				selection[selIndices[i]] = all;
				var pIndex = partialSelectedRows.indexOf(selIndices[i]);
				if (pIndex > -1) {
					partialSelectedRows.splice(pIndex, 1);
				}
			}
		}
		checkSelectAllState();
		setSelectionOnPage();
		
		if (_value.hideUnselected) {
			dataTable.draw();
		}
		publishCurrentSelection();
	}
	
	checkSelectAllState = function() {
		var selectAllCheckbox = $('#checkbox-select-all').get(0);
		if (!selectAllCheckbox) { return; }
		var someSelected = false;
		var allSelected = true;
		var selIndices = dataTable.column(0, { 'search': 'applied' }).data();
		if (selIndices.length < 1) {
			allSelected = false;
		}
		for (var i = 0; i < selIndices.length; i++) {
			if (selection[selIndices[i]]) {
				someSelected = true;
			} else {
				allSelected = false;
			}
			if (partialSelectedRows.indexOf(selIndices[i]) > -1) {
				someSelected = true;
				allSelected = false;
			}
			if (someSelected && !allSelected) {
				break;
			}
		}
		_value.selectAll = allSelected;
	    selectAllCheckbox.checked = allSelected;
	    selectAllCheckbox.disabled = (selIndices.length < 1);
	    var indeterminate = someSelected && !allSelected;
	    
	    if('indeterminate' in selectAllCheckbox){
			// Set visual state of "Select all" control as 'indeterminate'
			selectAllCheckbox.indeterminate = indeterminate;
		}
	    _value.selectAllIndeterminate = indeterminate;
	}
	
	setSelectionOnPage = function() {
		var curCheckboxes = dataTable.column(0, {page:'current'}).nodes().to$().children();
		for (var i = 0; i < curCheckboxes.length; i++) {
			var checkbox = curCheckboxes[i];
			checkbox.checked = selection[checkbox.value];
			if ('indeterminate' in checkbox) {
				if (!checkbox.checked && partialSelectedRows.indexOf(checkbox.value) > -1) {
					checkbox.indeterminate = true;
				} else {
					checkbox.indeterminate = false;
				}
			}
		}
	}
	
	publishCurrentSelection = function() {
		if (knimeService && knimeService.isInteractivityAvailable() && _value.publishSelection) {
			var selArray = [];
			for (var rowKey in selection) {
				if (!selection.hasOwnProperty(rowKey)) {
			        continue;
			    }
				if (selection[rowKey]) {
					selArray.push(rowKey);
				}
			}
			knimeService.setSelectedRows(_representation.table.id, selArray, selectionChanged);
		}
	}
	
	selectionChanged = function(data) {
		// cannot apply selection changed event before all data is loaded
		if (!initialized) {
			setTimeout(function() {
				selectionChanged(data);
			}, 500);
		}
		
		// apply changeSet
		if (data.changeSet) {
			if (data.changeSet.removed) {
				for (var i = 0; i < data.changeSet.removed.length; i++) {
					selection[data.changeSet.removed[i]] = false;
				}
			}
			if (data.changeSet.added) {
				for (var i = 0; i < data.changeSet.added.length; i++) {
					selection[data.changeSet.added[i]] = true;
				}
			}
		}
		partialSelectedRows = knimeService.getAllPartiallySelectedRows(_representation.table.id);
		checkSelectAllState();
		setSelectionOnPage();
		if (_value.hideUnselected) {
			dataTable.draw();
		}
	}
	
	filterChanged = function(data) {
		// cannot apply selection changed event before all data is loaded
		if (!initialized) {
			setTimeout(function() {
				filterChanged(data);
			}, 500);
		}
		currentFilter = data;
		dataTable.draw();
	}
	
	isColumnSortable = function (colType) {
		var allowedTypes = ['boolean', 'string', 'number', 'dateTime'];
		return allowedTypes.indexOf(colType) >= 0;
	}
	
	isColumnSearchable = function (colType) {
		var allowedTypes = ['boolean', 'string', 'number', 'dateTime', 'undefined'];
		return allowedTypes.indexOf(colType) >= 0;
	}
	
	table_viewer.validate = function() {
		return true;
	};
	
	table_viewer.getComponentValue = function() {
		if (!_value) {
			return null;
		}
		_value.selection = [];
		for (var id in selection) {
			if (selection[id]) {
				_value.selection.push(id);
			}
		}
		if (_value.selection.length == 0) {
			_value.selection = null;
		}
		var pageNumber = dataTable.page();
		if (pageNumber > 0) {
			_value.currentPage = pageNumber;
		}
		var pageSize = dataTable.page.len();
		if (pageSize != _representation.initialPageSize) {
			_value.pageSize = pageSize;
		}
		var searchString = dataTable.search();
		if (searchString.length) {
			_value.filterString = searchString;
		}
		var order = dataTable.order();
		if (order.length > 0) {
			_value.currentOrder = order;
		}
		if (_representation.enableColumnSearching) {
			_value.columnFilterStrings = [];
			var filtered = false;
			dataTable.columns().every(function (index) {
		        var input = $('input', this.footer());
		        if (input.length) {
		        	var filterString = input.val();
		        	_value.columnFilterStrings.push(filterString);
		        	filtered |= filterString.length;
		        } else {
		        	_value.columnFilterStrings.push("");
		        }
		    });
			if (!filtered) {
				_value.columnFilterStrings = null;
			}
		}
		var selSub = document.getElementById('subscribeSelectionCheckbox');
		if (selSub) {
			_value.subscribeSelection = selSub.checked;
		}
		return _value;
	};
	
	return table_viewer;
	
}();