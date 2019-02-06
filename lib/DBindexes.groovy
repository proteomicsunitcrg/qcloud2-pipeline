 class DBindexes {

	public getCorrespondence() {
		// Correspondences between db analysis name, QC_ID and ID ofr db insert
		def Correspondence = [:]
		//MS2specCount
		Correspondence["MS2specCount"] = ["shotgun" : "0000007", "shotgun_qc4l_cid" : "1002001", "shotgun_qc4l_hcd" : "1002009", "shotgun_qc4l_etcid" : "1002017", "shotgun_qc4l_ethcd" : "1002025"]
		//totNumOfUniPep
		Correspondence["totNumOfUniPep"] = ["shotgun" : "0000031", "shotgun_qc4l_cid" : "1002002", "shotgun_qc4l_hcd" : "1002010", "shotgun_qc4l_etcid" : "1002018", "shotgun_qc4l_ethcd": "1002026"] 
		//totNumOfUniProt
		Correspondence["totNumOfUniProt"] = ["shotgun" : "0000032", "shotgun_qc4l_cid" : "1002003", "shotgun_qc4l_hcd" : "1002011", "shotgun_qc4l_etcid" : "1002019", "shotgun_qc4l_ethcd" : "1002027"]
		//TotNumOfPsm NEW
		Correspondence["totNumOfPsm"] = ["shotgun" : "0000029", "shotgun_qc4l_cid" : "1002004", "shotgun_qc4l_hcd" : "1002012", "shotgun_qc4l_etcid" : "1002020", "shotgun_qc4l_ethcd" : "1002028"]
		//medianITMS1 NEW
		Correspondence["medianITMS1"] = ["shotgun" : "1000927", "shotgun_qc4l_cid" : "1000933", "shotgun_qc4l_hcd" : "1000934", "shotgun_qc4l_etcid" : "1000935", "shotgun_qc4l_ethcd" : "1000936"]
		//tic NEW
		Correspondence["tic"] = ["shotgun" : "0000048", "shotgun_qc4l_cid" : "1000937", "shotgun_qc4l_hcd" : "1000938", "shotgun_qc4l_etcid" : "1000939", "shotgun_qc4l_ethcd" : "1000940"]
		//medianITMS2
		Correspondence["medianITMS2"] = ["shotgun" : "1000928", "shotgun_qc4l_cid" : "1002005", "shotgun_qc4l_hcd" : "1002013", "shotgun_qc4l_etcid" : "1002021", "shotgun_qc4l_ethcd" : "1002029"] 
		//pepArea
		Correspondence["pepArea"] = ["shotgun" : "1001844", "srm" : "???"]
		Correspondence["pepArea_qc4l"] = ["shotgun_qc4l_hcd" : "1001844"]
		//massAccuracy
		Correspondence["massAccuracy"] = ["shotgun" : "1000014", "srm" : "???", "shotgun_qc4l_cid" : "1002007", "shotgun_qc4l_hcd" : "1002015", "shotgun_qc4l_etcid" : "1002023", "shotgun_qc4l_ethcd" : "1002031"]
		//medianFwhm
		Correspondence["medianFwhm"] = ["shotgun" : "1010086", "srm" : "???", "shotgun_qc4l_cid" : "1002008", "shotgun_qc4l_hcd" : "1002016", "shotgun_qc4l_etcid" : "1002024", "shotgun_qc4l_ethcd" : "1002032"]

			return Correspondence
	}

	def public getOntology() {

		// ontology this has to be retrieved in some way from outside...
		def ontology = [:]
		ontology["0000007"] = "9000001"
		ontology["0000029"] = "9000001"
		ontology["0000031"] = "9000001"
		ontology["0000032"] = "9000001"
		ontology["1000928"] = "9000002"
		ontology["1001844"] = "1001844"
		ontology["1000014"] = "1000014"
		ontology["1010086"] = "9000003"
		ontology["1002001"] = "9000001"
		ontology["1002002"] = "9000001"
		ontology["1002003"] = "9000001"
		ontology["1002004"] = "9000001"
		ontology["1002005"] = "9000002"
		ontology["1002007"] = "1002007"
		ontology["1002008"] = "9000003"

		ontology["1002009"] = "9000001"
		ontology["1002010"] = "9000001"
		ontology["1002011"] = "9000001"
		ontology["1002012"] = "9000001"
		ontology["1002013"] = "9000002"
		ontology["1002015"] = "1002015"
		ontology["1002016"] = "9000003"

		ontology["1002017"] = "9000001"
		ontology["1002018"] = "9000001"
		ontology["1002019"] = "9000001"
		ontology["1002020"] = "9000001"
		ontology["1002021"] = "9000002"
		ontology["1002023"] = "1002023"
		ontology["1002024"] = "9000003"

		ontology["1002025"] = "9000001"
		ontology["1002026"] = "9000001"
		ontology["1002027"] = "9000001"
		ontology["1002028"] = "9000001"
		ontology["1002029"] = "9000002"
		ontology["1002031"] = "1002031"
		ontology["1002032"] = "9000003"
		ontology["1000927"] = "9000002"
		ontology["1000933"] = "9000002"
		ontology["1000934"] = "9000002"
		ontology["1000935"] = "9000002"
		ontology["1000936"] = "9000002"
		ontology["0000048"] = "0000048"

		ontology["QC01"] = "0000005"
		ontology["QC02"] = "0000006"
		ontology["QC03"] = "0000009" 
		ontology["QCS1"] = "0000005"
		ontology["QCS2"] = "0000006"

		return ontology
	}

}
