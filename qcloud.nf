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

workflowsFolder		= "$baseDir/workflows/"
fasta_folder		= "$baseDir/fasta"
blastdb_folder		= "$baseDir/blastdb"
fastaconfig = file(params.fasta_tab)
if( !fastaconfig.exists() )  { error "Cannot find any fasta tab file!!!"}


/*
* check for workflow existence
*/
shotgunWF     = file("${workflowsFolder}/module_workflow_shotgun.knwf")
if( !shotgunWF.exists() )  { error "Cannot find any module_workflow_shotgun.knwf file!!!"}
srmWF     = file("${workflowsFolder}/module_workflow_srm.knwf")
if( !srmWF.exists() )  { error "Cannot find any module_workflow_srm.knwf file!!!"}

secondStepWF     = file("${workflowsFolder}/module_parameter_QC_1001844.knwf")
if( !secondStepWF.exists() )  { error "Cannot find any module_parameter_QC_1001844.knwf!!!"}
thirdStepWF     = file("${workflowsFolder}/module_parameter_QC_1000928.knwf")
if( !thirdStepWF.exists() )  { error "Cannot find any module_parameter_QC_1000928.knwf!!!"}
fourthStepWF     = file("${workflowsFolder}/module_parameter_QC_0000048.knwf")
if( !fourthStepWF.exists() )  { error "Cannot find any module_parameter_QC_0000048.knwf!!!"}
fifthStepWF     = file("${workflowsFolder}/module_parameter_QC_1000927.knwf")
if( !fifthStepWF.exists() )  { error "Cannot find any module_parameter_QC_1000927.knwf!!!"}


shotgun_output		= "output_shotgun"
mean_it_output		= "output_mean_it"

/*
 * Create a channel for mzlfiles files; Temporary for testing purposes only
 */
Channel
   	.fromPath( params.zipfiles )             
   	.ifEmpty { error "Cannot find any file matching: ${params.zipfiles}" }
   	.map { 
        file = it
        id = it.getName()
        ext = params.rawfiles.tokenize( '/' )
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
	.set {qconfig_desc}

/*
 * Run msconvert on raw data.
*/

process msconvert {
	publishDir	"conversion"
	
	tag { "${labsys}_${qcode}_${checksum}" }

    input:
    set labsys, qcode, checksum, file(zipfile) from zipfiles

    output:
    set val("${labsys}_${qcode}_${checksum}"), qcode, file("${labsys}_${qcode}_${checksum}.mzML") into mzmlfiles_for_correction
    
    script:
    """
	curl --user "webdav:${params.webdavpass}" -T "${zipfile}" "http://${params.webdavip}/input/${labsys}_${qcode}_${checksum}.zip"
	curl -X GET http://${params.webdavip}/index.php?input=${labsys}_${qcode}_${checksum}.zip
	curl --user 'webdav:${params.webdavpass}' -X GET http://${params.webdavip}/output/${labsys}_${qcode}_${checksum}.mzML > ${labsys}_${qcode}_${checksum}.mzML
	curl --user 'webdav:${params.webdavpass}' -X DELETE http://${params.webdavip}/output/${labsys}_${qcode}_${checksum}.mzML
	curl --user 'webdav:${params.webdavpass}' -X DELETE http://${params.webdavip}/input/${labsys}_${qcode}_${checksum}.zip  
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
 	set sample_id, qcode, file(mzML_file) from (mzmlfiles_for_correction)
 
    output:
	set qcode, sample_id, file("${sample_id}.ok.mzML") into corrected_mzmlfiles_for_second_step
	set qcode, sample_id, file("${sample_id}.mzML") into mzmlfiles_for_first_step


   """  
   	if [ `echo ${mzML_file} | grep 'gz'` ]; then zcat ${mzML_file} > ${sample_id}.mzML; \
	sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${sample_id}.mzML > ${sample_id}.ok.mzML; \
   	else sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${mzML_file} > ${sample_id}.ok.mzML; fi
   """
}

input_pipe_withcode_reordered = corrected_mzmlfiles_for_second_step.combine(qconfig_desc,by: 0).map{
  qc_id, sample_id, file, genome, analysis -> [genome, qc_id, sample_id, file, analysis]
}

input_pipe_complete_first_step = input_pipe_withcode_reordered.combine(blastdbs, by: 0)


/*
 * Run shotgun on raw data. 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
*/


process run_shotgun {
	   publishDir shotgun_output	   
	   tag { sample_id }
	
		input:
		set genome_id, internal_code,sample_id, file(mzML_file), analysis_type, fasta_file, file ("*") from input_pipe_complete_first_step
		file(workflowfile) from shotgunWF
		
		when:
		analysis_type == 'shotgun'

		output:
		set sample_id, file("${sample_id}.qcml") into qcmlfiles_for_second_step
		set sample_id, file("${sample_id}.featureXML") into featureXMLfiles_for_second_step
		set sample_id, file("${sample_id}.idXML") into idXMLfiles_for_second_step

		
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
 * Run Second step 
*/
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