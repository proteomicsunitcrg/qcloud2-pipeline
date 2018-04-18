LOGGER = function() {
	var logger = {};
	
	logger.log = function(message) {
		if (console && console.log) {
			console.log(message);
		}
	};
	
	logger.error = function(errorMessage) {
		if (console && console.error) {
			console.error(errorMessage);
		}
	};
	
	return logger;
}();

if (typeof KnimePageLoader == 'undefined') {
KnimePageLoader = function() {
	var pageLoader = {};
	
	// constants
	var containerID = "knimeWebNode";
	var baseURL = "VAADIN/src-js";
	var defaultErrorMessage = " cannot be displayed.";
	var noInfoErrorMessage = "No further information available. Please check the configuration of the workflow.";
	var nodeStateErrorMessage = "The node was in state ";
	var contextRoot;
	
	// The version number of the application
	var version;
	// The configuration object, containing the layout and blackboard config.
	var pageConfig;
	// Object holding the parsed JSON data, get single nodes with webNodes[nodeName]
	var webNodes = null;
	// Object that holds all iframes, get frame to a node with frames[nodeName]
	var frames = new Object();
	// Object that holds a counter for init states
	var framesInitialized = 0;
	// Object that contains the libraries loaded by RequireJS, get a library object with libraries[libraryPath]
	var libraries = new Object();
	// Object that contains all view values
	var webViewValues = new Object();
	// Object that contains additional layouting options
	var layoutValues = new Object();
	// Map to keep track of manual resized frames
	var manualSizing = new Object();
	// Map for interactivity events
	var interactivityMap = new Object();
	// Map for interactivity event subscribers
	var interactivitySubscribers = new Object();
	
	var widget = null;
	var updateWidgetStateFunction = null;
	
	var isDebug = false;
	var isGridBasedLayout = true;
	
	// Function that will populate the container with iframes and generate the iframes' content
	pageLoader.init = function(page, w, updateState, debug, root) {
		if (!page) {
			_getContainerElement().appendChild(document.createTextNode("No data available."));
		}
		widget = w;
		updateWidgetStateFunction = updateState;
		isDebug = debug;
		contextRoot = root || "./";
		try {
			// Parse JSON
			var webNodePage = page;
			if (typeof page === 'string') {
				webNodePage = JSON.parse(page);
			} else {
				contextRoot = ".";
				baseURL = "";
			}
			version = "0.0.0";
			if (webNodePage.version) {
				version = webNodePage.version;
			}
			pageConfig = webNodePage.webNodePageConfiguration;
			if (pageConfig && pageConfig.selectionTranslators) {
				for (var i = 0; i < pageConfig.selectionTranslators.length; i++) {
					_registerSelectionTranslator(pageConfig.selectionTranslators[i], i);
				}
			}
			webNodes = webNodePage.webNodes;
			if (typeof pageConfig != 'undefined' && pageConfig != null) {
				if (typeof pageConfig.layout != 'undefined' && pageConfig.layout != null) {
					if (_compareVersionString(version, "3.1.0") < 0) {
						_buildLayoutGrid(pageConfig.layout.gridEntryList, null);
					} else {
						isGridBasedLayout = false;
						_buildBSLayout(pageConfig.layout, null);
					}
				}
			}
			
			framesInitialized = 0;
			if (typeof webNodes != 'undefined' && webNodes != null) {
				_processWebNodes();
			}
			
		} catch (errorMessage) {
			LOGGER.error(errorMessage);
		}
	};
	
	_compareVersionString = function(version1, version2) {
		var vA1 = version1.split(".");
		var vA2 = version2.split(".");
		for (var i = 0; i < 3; i++) {
			var diff = parseInt(vA1[i]) - parseInt(vA2[i]);
			if (diff) {
				return diff / Math.abs(diff);
			}
		}
		return 0;
	}
	
	_getContainerElement = function() {
		var cont = document.getElementById(containerID);
		if (!cont) {
			cont = document.getElementsByTagName("body")[0];
		}
		return cont;
	}
	
	_buildBSLayout = function(layout, parentContainer) {
		var parent = parentContainer;
		if (typeof parentContainer == "undefined" || parentContainer == null) {
			var wrapperContainer = document.createElement("div");
			wrapperContainer.id = "knimeBSLayoutContainer";
			wrapperContainer.setAttribute("class", "container-fluid");
			if (document.getElementById(containerID)) { 
				wrapperContainer.style.padding = 0;
			}
			_getContainerElement().appendChild(wrapperContainer);
			if (layout.rows) {
				for (var i = 0; i < layout.rows.length; i++) {
					_buildBSLayout(layout.rows[i], wrapperContainer);
				}
			}
		}
		if (!layout.type) {
			return;
		}
		
		if (layout.type === "row" || layout.type === "JSONLayoutRow") {
			var row = document.createElement("div");
			var rowClass = "row";
			if (layout.additionalClasses) {
				rowClass += " " + layout.additionalClasses.join(" ");
			}
			row.setAttribute("class", rowClass);
			if (layout.additionalStyles) {
				row.setAttribute("style", layout.additionalStyles.join(" "));
			}
			parent.appendChild(row);
			if (!layout.columns) {
				return;
			}
			for (var i = 0; i < layout.columns.length; i++) {
				var col = layout.columns[i];
				var cEl = document.createElement("div");
				var wString = "";
				if (col.widthXS > 0 && col.widthXS <= 12) {
					wString += "col-xs-" + col.widthXS + " ";
				}
				if (col.widthSM > 0 && col.widthSM <= 12) {
					wString += "col-sm-" + col.widthSM + " ";
				}
				if (col.widthMD > 0 && col.widthMD <= 12) {
					wString += "col-md-" + col.widthMD + " ";
				}
				if (col.widthLG > 0 && col.widthLG <= 12) {
					wString += "col-lg-" + col.widthLG + " ";
				}
				if (col.widthXL > 0 && col.widthXL <= 12) {
					wString += "col-xl-" + col.widthXL;
				}
				if (wString.length == 0) {
					wString = "col-md-12";
				}
				if (col.additionalClasses) {
					wString += " " + col.additionalClasses.join(" ");
				}
				cEl.setAttribute("class", wString);
				if (col.additionalStyles) {
					cEl.setAttribute("style", col.additionalStyles.join(" "));
				}
				row.appendChild(cEl);
				if (col.content) {
					for (var j = 0; j < col.content.length; j++) {
						_buildBSLayout(col.content[j], cEl);
					}
				}
			}
			
		} else if (layout.type === "view" || layout.type === "JSONLayoutViewContent") {
			var wn = webNodes[layout.nodeID];
			if (!wn || (wn.nodeInfo && !wn.nodeInfo.displayPossible)) {
				//don't create iframe for missing or not displayable nodes
				parent.id = "node" + layout.nodeID.replace(/:/g, "-");
				return;
			}
			
			// for aspect ratio set sizes, set appropriate classes on parent
			if (layout.resizeMethod.substring( 0, "aspectRatio".length ) === "aspectRatio") {
				var embed = document.createElement("div");
				var cString = "embed-responsive";
				if (layout.resizeMethod === "aspectRatio16by9") {
					cString += " embed-responsive-16by9";
				} else if (layout.resizeMethod === "aspectRatio4by3") {
					cString += " embed-responsive-4by3";
				}
				embed.setAttribute("class", cString);
				parent.appendChild(embed);
				parent = embed;
			}
			
			// Create iframe
			var frame = document.createElement('iframe');
			if (layout.additionalStyles) {
				frame.setAttribute("style", layout.additionalStyles.join(" "));
			}
			if (!frame.style.border) {
				frame.style.border = "none"; /*"thin solid darkgrey"*/
			}
			if (!frame.style.backgroundColor) {
				frame.style.backgroundColor = "white";
			}
			frame.style.display = "block";
			frame.style.maxWidth = "100%";
			frame.setAttribute("width", "100%");
			frame.setAttribute("allowfullscreen", "");
			frame.id = "node" + layout.nodeID.replace(/:/g, "-");
			var frameClass = "";
			if (layout.additionalClasses) {
				frameClass += layout.additionalClasses.join(" ");
			}
			if (layout.resizeMethod.substring( 0, "view".length ) === "view") {
				frame.setAttribute("class", frameClass + "resizable-frame");
				var method = layout.resizeMethod.substring(4, 5).toLowerCase() + layout.resizeMethod.substring(5);
				if (method === "lowestElementIEMax") {
					var isOldIE = (navigator.userAgent.indexOf("MSIE") !== -1);
					method = isOldIE ? 'max' : 'lowestElement';
				}
				var layoutSettings = {
						log : isDebug,
						enablePublicMethods : true,
						checkOrigin : false,
						resizeFrom : "child",
						
						autoResize : layout.autoResize,
						scrolling : layout.scrolling,
						heightCalculationMethod : method,
						sizeHeight : layout.sizeHeight,
						sizeWidth : layout.sizeWidth
				}
				if (layout.minWidth) {
					layoutSettings.minWidth = layout.minWidth;
				}
				if (layout.maxWidth) {
					layoutSettings.maxWidth = layout.maxWidth;
				}
				if (layout.minHeight) {
					layoutSettings.minHeight = layout.minHeight;
				}
				if (layout.maxHeight) {
					layoutSettings.maxHeight = layout.maxHeight;
				}
				if (layout.resizeInterval) {
					layoutSettings.interval = layout.resizeInterval;
				}
				if (layout.resizeTolerance) {
					layoutSettings.tolerance = layout.resizeTolerance;
				}
				layoutValues[frame.id] = layoutSettings;
			} else if (layout.resizeMethod.substring( 0, "aspectRatio".length ) === "aspectRatio") {
				frame.setAttribute("class", frameClass + "embed-responsive-item");
			} else if (layout.resizeMethod === "manual") {
				manualSizing[frame.id] = true;
			}
			
			// Add iframe to cell
			parent.appendChild(frame);
		} else  if (layout.type === "html" || layout.type === "JSONLayoutHTMLContent") {
			parent.innerHTML = layout.value;
		}
	}
	// Closure method to generate the layout grid.
	_buildLayoutGrid = function(gridLayout, gridParentContainer) {
		var maxX = -1;
		var maxY = -1;
		for (var i = 0; i < gridLayout.length; i++) {
			maxX = Math.max(maxX, gridLayout[i].position.x);
			maxY = Math.max(maxY, gridLayout[i].position.y);
		};
		var gridTable = document.createElement("table");
		if (typeof gridParentContainer == "undefined" || gridParentContainer == null) {
			gridTable.id = "knimeLayoutGridTable";
			_getContainerElement().appendChild(gridTable);
		} else {
			gridTable.setAttribute("class", "knimeInnerLayoutGridTable");
			gridParentContainer.appendChild(gridTable);
		}
		gridTable.setAttribute("style", "width: 100%; height: 100%; min-height: 200px; border-collapse: collapse; border: none; border-spacing: 0; margin: 0; padding: 0;");
	
		for (var y = 0; y <= maxY; y++) {
			var row = document.createElement("tr");
			row.setAttribute("class", "knimeLayoutGridRow");
			row.setAttribute("style", "margin: 0; padding:0; vertical-align: middle;");
			gridTable.appendChild(row);
			var gridCellWidth = 100/(maxX+1);
			var baseStyle = "margin: 0; border: none; width: " + gridCellWidth + "%;";
			for (var x = 0; x <= maxX; x++) {
				var cell = document.createElement("td");
				cell.setAttribute("class", "knimeLayoutGridCell");
				cell.setAttribute("style", "padding:0; " + baseStyle);
				row.appendChild(cell);
				var currentGridContent = _getGridContentFromPosition(x, y, gridLayout);
				if (currentGridContent != null) {
					var sizing = currentGridContent.content.sizing;
					var style = "";
					if (sizing) {
						if (sizing.padding) style += "padding: " + sizing.padding + "; ";
						if (sizing.width > 0) style += "width: " + sizing.width + "px; ";
						if (sizing.minWidth > 0) style += "min-width: " + sizing.minWidth + "px; ";
						if (sizing.maxWidth > 0) style += "max-width: " + sizing.maxWidth + "px; ";
						if (sizing.height > 0) style += "height: " + sizing.height + "px; ";
						if (sizing.minHeight > 0) style += "min-height: " + sizing.minHeight + "px; ";
						if (sizing.maxHeight > 0) style += "max-height: " + sizing.maxHeight + "px; ";
					}
					style += baseStyle;
					cell.setAttribute("style", style);
					
					if (currentGridContent.content.containsView) {
						// Create iframe
						var frame = document.createElement('iframe');
						frame.style.border = "none"; /*"thin solid darkgrey"*/
						frame.style.backgroundColor = "white";
						frame.style.display = "block";
						frame.style.maxWidth = "100%";
						frame.setAttribute("width", "100%");
						frame.id = currentGridContent.content.nodeID;
						// Add iframe to cell
						cell.appendChild(frame);
					} else {
						// recursive call to create nested grid
						_buildLayoutGrid(currentGridContent.content.nestedGridContent, cell);
					}
				}
			};
		};
	};
	
	_getGridContentFromPosition = function(x, y, gridLayout) {
		for (var i = 0; i < gridLayout.length; i++) {
			var pos = gridLayout[i].position;
			if (pos.x == x && pos.y == y) {
				return gridLayout[i];
			}
		}
		return null;
	};
	
	// Closure method to place the views in the layout
	_processWebNodes = function() {
		// Build iframe content for every node
		for ( var webNodeName in webNodes) {
			var webNode = webNodes[webNodeName];
			var frameID = "node" + webNodeName.replace(/:/g, "-");
			
			// Find corresponding iframe or create if not found in layout
			var frame = document.getElementById(webNodeName);
			if (!frame) {
				frame = document.getElementById(frameID);
			}
			
			// If an error occurred for a node, display it in the correct place in the layout
			if (webNode.nodeInfo && !webNode.nodeInfo.displayPossible) {
				var errorMessage = '<strong>';
				errorMessage += webNode.nodeInfo.nodeName;
				errorMessage += ' (' + webNodeName + ')';
				if (webNode.nodeInfo.nodeAnnotation) {
					errorMessage += ' - "' + webNode.nodeInfo.nodeAnnotation + '" -';
				}
				errorMessage += defaultErrorMessage 
				errorMessage += '</strong><br>';
				if (webNode.nodeInfo.nodeErrorMessage) {
					errorMessage += '<strong>Error message on node:</strong> '; 
					errorMessage += webNode.nodeInfo.nodeErrorMessage;
				} else if (webNode.nodeInfo.nodeWarnMessage){
					errorMessage += '<strong>Warn message on node:</strong> '; 
					errorMessage += webNode.nodeInfo.nodeWarnMessage;
				} else {
					errorMessage += noInfoErrorMessage;
				}
				if (isDebug) {
					errorMessage += '<br>';
					errorMessage += nodeStateErrorMessage;
					errorMessage += '<span style="text-transform: uppercase;">';
					errorMessage += webNode.nodeInfo.nodeState;
					errorMessage += '</span>.';
				}
				var errorDiv = document.createElement('div');
				errorDiv.setAttribute('class', 'nodeError alert alert-danger');
				errorDiv.setAttribute('role', 'alert');
				errorDiv.innerHTML = errorMessage;
				var cont = frame ? frame : _getContainerElement();
				cont.appendChild(errorDiv);
				continue;
			}
			
			if (typeof frame == 'undefined' || frame == null) {
				frame = document.createElement('iframe');
				frame.setAttribute("style", "border: none; " + /*"border: thin solid darkgrey; " +*/ "background-color: white; display:block;");
				frame.setAttribute("class", "resizable-frame")
				frame.setAttribute("width", "100%");
				/*frame.setAttribute("height", "530px");*/
				frame.setAttribute("allowfullscreen", "");
				frame.id = frameID;
				layoutValues[frameID] = {
					log : isDebug,
					enablePublicMethods : true,
					checkOrigin : false,
					resizeFrom : "child",
					scrolling : true
				}
				// Add iframe to container
				_getContainerElement().appendChild(frame);
			}
			
			// Create style imports
			var styles = "";
			if (webNode.stylesheets) {
				for ( var j = 0; j < webNode.stylesheets.length; j++) {
					styles += '<link rel="stylesheet" href="' + contextRoot + baseURL
						+ webNode.stylesheets[j] + '"></link>\n';
				}
			}
			
			// Add vaadin css if native component
			var component = document.getElementById("element_for_" + frameID);
			if (component) {
				styles += '<link rel="stylesheet" type="text/css" href="' + contextRoot + 'VAADIN/themes/knime/styles.css">';
			}
			
			// Create library imports
			var libs = new Array();
			if (webNode.javascriptLibraries) {
				for ( var i = 0; i < webNode.javascriptLibraries.length; i++) {
					var s = webNode.javascriptLibraries[i];
					var requireTest = /.*require.*/i;
					if (!requireTest.test(s)) {
						s = s.charAt(0) == "/" ? s.substring(1) : s;
						libs.push(s.substring(0, s.length - 3));
					}
				}
			}
			
			// Add iframe resize component
			if ((" " + frame.className + " " ).indexOf( " resizable-frame " ) > -1) {
				libs.push("org/knime/core/iframeResizer/iframeResizer.contentWindow");
			}
			// Create namespace prefix
			var namespace = webNode.namespace;
			if (typeof namespace == 'undefined' || namespace == '') {
				namespace = '';
			} else {
				namespace += '.';
			}
			
			var libStrings = [];
			for (var i = 0; i < libs.length; i++) {
				libStrings.push('"' + libs[i] + '"');
			}
			// Create library paths
			/*var libPaths = new Array();
			for ( var i = 0; i < libs.length; i++) {
				libPaths.push(libs[i].replace(/[^\w]/gi, '_'));
			}

			// Create code that saves the library objects in 'libraries'
			var saveLibsCode = '';
			for ( var i = 0; i < libPaths.length; i++) {
				saveLibsCode += 'parent.KnimePageLoader.addLibrary("' + libPaths[i] + '", ' + libPaths[i] + ');\n';
			}*/
			// Create code that calls the init() function
			var callInitCode = namespace + webNode.initMethodName
					+ '(parent.KnimePageLoader.getWebNode("' + webNodeName
					+ '").viewRepresentation, parent.KnimePageLoader.getWebNode("'
					+ webNodeName + '").viewValue);\n'
					+ "parent.KnimePageLoader.setInitialized(window.frameElement.id);\n";
			
			//var resizeFrameCode = 'parent.KnimePageLoader.autoResize(\'' + webNodeName + '\')';

			var corePath = contextRoot + baseURL + '/org/knime/';
			corePath += isDebug ? 'debug/' : 'core/';

			// Import for require js
			var requireJSScript = '<script data-main="' + corePath + 'callInitFrame.js" src="' + corePath + 'require.js"></script>\n';
			// Inline script that calls require for all libraries and then
			// the init() function of the view
			// FIXME: refactor loading of scripts, as libraries that call define() cannot be loaded this way!
			var requireFuncScript = 'function requireLibs(libs, index) {\n'
				+ '\tif (index >= libs.length) return;\n'
				+ '\trequire([libs[index]], function(libObject) {\n'
				+ '\t\tparent.KnimePageLoader.addLibrary(libs[index], libObject);\n'
				+ '\t\tindex++;\n'
				+ '\t\tif (index === libs.length) {\n'
				+ '\t\t\t' + callInitCode
				+ '\t\t}\n'
				+ '\t\trequireLibs(libs, index);\n'
				+ '\t});\n' 
		        + '}\n\n';
			var inlineScript = '<script type="text/javascript">\n'
				+ requireFuncScript
				+ 'function initFrame() {\n\trequireLibs(['
				+ libStrings.join(',')
				+ '], 0);}\n</script>\n';

			// Full HTML content of the iframe
			var frameHtml = '<!DOCTYPE html>\n<html>\n<head>\n' + styles
					+ inlineScript + requireJSScript
					+ '</head>\n<body>\n</body>\n</html>';
			// onresize="setTimeout(' + resizeFrameCode + ', 0)"

			// Set content of iframe
			var doc = frame.contentWindow.document;
			try {
				doc.open();
				doc.write(frameHtml);
			} finally {
				doc.close();
			}
			
			// Save frame reference for easy access
			frames[webNodeName] = frame;
		}
	};

	// Returns the web node object to the given node name
	pageLoader.getWebNode = function(nodeName) {
		return webNodes[nodeName];
	};

	// Returns the frame to the given node name
	pageLoader.getFrame = function(nodeName) {
		return frames[nodeName];
	};
	
	pageLoader.getContextRoot = function() {
		return contextRoot;
	}
	
	pageLoader.getBasePath = function() {
		return contextRoot + baseURL;
	}
	
	pageLoader.setInitialized = function(id) {
		if (layoutValues[id] && iFrameResize) {
			var settings = layoutValues[id];
			if (!settings.heightCalculationMethod) {
				var isOldIE = (navigator.userAgent.indexOf("MSIE") !== -1);
				var method = isOldIE ? 'max' : 'lowestElement';
				settings.heightCalculationMethod = method;
			}
			iFrameResize(settings, "iframe#" + id);
		}
		framesInitialized++;
		if (framesInitialized === Object.keys(webNodes).length) {
			pageLoader.getPageValues();
		}
	};

	// Returns the library object to the given library path
	pageLoader.getLibrary = function(libraryPath) {
		return libraries[libraryPath];
	};
	
	pageLoader.addLibrary = function(libraryField, libraryObject) {
		libraries[libraryField] = libraryObject;
	};
	
	pageLoader.getPageValues = function() {
		try {
			//LOGGER.log("getPageValues called");
			webViewValues = new Object();
			for (var webNodeName in webNodes) {
				var webNode = webNodes[webNodeName];
				if (webNode.nodeInfo && !webNode.nodeInfo.displayPossible) {
					continue;
				}
				//always initialize value object for each node
				webViewValues[webNodeName] = {};
				var value;
				var namespace = webNode.namespace;
				var getPageValueFunction = null;
				if (typeof namespace == 'undefined' || namespace == '') {
					getPageValueFunction = pageLoader.getFrame(webNodeName).contentWindow[webNode.getViewValueMethodName];
				} else {
					var registeredNamespace = value = pageLoader.getFrame(webNodeName).contentWindow[namespace];
					if (typeof registeredNamespace != 'undefined') {
						getPageValueFunction = registeredNamespace[webNode.getViewValueMethodName];
					}
				}
				if (getPageValueFunction) {
					value = getPageValueFunction();
					if (typeof value === 'undefined') {
						value = {};
					}
					webViewValues[webNodeName] = value;
				}
			}
			if (updateWidgetStateFunction) {
				updateWidgetStateFunction(widget, JSON.stringify(webViewValues));
			} else {
				return webViewValues;
			}
		} catch (exception) {
			LOGGER.error(exception);
		}
	};
	
	pageLoader.updateComponentValue = function(nodeID, value) {
		try {
			if (webViewValues[nodeID]) {
				webViewValues[nodeID] = value;
				updateWidgetStateFunction(widget, JSON.stringify(webViewValues));
			}
		} catch (exception) {
			LOGGER.error(exception);
		}
	};
	
	pageLoader.validate = function() {
		var valid = true;
		//LOGGER.log("validate called");
		for ( var webNodeName in webNodes) {
			var webNode = webNodes[webNodeName];
			if (webNode.nodeInfo && !webNode.nodeInfo.displayPossible) {
				continue;
			}
			var namespace = webNode.namespace;
			var func;
			if (typeof namespace == 'undefined' || namespace == '') {
				func = pageLoader.getFrame(webNodeName).contentWindow[webNode.validateMethodName];
			} else {
				func = pageLoader.getFrame(webNodeName).contentWindow[namespace][webNode.validateMethodName];
			}
			if (func) valid &= func();
		}
		return valid ? true : false;
	};
	
	pageLoader.setValidationError = function(jsonError) {
		var errorList = JSON.parse(jsonError);
		if (typeof errorList === 'string') {
			alert(errorList);
			return;
		}
		for (var errorNodeID in errorList) {
			for (var webNodeName in webNodes) {
				if (errorNodeID === webNodeName) {
					var webNode = webNodes[webNodeName];
					var namespace = webNode.namespace;
					var func;
					if (typeof namespace == 'undefined' || namespace == '') {
						func = pageLoader.getFrame(webNodeName).contentWindow[webNode.setValidationErrorMethodName];
					} else {
						func = pageLoader.getFrame(webNodeName).contentWindow[namespace][webNode.setValidationErrorMethodName];
					}
					if (func) {
						func(errorList[errorNodeID].error);
						pageLoader.autoResize(errorNodeID);
					}
					break;
				}
			}
		}
	};
	
	pageLoader.reset = function() {
		version = null;
		pageConfig = null;
		webNodes = null;
		frames = new Object();
		framesInitialized = 0;
		libraries = new Object();
		webViewValues = new Object();
		layoutValues = new Object();
		manualSizing = new Object();
		interactivityMap = new Object();
		interactivitySubscribers = new Object();
		
		widget = null;
		updateWidgetStateFunction = null;
		
		isDebug = false;
		isGridBasedLayout = true;
	}
	
	pageLoader.isRunningInWebportal = function() {
		try {
			// test if direct child div of body, generated by WebPortal exists 
			return document.querySelector('body.v-generated-body > div.webportalui') != null;
		} catch (err) {
			LOGGER.error(err);
			return false;
		}
	}
	
	pageLoader.autoResize = function(id, width, height){
		if (!isGridBasedLayout && !manualSizing[id]) {
			// more elaborate way of handling sizes
			return;
		}
		setTimeout(
				function() {
					var newheight = height;
					var newwidth = width;
					if (document.getElementById && document.getElementById(id)) {
						var body = document.getElementById(id).contentWindow.document.body;
					    var html = document.getElementById(id).contentWindow.document.documentElement;
						if (typeof height == 'undefined' || height == null) {
							newheight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
							// try to determine outerHeight of body (IE9+)
							/*newheight = outerHeight(html);
							if (typeof newheight == 'undefined') {
								// use legacy methods (pre IE9)
								newheight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
							} */
							//newheight = document.getElementById(id).contentWindow.document.body.children[0].scrollHeight + 22;
						}
						if (typeof width == 'undefined' || width == null) {
							//newwidth = document.getElementById(id).contentWindow.document.body.scrollWidth + 20;
							newwidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
						}
						var frame = document.getElementById(id);
						frame.height = (newheight) + "px";
						// document.getElementById(id).width="100%";
						document.getElementById(id).width = (newwidth) + "px";
						frame.style.width = newwidth + "px";
						frame.style.height = newheight + "px";
						//frame.setAttribute("style", frame.getAttribute("style") + " height:" + newheight + "px; width:" + newwidth + "px;");
					}
				}, 0);
	};
	
	outerHeight = function(el) {
		if (typeof el == 'undefined' || typeof getComputedStyle == 'undefined') {
			return;
		}
		var height = el.offsetHeight;
		var style = getComputedStyle(el);

		height += parseInt(style.marginTop) + parseInt(style.marginBottom);
		return height;
	};

	outerWidth = function(el) {
		if (typeof el == 'undefined' || typeof getComputedStyle == 'undefined') {
			return;
		}
		var width = el.offsetWidth;
		var style = getComputedStyle(el);

		width += parseInt(style.marginLeft) + parseInt(style.marginRight);
		return width;
	};
	
	// Interactivity functions
	
	pageLoader.subscribe = function(id, callback, filter) {
		if (isDebug) {
			LOGGER.log('Subscribing event listener for: ' + id + (filter ? JSON.stringify(filter) : ''));
		}
		if (!interactivitySubscribers.hasOwnProperty(id)) {
			interactivitySubscribers[id] = [];
		}
		interactivitySubscribers[id].push({'callback': callback, 'filter': filter});
		if (interactivityMap[id]) {
			var relevantElements = _createRelevantElements(id, filter);
			if (!relevantElements) {
				relevantElements = {};
			}
			relevantElements.reevaluate = true;
			_notifySubscriber(callback, relevantElements);
		}
	}
	
	pageLoader.unsubscribe = function(id, callback) {
		if (interactivitySubscribers.hasOwnProperty(id)) {
			var subscribers = interactivitySubscribers[id];
			var i = subscribers.length;
			while (i--) {
				if (subscribers[i].callback === callback) {
					if (isDebug) {
						LOGGER.log('Unsubscribing event listener for: ' + id);
					}
					return subscribers.splice(i, 1);
				}
			}
		}
	}
	
	pageLoader.publish = function(id, data, skip) {
		if (isDebug) {
			LOGGER.log('Publishing interactivity event (' + id + '): ' + JSON.stringify(data));
		}
		var exists = interactivityMap.hasOwnProperty(id);
		// row-based changeSet handling
		if (data.changeSet) {
			if (!exists) {
				if ((data.changeSet.added && data.changeSet.added.length > 0) || (data.changeSet.partialAdded && data.changeSet.partialAdded.length > 0)) {
					// no element exists but something to add
					interactivityMap[id] = {'selectionMethod': data.selectionMethod, 'elements': []};
					if (data.changeSet.partialAdded && data.changeSet.partialAdded.length > 0) {
						interactivityMap[id].partial = [];
					}
				} else {
					// no element exists and nothing to add
					return;
				}
			}
			var curElement = interactivityMap[id];
			var allRemovedRows = [];
			var allAddedRows = [];
			var allRemovedPartial = [];
			var allAddedPartial = [];
			if (curElement && curElement.elements && data.changeSet.removed && data.changeSet.removed.length > 0) {
				var i = curElement.elements.length;
				while (i--) {
					var curRows = curElement.elements[i].rows || [];
					// filter rows of current element according to removed rows
					var filteredRows = curRows.filter(function(row) {
						return data.changeSet.removed.indexOf(row) < 0;
					});
					// determine actually removed rows
					allRemovedRows = allRemovedRows.concat(data.changeSet.removed.filter(function(row) {
						return curRows.indexOf(row) > -1;
					}));
					if (filteredRows.length < 1) {
						// remove element if it contains no more rows
						curElement.elements.splice(i, 1);
					} else {
						curElement.elements[i].rows = filteredRows;
					}
				}
			}
			if (curElement && curElement.partial && data.changeSet.partialRemoved && data.changeSet.partialRemoved.length > 0) {
				var filteredPartial = curElement.partial.filter(function(row) {
					return data.changeSet.partialRemoved.indexOf(row) < 0;
				});
				allRemovedPartial = data.changeSet.partialRemoved.filter(function(row) {
					return curElement.partial.indexOf(row) > -1;
				});
				if (filteredPartial.length < 1) {
					delete curElement.partial;
				} else {
					curElement.partial = filteredPartial;
				}
			}
			if (data.changeSet.added && data.changeSet.added.length > 0) {
				if (curElement.elements.length < 1) {
					curElement.elements = [{'type': 'row', 'rows': []}];
				}
				for (var i = 0; i < curElement.elements.length; i++) {
					// only consider first unnamed element for added rows
					if (typeof curElement.elements[i].id == 'undefined') {
						var curRows = curElement.elements[i].rows || [];
						allAddedRows = data.changeSet.added.filter(function(row) {
							return curRows.indexOf(row) < 0;
						});
						curElement.elements[i].rows = curRows.concat(allAddedRows);
						break;
					}
				}
			}
			if (data.changeSet.partialAdded && data.changeSet.partialAdded.length > 0) {
				var curPartial = curElement.partial || [];
				allAddedPartial = data.changeSet.partialAdded.filter(function(row) {
					return curPartial.indexOf(row) < 0;
				});
				if (!curElement.partial && allAddedPartial.length > 0) {
					curElement.partial = [];
				}
				curElement.partial = curElement.partial.concat(allAddedPartial);
			}
			if (allRemovedRows.length + allAddedRows.length + allRemovedPartial.length + allAddedPartial.length) {
				var toPublish = {'selectionMethod': data.selectionMethod, 'changeSet': {}};
				if (allRemovedRows.length) {
					toPublish.changeSet.removed = allRemovedRows;
				}
				if (allAddedRows.length) {
					toPublish.changeSet.added = allAddedRows;
				}
				if (allRemovedPartial.length) {
					toPublish.changeSet.partialRemoved = allRemovedPartial;
				}
				if (allAddedPartial.length) {
					toPublish.changeSet.partialAdded = allAddedPartial;
				}
				if (typeof data.mappedEvent != 'undefined') {
					toPublish.mappedEvent = data.mappedEvent;
				}
				_notifySubscribers(id, toPublish, skip);
			}
		} else {
			// non row-based update
			var changedIds = [];
			for (var i = 0; i < data.elements.length; i++) {
				if (typeof data.elements[i].id !== 'undefined') {
					var changed = true;
					if (exists) {
						var c = interactivityMap[id];
						for (var j = 0; j < c.elements.length; j++) {
							if (data.elements[i].id == c.elements[j].id) {
								//TODO check this properly
								changed = data.elements[i] === c.elements[j];
								break;
							}
						}
					}
					if (changed) {
						changedIds.push(data.elements[i].id);
					}
				}
				if (changedIds.length < 1) {
					return;
				}
				interactivityMap[id] = data;
				_notifySubscribers(id, data, skip, changedIds);
			}
		}
	}
	
	_createRelevantElements = function(id, filter, changedIds) {
		var data = interactivityMap[id];
		if (!data || !filter) {
			return data;
		}
		if (changedIds) {
			var relevantChanged = false;
			for (var f = 0; f < filter.length; f++) {
				if (changedIds.indexOf(filter[f] >= 0)) {
					relevantChanged = true;
					break;
				}
			}
			if (!relevantChanged) {
				return null;
			}
		}
		var relevantElements = data.elements.filter(function(value) {
			return (typeof value.id !== 'undefined') && (filter.indexOf(value.id) >= 0);
		});
		return {'selectionMethod': data.selectionMethod, 'elements': relevantElements};
	}
	
	_notifySubscribers = function(id, data, skip, changedIds) {
		if (interactivitySubscribers[id]) {
			for (var i = 0; i < interactivitySubscribers[id].length; i++) {
				var subscriber = interactivitySubscribers[id][i];
				if (skip && subscriber.callback === skip) {
					continue;
				}
				var payload = data;
				if (changedIds) {
					payload = _createRelevantElements(id, subscriber.filter, changedIds);
				}
				if (payload) {
					_notifySubscriber(subscriber.callback, payload);
				}
			}
		}
	}
	
	_notifySubscriber = function(callback, data) {
		setTimeout(function() {
			callback.call(this, data);
		}, 0);
	}
	
	pageLoader.getPublishedElement = function(id) {
		var element = interactivityMap[id];
		if (element) {
			delete element.mappedEvent;
			//delete element.partial;
		}
		return element;
	}
	
	_registerSelectionTranslator = function(translator, translatorID) {
		// check non-existing IDs
		if (!translator.sourceID || !translator.targetIDs) {
			return;
		}
		// check if translator is forwarding events or contains mapping
		if (!translator.forward && !translator.mapping) {
			return;
		}
		pageLoader.subscribe('selection-' + translator.sourceID, function(data) {
			if(!data || data.mappedEvent == translatorID) {
				return;
			}
			for (var i = 0; i < translator.targetIDs.length; i++) {
				var mappedData = data;
				if (!translator.forward && translator.mapping) {
					var curElementSource = pageLoader.getPublishedElement('selection-' + translator.sourceID);
					var curElementTarget = pageLoader.getPublishedElement('selection-' + translator.targetIDs[i]);
					mappedData = _mapSelectionEvent(data, translator.mapping, true, curElementSource, curElementTarget);
					if (!mappedData) {
						return;
					}
				} 
				mappedData.mappedEvent = translatorID;
				pageLoader.publish('selection-' + translator.targetIDs[i], mappedData);
			}
		});
		for (var i = 0; i < translator.targetIDs.length; i++) {
			//decouple, because of loop scoping
			_subscribeTargetTranslator(translator, translatorID, translator.targetIDs[i]);
		}
	}
	
	_subscribeTargetTranslator = function(translator, translatorID, handlerID) {
		pageLoader.subscribe('selection-' + handlerID, function(data) {
			if(!data || data.mappedEvent == translatorID) {
				return;
			}
			var mappedData = data;
			if (!translator.forward && translator.mapping) {
				var curElementSource = pageLoader.getPublishedElement('selection-' + translator.sourceID);
				var curElementTarget = pageLoader.getPublishedElement('selection-' + handlerID);
				mappedData = _mapSelectionEvent(data, translator.mapping, false, curElementSource, curElementTarget);
				if (!mappedData) {
					return;
				}
			}
			mappedData.mappedEvent = translatorID;
			pageLoader.publish('selection-' + translator.sourceID, mappedData);
		});
	}
	
	_mapSelectionEvent = function(data, mapping, sourceToTarget, curElementSource, curElementTarget) {
		if (!data || !data.changeSet) {
			return;
		}
		var mappedData = {
				'selectionMethod': 'selection', 
				'changeSet': {}
		};
		var curRowsSource = [];
		if (curElementSource && curElementSource.elements) {
			for (var i = 0; i < curElementSource.elements.length; i++) {
				if (curElementSource.elements[i].rows) {
					curRowsSource = curRowsSource.concat(curElementSource.elements[i].rows);
				}
			}
		}
		var curPartialRowsSource = [];
		if (curElementSource && curElementSource.partial) {
			curPartialRowsSource = curElementSource.partial;
		}
		var curRowsTarget = [];
		if (curElementTarget && curElementTarget.elements) {
			for (var i = 0; i < curElementTarget.elements.length; i++) {
				if (curElementTarget.elements[i].rows) {
					curRowsTarget = curRowsTarget.concat(curElementTarget.elements[i].rows);
				}
			}
		}
		var addedRows = [];
		if (data.changeSet && data.changeSet.added) {
			addedRows = data.changeSet.added;
		}
		var removedRows = [];
		if (data.changeSet && data.changeSet.removed) {
			removedRows = data.changeSet.removed;
		}
		var mappedAdded = [], mappedRemoved = [];
		var partialAdded = [], partialRemoved = [];
		if (sourceToTarget) {
			for (var row = 0; row < addedRows.length; row++) {
				if (mapping[addedRows[row]]) {
					var addedNotExisting = mapping[addedRows[row]].filter(function(row) {
						return curRowsTarget.indexOf(row) < 0;
					});
					mappedAdded = mappedAdded.concat(addedNotExisting);
				}
			}
			for (var row = 0; row < removedRows.length; row++) {
				if (mapping[removedRows[row]]) {
					var removedExisting = mapping[removedRows[row]].filter(function(row) {
						return curRowsTarget.indexOf(row) > -1;
					});
					mappedRemoved = mappedRemoved.concat(removedExisting);
				}
			}
		} else {
			var mappedPartial = [];
			for (var row in mapping) {
				var include = mapping[row].every(function(mappedRow) {
					return curRowsTarget.indexOf(mappedRow) > -1;
				});
				var partial = mapping[row].some(function(mappedRow) {
					return curRowsTarget.indexOf(mappedRow) > -1;
				});
				if (curElementTarget && curElementTarget.partial) {
					partial |= mapping[row].some(function(mappedRow) {
						return curElementTarget.partial.indexOf(mappedRow) > -1;
					});
				}
				var includeAdded = mapping[row].some(function(mappedRow) {
					return addedRows.indexOf(mappedRow) > -1;
				});
				var includeRemoved = mapping[row].some(function(mappedRow) {
					return removedRows.indexOf(mappedRow) > -1;
				});
				/*if (include) {
					mappedRows.push(row);
				} else if (partial) {
					partialRows.push(row);
				}*/
				if (include && includeAdded && curRowsSource.indexOf(row) < 0) {
					mappedAdded.push(row);
				}
				if (!include && includeRemoved && curRowsSource.indexOf(row) > -1) {
					mappedRemoved.push(row);
				}
				if (!include && partial) {
					mappedPartial.push(row);
				}
			}
			partialAdded = mappedPartial.filter(function (row) {
				return curPartialRowsSource.indexOf(row) < 0;
			});
			partialRemoved = curPartialRowsSource.filter(function (row) {
				return mappedPartial.indexOf(row) < 0;
			});
		}
		var createChangeset = mappedAdded.length + mappedRemoved.length + partialAdded.length + partialRemoved.length;
		if (createChangeset) {
			mappedData.changeSet = {};
			if (mappedAdded.length > 0) {
				mappedData.changeSet.added = mappedAdded;
			}
			if (mappedRemoved.length > 0) {
				mappedData.changeSet.removed = mappedRemoved;
			}
			if (partialAdded.length > 0) {
				mappedData.changeSet.partialAdded = partialAdded;
			}
			if (partialRemoved.length > 0) {
				mappedData.changeSet.partialRemoved = partialRemoved;
			}
		}
		return mappedData;
	}

	return pageLoader;
}();
}
