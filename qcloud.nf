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
log.info "email for notification 			: ${params.email}"
log.info "mzlfiles (input files) 			: ${params.mzlfiles}"
log.info "\n"

if (params.help) {
    log.info 'This is the QCloud pipeline'
    log.info '\n'
    exit 1
}

if (params.resume) exit 1, "Are you making the classical --resume typo? Be careful!!!! ;)"

workflowsFolder	= "$baseDir/workflows/"
firstOutput		= "first"

firstStepWF     = file("${workflowsFolder}/module_workflow_shotgun_bsa.knwf")

Channel
   	.fromFilePairs( params.mzlfiles, size: 1)                                             
   	.ifEmpty { error "Cannot find any file matching: ${params.mzlfiles}" }
    .set { mzlfiles_for_first_step}    


/*
 * Step 0. Run FastQC on raw data
*/
process FirstStep {
	publishDir firstOutput

   tag { sample_id }
   
    input:
 	set sample_id, file(mzML_file) from (mzlfiles_for_first_step)
    file(workflowfile) from firstStepWF

    output:
	set sample_id, file("${sample_id}.qcml") into qcmlfiles
	set sample_id, file("${sample_id}.featureXML") into featureXMLfiles
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

