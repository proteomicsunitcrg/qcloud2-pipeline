dynamicJSNode = function() {
	
	var node = {}
	var _innerNamespace;
	var VAADIN_PREFIX = "./VAADIN/src-js/";
	var errorRendered = false;
		
	node.init = function(representation, value) {
		if (representation.errorMessage) {
			renderError(representation.errorMessage);
			return;
		}
		if (!representation.jsNamespace) {
			document.body.innerHTML = 'No data to display.';
			return;
		}
		_innerNamespace = representation.jsNamespace;
		
		// Define endsWith on strings
		String.prototype.endsWith = function(suffix) {
		    return this.indexOf(suffix, this.length - suffix.length) !== -1;
		};
		
		// Import style dependencies
		var head = document.getElementsByTagName('head')[0];
		for (var j = 0; j < representation.cssDependencies.length; j++) {
			var href = representation.cssDependencies[j];
			if (parent != undefined && parent.KnimePageLoader != undefined) {
				href = VAADIN_PREFIX + href;
			}
			var styleDep = document.createElement('link');
			styleDep.type = 'text/css';
			styleDep.rel = 'stylesheet';
			styleDep.href = href;
			head.appendChild(styleDep);
		}
		// Import own style declaration
		for (var j = 0; j < representation.cssCode.length; j++) {
			var styleElement = document.createElement('style');
			styleElement.type = 'text/css';
			styleElement.appendChild(document.createTextNode(representation.cssCode[j]));
			head.appendChild(styleElement);
		}
		
		// Import JS dependencies and call JS code after loading
		var libs = representation.jsDependencies;
		/*if (parent != undefined && parent.KnimePageLoader != undefined) {
			for (var i = 0; i < libs.length; i++) {
				if (libs[i].local) {
					// Add Vaadin-specific prefix path for local dependencies
					// when running in the WebPortal
					libs[i].path = VAADIN_PREFIX + libs[i].path;
				}
			}
		}*/

		// Build config object for RequireJS
		var depArray = [];
		var configObj = {};
		configObj.paths = {};
		configObj.shim = {};
		for (var i = 0; i < libs.length; i++) {
			if (libs[i].path.endsWith(".js")) {
				libs[i].path = libs[i].path.substr(0, libs[i].path.length - 3);
			}
			configObj.paths[libs[i].name] = libs[i].path;
			depArray.push(libs[i].name);
			if (!libs[i].usesDefine) {
				var shim = configObj.shim[libs[i].name] = {};
				if (libs[i].dependencies) {
					shim.deps = libs[i].dependencies;
				}
				if (libs[i].exports) {
					shim.exports = libs[i].exports;
				}
			}
		}
		requirejs.config(configObj);
				
		// Load dependencies with RequireJS
		require(depArray, function() {
			try {
				for (var i = 0; i < representation.jsCode.length; i++) {
					// Execute node's JavaScript code
					if (window.execScript) {
				        window.execScript(representation.jsCode[i]);
				        break;
				    }
					var fn = function() {
				        window.eval.call(window, representation.jsCode[i]);
				    };
				    fn();
				}
				// Call init function on newly created global object
				window[_innerNamespace].init(representation, value, arguments);
			} catch (e) {
				var errorString = "Error in script\n";
				if (e.stack) {
					errorString += e + "\n" + e.stack;
				} else {
					errorString += e;
				}
			    alert(errorString);
			}
		});
	};
	
	renderError = function(errorMessage) {
		var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		document.getElementsByTagName("body")[0].appendChild(svg);
		svg.setAttribute("width", "600px");
		svg.setAttribute("height", "40px");
		var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		svg.appendChild(text);
		text.setAttribute("x", "0");
		text.setAttribute("y", "20");
		text.setAttribute("font-family", "sans-serif");
		text.setAttribute("font-size", "12");
		text.appendChild(document.createTextNode(errorMessage));
		errorRendered = true;
	}
	
	node.validate = function() {
		if (!window[_innerNamespace]) {
			return false;
		}
		return window[_innerNamespace].validate();
	}
	
	node.setValidationError = function(err) {
		if (window[_innerNamespace]) {
			window[_innerNamespace].setValidationError(err);
		}
	}
	
	node.getComponentValue = function() {
		if (window[_innerNamespace]) {
			return window[_innerNamespace].getComponentValue();
		}
	}
	
	node.getSVG = function() {
		var svg;
		if (errorRendered) {
			svg = document.getElementsByTagName("svg")[0];
		} else if (window[_innerNamespace]) {
			svg = window[_innerNamespace].getSVG();
		}
		if (svg) {
			if (typeof svg === "string") {
				return svg;
			}
			if (typeof svg === "object" && svg.nodeType > 0) {
				return (new XMLSerializer()).serializeToString(svg);
			}
		}
	}
	
	return node;
	
}();