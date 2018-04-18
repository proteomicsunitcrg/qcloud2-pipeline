(newTableTest = function() {
	
	var view = {};
	var _representation, _value;
	
	view.init = function(representation, value) {
	    _representation = representation;
	    _value = value;
	    
	    //TODO create tables that differ from input
	    //for now this test only covers default behavior
	    _value.tables.emptyTableOutput = _representation.inObjects[0];
	    _value.tables.emptyTableOutput["@class"] = "org.knime.js.core.JSONDataTable";
	    _value.tables.emptyWithSpecOutput = _representation.inObjects[0];
	    _value.tables.emptyWithSpecOutput["@class"] = "org.knime.js.core.JSONDataTable";
	    _value.tables.inputTableOutput = _representation.inObjects[0];
	    _value.tables.inputTableOutput["@class"] = "org.knime.js.core.JSONDataTable";
	}
	
	view.validate = function() {
	    return true;
	  }
	
	view.getComponentValue = function() {
		return _value;
	}
	
	return view;
	
}());