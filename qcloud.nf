#!/usr/bin/env nextflow

/*
 * Copyright (c) 2018, Centre for Genomic Regulation (CRG) and the authors.
 *
 */

/* 
 * Qcloud pipeline by Bioinformatics Core & Proteomics Core @ CRG
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

log.info "BIOCORE@CRG Qcloud - N F  ~  version ${version}"
log.info "========================================"
log.info "zipfiles (input files) 		    : ${params.zipfiles}"
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

// Data folders
workflowsFolder		= "$baseDir/workflows/"
fasta_folder		= "$baseDir/fasta"
blastdb_folder		= "$baseDir/blastdb"
CSV_folder			= "$baseDir/csv"

fastaconfig = file(params.fasta_tab)
if( !fastaconfig.exists() )  { error "Cannot find any fasta tab file!!!"}

/*
* File needed
*/
srmCSV = file("${CSV_folder}/qtrap_bsa.traml")
peptideCSV = file("${CSV_folder}/knime_peptides_final.csv")


/*
* check for workflow existence
*/
shotgunWF     = file("${workflowsFolder}/module_workflow_shotgun.knwf")
if( !shotgunWF.exists() )  { error "Cannot find any module_workflow_shotgun.knwf file!!!"}
srmWF     = file("${workflowsFolder}/module_workflow_srm.knwf")
if( !srmWF.exists() )  { error "Cannot find any module_workflow_srm.knwf file!!!"}


thirdStepWF     = file("${workflowsFolder}/module_parameter_QC_1001844.knwf")
if( !thirdStepWF.exists() )  { error "Cannot find any module_parameter_QC_1001844.knwf!!!"}




fourthStepWF     = file("${workflowsFolder}/module_parameter_QC_0000048.knwf")
if( !fourthStepWF.exists() )  { error "Cannot find any module_parameter_QC_0000048.knwf!!!"}
fifthStepWF     = file("${workflowsFolder}/module_parameter_QC_1000927.knwf")
if( !fifthStepWF.exists() )  { error "Cannot find any module_parameter_QC_1000927.knwf!!!"}


shotgun_output		= "output_shotgun"
srm_output			= "srm_output"
mean_it_output		= "output_mean_it"
peptide_area		= "peptide_area"

/*
 * Create a channel for mzlfiles files; Temporary for testing purposes only
 */
Channel
   	.fromPath( params.zipfiles )             
   	.ifEmpty { error "Cannot find any file matching: ${params.zipfiles}" }
   	.map { 
        file = it
        id = it.getName()
        ext = params.zipfiles.tokenize( '/' )
        pieces = id.tokenize( '_' )
        len = ext[-1].length()
        [pieces[0], pieces[1], pieces[2][0..-len], file]
    }.set { zipfiles }

 
 
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
    .into{ fasta_desc; blastdb_desc }

/*
* Read the config file and get genome and workflow information
*/
qconfig = file(params.qconfig)
if( !qconfig.exists() )  { error "Cannot find any qconfig tab file!!!"}

Channel
    .from(qconfig.readLines())
    .map { line ->
    list = line.split("\t")
    internal_code = list[0]
	genome		 	 = list[1]
   	workflow_type	 = list[2]
 	[internal_code, genome, workflow_type]
  	}
	.set{qconfig_desc}



/*
 * Run msconvert on raw data.
*/

process msconvert {
	publishDir	"conversion"
	
	tag { "${labsys}_${qcode}_${checksum}" }

    input:
    set labsys, qcode, checksum, file(zipfile) from zipfiles

    output:
    set val("${labsys}_${qcode}_${checksum}"), qcode, checksum, file("${labsys}_${qcode}_${checksum}.mzML") into mzmlfiles_for_correction
    
    script:
    extrapar = ""
    if (qcode =~'QCS') {
    	extrapar = "-a"
    }
    """
    bash webservice.sh ${extrapar} -l ${labsys} -q ${qcode} -c ${checksum} -r ${zipfile} -i ${params.webdavip} -p ${params.webdavpass} -o ${labsys}_${qcode}_${checksum}.mzML.zip
	unzip ${labsys}_${qcode}_${checksum}.mzML.zip
	"""
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
 	set sample_id, qcode, checksum, file(mzML_file) from (mzmlfiles_for_correction)
 
    output:
	set qcode, sample_id, checksum, file("${sample_id}.ok.mzML") into corrected_mzmlfiles_for_second_step

   """  
   	if [ `echo ${mzML_file} | grep 'gz'` ]; then zcat ${mzML_file} > ${sample_id}.mzML; \
	sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${sample_id}.mzML > ${sample_id}.ok.mzML; \
   	else sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${mzML_file} > ${sample_id}.ok.mzML; fi
   """
}

input_pipe_withcode_reordered = corrected_mzmlfiles_for_second_step.combine(qconfig_desc,by: 0).map{
  qc_id, sample_id, checksum, file, genome, analysis -> [genome, qc_id, sample_id, file, analysis, checksum]
}

input_pipe_complete_first_step = input_pipe_withcode_reordered.combine(blastdbs, by: 0)


input_pipe_complete_first_step
     .into{ input_pipe_complete_first_step_for_srm; input_pipe_complete_first_step_for_shotgun; cazz }

/*
 * Run shotgun on raw data. 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
*/


process run_shotgun {
	   publishDir shotgun_output	   
	   tag { sample_id }
	   
       label 'big_mem'
       
		input:
		set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun
		file(workflowfile) from shotgunWF
		
		when:
		analysis_type == 'shotgun'

		output:
		set sample_id, internal_code, checksum, file("${sample_id}.featureXML") into featureXMLfiles_shot_for_calc_peptide_area

		set sample_id, file("${sample_id}.idXML") into idXMLfiles_for_second_step_shot
		set sample_id, file("${sample_id}.qcml") into qcmlfiles_for_second_step_shot

		
	   """
		knime -data \$PWD -clean -consoleLog --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
		-workflowFile=${workflowfile} \
		-workflow.variable=input_mzml_file,${mzML_file},String \
		-workflow.variable=output_qcml_file,${sample_id}.qcml,String \
		-workflow.variable=output_featurexml_file,${sample_id}.featureXML,String \
		-workflow.variable=output_idxml_file,${sample_id}.idXML,String \
		-workflow.variable=input_fasta_file,${fasta_file},String \
		-workflow.variable=input_fasta_psq_file,${fasta_file}.psq,String \
    	-vmArgs -Xmx${task.memory.mega-5000}m -Duser.home=\$PWD 	
	   """
}

/*
 * Run srm on raw data. 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process run_srm {
	   publishDir srm_output	   
	   tag { sample_id }

       label 'big_mem'
	
		input:
		set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_srm
		file(workflowfile) from srmWF
		file(srmCSV)
		
		when:
		analysis_type == 'srm'

		output:
		set sample_id, internal_code, checksum, file("${sample_id}.featureXML") into featureXMLfiles_srm_for_calc_peptide_area
		
	   """
	   knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
		-workflowFile=${workflowfile} \
	   	-workflow.variable=input_mzml_file,${mzML_file},String \
		-workflow.variable=input_traml,${srmCSV},String \
	 	-workflow.variable=output_featurexml_file,${sample_id}.featureXML,String \
    	-vmArgs -Xmx${task.memory.mega-5000}m -Duser.home=\$PWD 	
	   """
}


/*
 * Run Second step 
 * think about moving the QC ID OUT OF THE COMMAND LINE
 * Why do we have checksum here?
*/
process calc_peptide_area {
	publishDir peptide_area

   tag { sample_id }
   
    input:
	set sample_id, internal_code, checksum, file(featureXML_file) from featureXMLfiles_shot_for_calc_peptide_area.mix(featureXMLfiles_srm_for_calc_peptide_area)
    file(workflowfile) from thirdStepWF

    output:
	set sample_id, file("${sample_id}.json") into mean_it_ident_pep_files

   """
 	knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION \
	-reset -nosave -workflowFile=${workflowfile}\
    -workflow.variable=input_csv_file,${peptideCSV},String \
    -workflow.variable=input_featurexml_file,${featureXML_file},String \
    -workflow.variable=input_sample_type,internal_code,String \
    -workflow.variable=input_string_checksum,${checksum},String \
    -workflow.variable=input_string_qccv,QC_1001844,String \
    -workflow.variable=output_json_file,${sample_id}.json,String \
    -workflow.variable=output_json_folder,'.',String \
    -vmArgs -Xmx${task.memory.mega-5000}m -Duser.home=\$PWD 	
	"""
}
