#!/usr/bin/env nextflow

/*
 * Copyright (c) 2018, Centre for Genomic Regulation (CRG) and the authors.
 *
 */

/* 
 * Micro RNASeq pipeline script for Bioinformatics Core @ CRG
 *
 * @authors
 * Luca Cozzuto <lucacozzuto@gmail.com>
 * Toni Hermoso <lucacozzuto@gmail.com>
 * Roger Olivella <lucacozzuto@gmail.com>
 *
 * 
 */

                                                          
params.help            = false
params.resume          = false

/*
* PIPELINE 
*/

version = 2.0

log.info "BIOCORE@CRG microRNASeq - N F  ~  version ${version}"
log.info "========================================"
log.info "id (internal id) 					: ${params.id}"
log.info "mzlfiles (input files) 			: ${params.mzlfiles}"
log.info "rawfiles (input files) 		    : ${params.rawfiles}"
log.info "qconfig (config file) 			: ${params.qconfig}"
log.info "fasta_tab (tsv file)				: ${params.fasta_tab}"
log.info "email for notification 			: ${params.email}"
log.info "\n"

if (params.help) {
    log.info 'This is the QCloud pipeline'
    log.info '\n'
    exit 1
}

if (params.resume) exit 1, "Are you making the classical --resume typo? Be careful!!!! ;)"

workflowsFolder		= "$baseDir/workflows/"
fasta_folder		= "$baseDir/fasta"
blastdb_folder		= "$baseDir/blastdb"
fastaconfig = file(params.fasta_tab)
if( !fastaconfig.exists() )  { error "Cannot find any fasta tab file!!!"}


/*
* check for workflow existence
*/
firstStepWF     = file("${workflowsFolder}/module_workflow_shotgun.knwf")
if( !firstStepWF.exists() )  { error "Cannot find any module_workflow_shotgun.knwf file!!!"}

secondStepWF     = file("${workflowsFolder}/module_parameter_featurexml.knwf")
if( !secondStepWF.exists() )  { error "Cannot find any module_parameter_featurexml.knwf!!!"}

thirdStepWF     = file("${workflowsFolder}/module_parameter_it_ms1.knwf")
if( !secondStepWF.exists() )  { error "Cannot find any module_parameter_it_ms1.knwf!!!"}

fourthStepWF     = file("${workflowsFolder}/module_parameter_it_ms2.knwf")
if( !secondStepWF.exists() )  { error "Cannot find any module_parameter_it_ms2.knwf!!!"}

fifthStepWF     = file("${workflowsFolder}/module_parameter_tic_sum.knwf")
if( !secondStepWF.exists() )  { error "Cannot find any module_parameter_tic_sum.knwf!!!"}


shotgun_output		= "output_shotgun"
mean_it_output		= "output_mean_it"

/*
 * Create a channel for raw files 
 */
Channel
   	.fromFilePairs( params.rawfiles, size: 1)                
   	.ifEmpty { error "Cannot find any file matching: ${params.rawfiles}" }
    .set { rawfiles_for_correction }

/*
 * Create a channel for mzlfiles files; Temporary for testing purposes only
 */
Channel
   	.fromFilePairs( params.mzlfiles, size: 1)                                             
   	.ifEmpty { error "Cannot find any file matching: ${params.mzlfiles}" }
    .set { mzmlfiles_for_correction }    


/*
 * Create a channel for fasta files description
 */

Channel
    .from(fastaconfig.readLines())
    .map { line ->
        list = line.split("\t")
        genome_id = list[0]
        internal_db = list[1]
        fasta_file_name = list[2]
		fasta_path = file("${fasta_folder}/${fasta_file_name}")
	    [genome_id, fasta_file_name, internal_db, fasta_path]
    }
    .set{ fasta_desc }

/*
* Read the config file and get genome and workflow information
*/
genome = ""
qconfig = file(params.qconfig)
if( !qconfig.exists() )  { error "Cannot find any qconfig tab file!!!"}
qconfig.readLines().each { 
    list = it.split("\t")
    internal_code = list[0]
	if (internal_code == "${params.id}") {
	    genome		 	 = list[1]
   		workflow_type	 = list[2]
    }
}
if (genome == "") {
	 exit 1,  "ERROR ~ Unknown internal code ${internal_code}!! Please specify a valid one\n";
} else {
	print "** Analyzing ${params.id}. Genome: ${genome}. WorkFlow: ${workflow_type}**\n"
}


/*
 * Run makeblastdb on fasta data
*/
process makeblastdb {
	publishDir	blastdb_folder
	tag { genome_id }

    input:
    set genome_id, fasta_file, internal_dbfile, file(fasta_path) from fasta_desc

    output:
    set genome_id, internal_dbfile, file ("*") into blastdbs
    
    script:
    """
		if [ `echo ${fasta_file} | grep 'gz'` ]; then zcat ${fasta_file} > ${internal_dbfile}; else ln -s ${fasta_file} ${internal_dbfile}; fi
		makeblastdb -dbtype prot -in ${internal_dbfile} -out ${internal_dbfile}
    """
}

/*
 * Run batch correction on mzl and eventually unzip the input file
 * We remove the string xmlns="http://psi.hupo.org/ms/mzml" since it can causes problem with some executions
*/
process correctMzl {

   tag { sample_id }
   
    input:
 	set sample_id, file(mzML_file) from (mzmlfiles_for_correction)
 
    output:
	set sample_id, file("${sample_id}.ok.mzML") into corrected_mzmlfiles_for_second_step
	set sample_id, file("${sample_id}.mzML") into mzmlfiles_for_first_step


   """  
   	if [ `echo ${mzML_file} | grep 'gz'` ]; then zcat ${mzML_file} > ${sample_id}.mzML; \
	sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${sample_id}.mzML > ${sample_id}.ok.mzML; \
   	else sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${mzML_file} > ${sample_id}.ok.mzML; fi
   """
}


/*
 * Run FirstStep on raw data. 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
*/
if (workflow_type == "shotgun") {

	print "\n$genome\t$workflow_type\n"
	process run_shotgun {
	   publishDir shotgun_output

	   tag { sample_id }
	
		input:
		set sample_id, file(mzML_file) from (mzmlfiles_for_first_step)
		file(workflowfile) from firstStepWF
		set genome_id, fasta_file, file ("*") from blastdbs.filter { /"${genome}"/  }
		
		output:
		set sample_id, file("${sample_id}.qcml") into qcmlfiles
		set sample_id, file("${sample_id}.featureXML") into featureXMLfiles_for_second_step
		set sample_id, file("${sample_id}.idXML") into idXMLfiles

	   """
	   export _JAVA_OPTIONS='-Djava.awt.headless=true'

		knime  --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
		-workflowFile=${workflowfile} \
		-workflow.variable=input_mzml_file,${mzML_file},String \
		-workflow.variable=output_qcml_file,${sample_id}.qcml,String \
		-workflow.variable=output_featurexml_file,${sample_id}.featureXML,String \
		-workflow.variable=output_idxml_file,${sample_id}.idXML,String \
		-workflow.variable=input_fasta_file,${fasta_file},String \
		-workflow.variable=input_fasta_psq_file,${fasta_file}.psq,String \
	   """
	}
} else if (workflow_type == "srm") {

}


/*
 * Step 3. Run Second step 

process mean_it {
	publishDir mean_it_output

   tag { sample_id }
   
    input:
	set sample_id, file(mzML_file), file(featureXML_file) from corrected_mzmlfiles_for_second_step.combine(featureXMLfiles_for_second_step, by: 0)
    file(workflowfile) from secondStepWF

    output:
	set sample_id, file("${sample_id}_ident_pep.csv") into mean_it_ident_pep_files

   """
	knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION \
	-reset -nosave -workflowFile="${workflowfile}" \
	-workflow.variable=input_featurexml_file,${featureXML_file},String \
	-workflow.variable=input_mzml_file,${mzML_file},String
    -workflow.variable=output_csv_file,${sample_id}_ident_pep.csv,String
	"""
}
*/