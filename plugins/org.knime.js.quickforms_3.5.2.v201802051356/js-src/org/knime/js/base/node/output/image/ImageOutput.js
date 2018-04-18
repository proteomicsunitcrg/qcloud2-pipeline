/*
 * ------------------------------------------------------------------------
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.com; Email: contact@knime.com
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License, Version 3, as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, see <http://www.gnu.org/licenses>.
 *
 *  Additional permission under GNU GPL version 3 section 7:
 *
 *  KNIME interoperates with ECLIPSE solely via ECLIPSE's plug-in APIs.
 *  Hence, KNIME and ECLIPSE are both independent programs and are not
 *  derived from each other. Should, however, the interpretation of the
 *  GNU GPL Version 3 ("License") under any applicable laws result in
 *  KNIME and ECLIPSE being a combined program, KNIME GMBH herewith grants
 *  you the additional permission to use and propagate KNIME together with
 *  ECLIPSE with only the license terms in place for ECLIPSE applying to
 *  ECLIPSE and the GNU GPL Version 3 applying for KNIME, provided the
 *  license terms of ECLIPSE themselves allow for the respective use and
 *  propagation of ECLIPSE together with KNIME.
 *
 *  Additional permission relating to nodes for KNIME that extend the Node
 *  Extension (and in particular that are based on subclasses of NodeModel,
 *  NodeDialog, and NodeView) and that only interoperate with KNIME through
 *  standard APIs ("Nodes"):
 *  Nodes are deemed to be separate and independent programs and to not be
 *  covered works.  Notwithstanding anything to the contrary in the
 *  License, the License does not apply to Nodes, you are not required to
 *  license Nodes under the License, and you are granted a license to
 *  prepare and propagate Nodes, in each case even if such Nodes are
 *  propagated with or for interoperation with KNIME.  The owner of a Node
 *  may freely choose the license terms applicable to such Node, including
 *  when such Node is propagated with or for interoperation with KNIME.
 * ------------------------------------------------------------------------
 * 
 * History
 *   Oct 21, 2014 (Christian Albrecht, KNIME AG, Zurich, Switzerland): created
 */
org_knime_js_base_node_output_image = function() {
	var imageOutput = {
			version: "1.0.0"
	};
	imageOutput.name = "Image output";

	imageOutput.init = function(representation) {
		if (checkMissingData(representation)) {
			return;
		}
		
		var body = document.getElementsByTagName("body")[0];
		var width = representation.maxWidth;
		var height = representation.maxHeight;
		var div = document.createElement("div");
		div.setAttribute("class", "quickformcontainer");
		body.appendChild(div);
		if (representation.label) {
			var label = document.createElement("div");
			label.setAttribute("class", "label");
			label.appendChild(document.createTextNode(representation.label));
			div.appendChild(label);
		}
		if (representation.description) {
			div.setAttribute("title", representation.description);
		}
		
		var element = null;
		if (representation.imageFormat == "PNG") {
			var img = document.createElement("img");
			img.setAttribute("src", "data:image/png;base64," + representation.imageData);
			div.appendChild(img);
			if (width >= 0) {
				img.style.maxWidth = width + "px";
			}
			if (height >= 0) {
				img.style.maxHeight = height + "px";
			}
		} else if (representation.imageFormat == "SVG") {
			var tempContainer = document.createElement("div");
			tempContainer.innerHTML = representation.imageData;
			element = tempContainer.getElementsByTagName("svg")[0];
			div.appendChild(element);
			var originalWidth = parseInt(element.getAttribute("width"));
			var originalHeight = parseInt(element.getAttribute("height"));
			var svgWidth = originalWidth;
			var svgHeight = originalHeight;
			var svgAspect = svgWidth / svgHeight;
			if (width >= 0 && svgWidth > width) {
				svgWidth = width;
				svgHeight = svgWidth / svgAspect;
				createViewbox(element, svgWidth, svgHeight, originalWidth, originalHeight);
				element.style.overflow = "hidden";
			}
			if (height >= 0 && svgHeight > height) {
				svgHeight = height;
				svgWidth = svgHeight * svgAspect;
				createViewbox(element, svgWidth, svgHeight, originalWidth, originalHeight);
				element.style.overflow = "hidden";
			}
			element.style.width = svgWidth + "px";
			element.style.height = svgHeight + "px";
		} else {
			var errorText = "Image format not supported: " + representation.imageFormat;
			div.appendChild(document.createTextNode(errorText));
		}
		
		resizeParent();
	};
	
	createViewbox = function(element, width, height, oldWidth, oldHeight) {
		element.setAttribute("viewBox", "0 0 " + oldWidth + " " + oldHeight);
		element.setAttribute("preserveAspectRatio", "xMinYMin meet");
		element.setAttribute("width", Math.round(width));
		element.setAttribute("height", Math.round(height));
		element.style.width = Math.round(width) + "px";
		element.style.height = Math.round(height) + "px";
	}
	
	imageOutput.validate = function() {
		return true;
	};
	
	imageOutput.setValidationErrorMessage = function(message) {
		//TODO display message
	};

	imageOutput.value = function() {
		return null;
	};
	
	return imageOutput;
	
}();
