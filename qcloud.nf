#!/usr/bin/env nextflow

/*
 * Copyright (c) 2018, Centre for Genomic Regulation (CRG) and the authors.
 *
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


/*
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
log.info "mzlfiles (input files) 			: ${params.mzlfiles}"
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
fastaconfig = file(params.fasta_tab)
if( !fastaconfig.exists() )  { error "Cannot find any fasta tab file!!!"}

firstStepWF     = file("${workflowsFolder}/module_workflow_shotgun_bsa.knwf")
if( !firstStepWF.exists() )  { error "Cannot find any module_workflow_shotgun_bsa.knwf file!!!"}
secondStepWF     = file("${workflowsFolder}/module_parameter_mean_it.knwf")
if( !secondStepWF.exists() )  { error "Cannot find any module_parameter_mean_it.knwf file!!!"}


shotgun_bsa_output	= "output_shotgun_bsa"
mean_it_output		= "output_mean_it"

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
        internal_db = list[0]
        fasta_file_name = list[1]
		fasta_path = file("${fasta_folder}/${fasta_file_name}")
        [fasta_file_name, internal_db, fasta_path]
    }
    .set{ fasta_desc }


/*
 * Step 1. Run makeblastdb on fasta data
*/
process makeblastdb {

	tag { fasta_file }

    input:
    set fasta_file, internal_dbfile, file(fasta_path) from fasta_desc

    output:
    file ("*") into blastdbs
    
    script:
	
    """
		if [ `echo ${fasta_file} | grep 'gz'` ]; then zcat ${fasta_file} > ${internal_dbfile}; else ln -s ${fasta_file} ${internal_dbfile}; fi
		makeblastdb -dbtype prot -in ${internal_dbfile} -out ${internal_dbfile}
    """
}

/*
 * Step 0. Run batch correction on mzl and eventually unzip the input file
 * We remove the string xmlns="http://psi.hupo.org/ms/mzml" since it can causes problem with some executions
*/
process correctMzl {

   tag { sample_id }
   
    input:
 	set sample_id, file(mzML_file) from (mzmlfiles_for_correction)
 
    output:
	set sample_id, file("${sample_id}.ok.mzML") into corrected_mzmlfiles
	set sample_id, file("${sample_id}.mzML") into mzmlfiles_for_first_step


   """  
   	if [ `echo ${mzML_file} | grep 'gz'` ]; then zcat ${mzML_file} > ${sample_id}.mzML; \
	sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${sample_id}.mzML > ${sample_id}.ok.mzML; \
   	else sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${mzML_file} > ${sample_id}.ok.mzML; fi
   """
}


/*
 * Step 2. Run FirstStep on raw data
*/
process shotgun_bsa {
	publishDir shotgun_bsa_output

   tag { sample_id }
    
    input:
 	set sample_id, file(mzML_file) from (mzmlfiles_for_first_step)
    file(workflowfile) from firstStepWF
    file ("*") from blastdbs.collect()

    output:
	set sample_id, file("${sample_id}.qcml") into qcmlfiles
	set sample_id, file("${mzML_file}"), file("${sample_id}.featureXML") into files_for_second_step
	set sample_id, file("${sample_id}.idXML") into idXMLfiles

   """   
	knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
	-workflowFile=${workflowfile} \
	-workflow.variable=input_mzml_file,${mzML_file},String \
	-workflow.variable=output_qcml_file,${sample_id}.qcml,String \
	-workflow.variable=output_featurexml_file,${sample_id}.featureXML,String \
	-workflow.variable=output_idxml_file,${sample_id}.idXML,String   
	"""
}

/*
 * Step 3. Run Second step 

process mean_it {
	publishDir mean_it_output

   tag { sample_id }
   
    input:
	set sample_id, file(mzML_file), file(featureXML_file) from files_for_second_step
    file(workflowfile) from secondStepWF

    output:
	set sample_id, file("${sample_id}_ident_pep.csv") into mean_it_ident_pep_files

   
   """
	knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION \
	-reset -nosave -workflowFile="${workflowfile}" \
	-workflow.variable=input_featurexml_file,${featureXML_file},String \
	-workflow.variable=input_mzml_file,file.ok.mzML,String
    -workflow.variable=output_csv_file,${sample_id}_ident_pep.csv,String
	"""
}
*/