knime_generic_view = function() {
	
	view = {};
	var _representation;
	
	view.init = function(representation, value) {
		_representation = representation;
		if (representation.jsCode == null) {
			document.body.innerHTML = 'Error: No script available.';
		} else {
			// Define KNIME table and set data
			if (representation.table) {
				var knimeDataTable = new kt();
				knimeDataTable.setDataTable(representation.table);
			}
			
			// Import style dependencies
			var head = document.getElementsByTagName('head')[0];
			if (representation.cssDependencies) {
				for ( var j = 0; j < representation.cssDependencies.length; j++) {
					var styleDep = document.createElement('link');
					styleDep.type = 'text/css';
					styleDep.rel = 'stylesheet';
					styleDep.href = representation.cssDependencies[j];
					head.appendChild(styleDep);
				}
			}
			// Import own style declaration
			var styleElement = document.createElement('style');
			styleElement.type = 'text/css';
			styleElement.appendChild(document.createTextNode(representation.cssCode));
			head.appendChild(styleElement);
			
			// Import JS dependencies and call JS code after loading
			var libs = representation.jsDependencies;
			if (!libs) {
				libs = [];
			}
			if (parent != undefined && parent.KnimePageLoader != undefined) {
				for (var i = 0; i < libs.length; i++) {
					libs[i] = "./VAADIN/src-js/" + libs[i];
				}
			}
			
			require(libs, function() {
				try {
				    eval(representation.jsCode); 
				} catch (e) {
					var errorString = "Error in script\n";
					if (e.stack) {
						errorString += e.stack;
					} else {
						errorString += e;
					}
				    alert(errorString);
				}
			});
		}
	};
	
	view.validate = function() {
		return true;
	};
	
	view.getComponentValue = function() {
		return null;
	};
	
	view.getSVG = function() {
		try {
			return eval('(function() {' + _representation.jsSVGCode + '}())');
		} catch (e) {
			return null;
		}
	}
	
	return view;
}();