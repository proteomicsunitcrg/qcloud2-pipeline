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
log.info "reads                       		: ${params.reads}"
log.info "genome                   			: ${params.genome}"
log.info "annotation                		: ${params.annotation}"
log.info "minsize (after trimming) >=15  	: ${params.minsize}"
log.info "output folder				  		: ${params.output}"
log.info "library strandess				  	: ${params.strandess}"
log.info "mirbase (it means the annotation"				  		
log.info "is a gff3 file from mirBase)		: ${params.mirbase}"
log.info "splitsize (cut off for" 
log.info "separating small and large)"
log.info "NO would skip this step			: ${params.splitsize}"
log.info "adapter                     		: ${params.adapter}"
log.info "tool description file       		: ${params.tool_desc}"

log.info "email for notification 			: ${params.email}"
log.info "\n"

if (params.help) {
    log.info 'This is the Biocore\'s microRNAseq pipeline'
    log.info '\n'
    exit 1
}

if (params.resume) exit 1, "Are you making the classical --resume typo? Be careful!!!! ;)"


if (params.strandess != "forward" && params.strandess != "reverse" && params.strandess != "unstranded") {
    log.info 'Please choose either between forward, reverse or unstranded as library type!'
    log.info '\n'
    exit 1
}
