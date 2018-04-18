knime_decision_tree = function() {
    var input = {};
    var _data = {};
    var layoutContainer;
    var MIN_HEIGHT = 300, MIN_WIDTH = 400;
    var maxY = 0, minY = 0;
    var defaultFont = "sans-serif";
	var defaultFontSize = 12;
    var _representation, _value;
    var decTreeDrawer;
    
    input.init = function(representation, value) {
    	if (!representation || !representation.tree) {
			d3.select('body').append("p")
				.text("Error: No data available");
			return;
		}
    	// Store value and representation for later
        _value = value;
        _representation = representation;
        
        decTreeDrawer = new DecTreeDrawer(_representation, _value);
        var tableCreator = decTreeDrawer.createClassTableCreator(50, 5);
        
     // majority class panel
        decTreeDrawer.addPanel(decTreeDrawer.createSimpleTextPanel("classCounts", 1, function(d, meta) {
        		var sum = 0, max = 0, maxIdx = 0;
        		var i;
        		var classCounts = d.content.classCounts;
        		for (i = 0; i < classCounts.length; i++) {
        			if (classCounts[i] > max) {
        				max = classCounts[i];
        				maxIdx = i;
        			}
        			sum += classCounts[i];
        		}
        		
        		
                return meta.classNames[maxIdx] + " (" + decTreeDrawer.formatNumber(max) + "/" + decTreeDrawer.formatNumber(sum) + ")";
            }));

        // class table
        decTreeDrawer.addPanel(decTreeDrawer.createCollapsiblePanel("classCounts", 2, function(d) {
                return "Table:";
            }, tableCreator.createClassTable, tableCreator.tableWidth, tableCreator.tableHeight));
        
        decTreeDrawer.init();
        var win = document.defaultView || document.parentWindow;
        win.onresize = resize;
    }

    input.getSVG = function() {
//        var svg = d3.select("svg")[0][0];
//    	var svg = d3.select("svg").node();
    	var svg = decTreeDrawer.getSVG();
        return (new XMLSerializer()).serializeToString(svg);
    };
    
    function resize(event) {
//        drawChart(true);
    	decTreeDrawer.resize();
    };
    

    input.validate = function() {
        return true;
    }

    input.getComponentValue = function() {
//    	_value.nodeStatus = decTreeDrawer.nodeStatus;
//    	_value.selection = decTreeDrawer.getSelection();
//        return _value;
    	if (decTreeDrawer) {
    		return decTreeDrawer.getValue();
    	}
    }

    return input;

}();