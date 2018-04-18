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
org_knime_js_base_node_output_filedownload = function() {
	var fileDownload = {
			version: "1.0.0"
	};
	fileDownload.name = "File download";
	var m_value = null;
	var viewValid = false;

	fileDownload.init = function(representation, value) {
		if (checkMissingData(representation)) {
			return;
		}
		
		var messageNotFound = "File download not available. Native component not found.";
		var messageNotStandalone = "File download only available on server.";
		insertNativeComponent(representation, messageNotFound, messageNotStandalone);
		
		var link = document.getElementsByTagName('a')[0];
		if (link) {
			//adding download attribute to force download. This works for Chrome, Firefox, Edge, Safari and Opera
			link.setAttribute('download', '');
		
			// for IE just open in new tab
			var ua = window.navigator.userAgent;
			var msie = ua.indexOf("MSIE ");
			if (msie > -1 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
				link.setAttribute("target", "_blank");
			}
		}
		
		resizeParent();
		viewValid = true;
		m_value = value;
	};
	
	fileDownload.validate = function() {
		return true;
	};
	
	fileDownload.setValidationErrorMessage = function(message) {
		//TODO display message
	};

	fileDownload.value = function() {
		if (!viewValid) {
			return null;
		}
		return m_value;
	};
	
	return fileDownload;
	
}();
