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
     String mem       = '2G'
     String mzml      = ''
     String csvpep    = ''
     String qcml      = ''
     String oqcml     = ''
     String qccv      = ''
     String qccvp     = ''
     String fasta     = ''
     String chksum    = ''
     String featxml   = ''
     String psq		  = ''
     String ofeatxml  = ''
     String oidxml    = ''
     String ojfile    = ''
     String ojid      = ''
     String ijfile    = ''
     String stype     = ''
     String ifolder   = "."
     String ofolder   = '"."'
     String work      = ''
     String labs      = '' 
     String utoken    = ''
     String uifile    = ''
     String uidata    = ''
     String srmCSV    = ''
     String rdate     = ''
     String oriname   = ''
     String extrapars = ''
     String empty_out_file = 'empty.json'
    
	/* 
	 *  Sorting bam files with samtools
 	 */	


    def public assemble() {
        def string = "knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave "
    	string +=  "-workflowFile=${this.wf} "
    	if (this.mzml) {string +=  "-workflow.variable=input_mzml_file,${this.mzml},String " }
    	if (this.qcml) {string +=  "-workflow.variable=input_qcml_file,${this.qcml},String " }
    	if (this.srmCSV) {string +=  "-workflow.variable=input_traml,${this.srmCSV},String " }
    	if (this.qccv) {string +=  "-workflow.variable=input_string_qccv,${this.qccv},String " }
    	if (this.qccvp) {string +=  "-workflow.variable=input_string_qccv_parent,${this.qccvp},String " }
    	if (this.chksum) {string +=  "-workflow.variable=input_string_checksum,${this.chksum},String " }
    	if (this.csvpep) {string +=  "-workflow.variable=input_csv_file,${this.csvpep},String " }
    	if (this.featxml) {string +=  "-workflow.variable=input_featurexml_file,${this.featxml},String " }
    	if (this.fasta) {string +=  "-workflow.variable=input_fasta_file,${this.fasta},String " }
    	if (this.psq) {string +=  "-workflow.variable=input_fasta_psq_file,${this.psq},String " }
    	if (this.ijfile)  {string +=  "-workflow.variable=input_json_filename,${this.ijfile},String " }
    	if (this.stype) {string +=  "-workflow.variable=input_sample_type,${this.stype},String " }
    	if (this.labs) {string +=  "-workflow.variable=input_string_labsystem,${this.labs},String " }
    	if (this.utoken) {string +=  "-workflow.variable=input_url_token,http://${this.utoken},String " }
    	if (this.uifile) {string +=  "-workflow.variable=input_url_insert_file,http://${this.uifile},String " }
    	if (this.uidata) {string +=  "-workflow.variable=input_url_insert_data,http://${this.uidata},String " }
		string += "-workflow.variable=output_json_folder,${this.ofolder},String "
		string += "-workflow.variable=input_json_folder,${this.ifolder},String "
    	if (this.ofeatxml) {string +=  "-workflow.variable=output_featurexml_file,${this.ofeatxml},String " }
    	if (this.oqcml) {string +=  "-workflow.variable=output_qcml_file,${this.oqcml},String " }
    	if (this.oidxml) {string +=  "-workflow.variable=output_idxml_file,${this.oidxml},String " }
    	if (this.ojfile) {string +=  "-workflow.variable=output_json_filename,${this.ojfile},String " }
    	if (this.ojid) {string +=  "-workflow.variable=output_json_id,${this.ojid},String " }
    	if (this.rdate) {string +=  "-workflow.variable=input_mass_spec_run_date,${this.rdate},String " }
    	if (this.oriname) {string +=  "-workflow.variable=input_original_filename,${this.oriname},String " }    	
    	if (this.extrapars) {string += " ${this.extrapars} " }
		string += "-vmArgs -Xmx${this.mem} -Duser.home=\$PWD"
    	return string
	}

    def public launch() {
		def cmdline = this.assemble()
   		"""
   		    mkdir tmpdir
            export TMPDIR=\$PWD/tmpdir
			if ! ${cmdline}; then
				touch ${this.empty_out_file}
			fi
    	"""
	}


	
}
