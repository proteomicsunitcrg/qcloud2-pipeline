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
log.info "\n"

if (params.help) {
    log.info 'This is the QCloud pipeline'
    log.info '\n'
    exit 1
}

if (params.resume) exit 1, "Are you making the classical --resume typo? Be careful!!!! ;)"

firstOutput = "first"


str = Channel.from('hello', 'hola', 'bonjour', 'ciao')

/*
 * Step 0. Run FastQC on raw data
*/
process FirstStep {
	publishDir firstOutput

   tag { str }
   
   input:
   val str 
   output: 
   stdout into result
   
   """
   echo $str;
   knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_mean_injection_time_of_identified_peptides_MS1.knwf" -workflow.variable=input_featurexml_file,/users/pr/rolivella/myframeworks/qcweb/scripts/input/vib/erika_2p/featureXML/1804/El_02534_2p_QC1W.featureXML,String -workflow.variable=input_mzml_file,/users/pr/rolivella/myframeworks/qcweb/scripts/input/vib/erika_2p/mzML/1804/El_02534_2p_QC1W.mzML,String
   """
}

