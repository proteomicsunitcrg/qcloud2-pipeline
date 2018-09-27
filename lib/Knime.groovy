/* 
 * Class for launching Knime program
 *
 * @authors
 * Luca Cozzuto <luca.cozzuto@crg.es>
 */
 
 class Knime {

	/*
	 * Properties definition
	 */
	
     String wf        = ''
     String mem       = ''
     String mzml      = ''
     String csvpep    = ''
     String qcml      = ''
     String qccv      = ''
     String qccvp     = ''
     String chksum    = ''
     String featxml   = ''
     String ojfile    = ''
     String ojid      = ''
     String ijfile    = ''
     String stype     = ''
     String extrapars = ''
     String ifolder = "."
     String ofolder   = '"."'
     String work      = ''
     String labs      = '' 
     String utoken    = ''
     String uifile    = ''
     String uidata    = ''
    
	/* 
	 *  Sorting bam files with samtools
 	 */	


    def public assemble() {
        def string = "knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave "
    	string +=  "-workflowFile=${this.wf} "
    	if (this.mzml) {string +=  "-workflow.variable=input_mzml_file,${this.mzml},String " }
    	if (this.qcml) {string +=  "-workflow.variable=input_qcml_file,${this.qcml},String " }
    	if (this.qccv) {string +=  "-workflow.variable=input_string_qccv,${this.qccv},String " }
    	if (this.qccvp) {string +=  "-workflow.variable=input_string_qccv_parent,${this.qccvp},String " }
    	if (this.chksum) {string +=  "-workflow.variable=input_string_checksum,${this.chksum},String " }
    	if (this.csvpep) {string +=  "-workflow.variable=input_csv_file,${this.csvpep},String " }
    	if (this.featxml) {string +=  "-workflow.variable=input_featurexml_file,${this.featxml},String " }
    	if (this.ijfile)  {string +=  "-workflow.variable=input_json_filename,${this.ijfile},String " }
    	if (this.stype) {string +=  "-workflow.variable=input_sample_type,${this.stype},String " }
    	if (this.labs) {string +=  "-workflow.variable=input_string_labsystem,${this.labs},String " }
    	if (this.utoken) {string +=  "-workflow.variable=input_url_token,http://${this.utoken},String " }
    	if (this.uifile) {string +=  "-workflow.variable=input_url_insert_file,http://${this.uifile},String " }
    	if (this.uidata) {string +=  "-workflow.variable=input_url_insert_data,http://${this.uidata},String " }
		string += "-workflow.variable=output_json_folder,${this.ofolder},String "
		string += "-workflow.variable=input_json_folder,${this.ifolder},String "
    	if (this.ojfile) {string +=  "-workflow.variable=output_json_filename,${this.ojfile},String " }
    	if (this.ojid) {string +=  "-workflow.variable=output_json_id,${this.ojid},String " }
		string += "-vmArgs -Xmx${this.mem} -Duser.home=\$PWD"
    	return string
	}

    def public launch() {
		def cmdline = this.assemble()
   		"""
   		    mkdir tmpdir
            export TMPDIR=\$PWD/tmpdir
			${cmdline}
    	"""
	}


	
}
