#!/usr/bin/env nextflow

/*
 * Copyright (c) 2018, Centre for Genomic Regulation (CRG) and the authors.
 *
 */

/* 
 * Qcloud pipeline by Bioinformatics Core & Proteomics Core @ CRG
 *
 * @authors
 * Luca Cozzuto <luca.cozzuto@crg.eu>
 * Toni Hermoso <toni.hermoso@crg.eu>
 * Roger Olivella <roger.olivella@crg.eu>
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
log.info "zipfiles (input files)            : ${params.zipfiles}"
log.info "qconfig (config file)             : ${params.qconfig}"
log.info "fasta_tab (tsv file)              : ${params.fasta_tab}"
log.info "email for notification            : ${params.email}"
log.info "\n"

if (params.help) {
    log.info 'This is the QCloud pipeline'
    log.info '\n'
    exit 1
}

if (params.resume) exit 1, "Are you making the classical --resume typo? Be careful!!!! ;)"

// Data folders
workflowsFolder     = "$baseDir/workflows/"
fasta_folder        = "$baseDir/fasta"
blastdb_folder      = "$baseDir/blastdb"
CSV_folder          = "$baseDir/csv"

fastaconfig = file(params.fasta_tab)
if( !fastaconfig.exists() )  { error "Cannot find any fasta tab file!!!"}

// Output folder
shotgun_output      = "output/shotgun_output"
srm_output          = "output/srm_output"
common_output		= "output/common_output"

// Files needed
srmCSV = file("${CSV_folder}/qtrap_bsa.traml")
peptideCSV = file("${CSV_folder}/knime_peptides_final.csv")
checkFiles([srmCSV, peptideCSV])

// check for workflow existence
shotgunWF      = file("${workflowsFolder}/module_workflow_shotgun.knwf")
srmWF          = file("${workflowsFolder}/module_workflow_srm.knwf")
checkFiles([shotgunWF, srmWF])

baseQCPath     = "${workflowsFolder}/module_parameter_QC_"

// Shotgun QC ID
MS2specCount_ID		= "0000007"
TotNumOfUniPep_ID	= "0000031"
TotNumOfUniProt_ID	= "0000032"

// Common QC
MedianITMS2_ID      = "1000928"
PepArea_ID          = "1001844"
MassAccuracy_ID     = "1000014"
MedianFwhm_ID       = "1010086"

// ontology this has to be retrieved in some way from outside...
def ontology = [:]
ontology["0000007"] = "9000001"
ontology["0000029"] = "9000001"
ontology["0000031"] = "9000001"
ontology["0000032"] = "9000001"
ontology["1000928"] = "9000002"
ontology["1001844"] = "1001844"
ontology["1000014"] = "1000014"
ontology["1010086"] = "1010086"

// Check Knime workflow files
checkWFFiles(baseQCPath, [MS2specCount_ID, TotNumOfUniPep_ID, MedianITMS2_ID, PepArea_ID, MassAccuracy_ID, MedianFwhm_ID])


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
    genome           = list[1]
    workflow_type    = list[2]
    [internal_code, genome, workflow_type]
    }
    .set{qconfig_desc}

/*
 * Run msconvert on raw data.
*/

process msconvert {
    publishDir  "conversion"
    
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
    publishDir  blastdb_folder
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

process correctMzml {

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
     .into{ input_pipe_complete_first_step_for_srm; input_pipe_complete_first_step_for_shotgun; debug }

//debug.println()
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
        set sample_id, internal_code, checksum, file("${sample_id}.featureXML") into shot_featureXMLfiles_for_calc_peptide_area, shot_featureXMLfiles_for_calc_mass_accuracy, shot_featureXMLfiles_for_calc_median_fwhm
        set sample_id, internal_code, checksum, file(mzML_file) into shot_mzML_file_for_MedianITMS2
        set sample_id, internal_code, checksum, file("${sample_id}.qcml") into qcmlfiles_for_MS2_spectral_count, qcmlfiles_for_tot_num_uniq_peptides, qcmlfiles_for_tot_num_uniq_proteins

        
       """
        knime -data \$PWD -clean -consoleLog --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
        -workflowFile=${workflowfile} \
        -workflow.variable=input_mzml_file,${mzML_file},String \
        -workflow.variable=output_qcml_file,${sample_id}.qcml,String \
        -workflow.variable=output_featurexml_file,${sample_id}.featureXML,String \
        -workflow.variable=output_idxml_file,${sample_id}.idXML,String \
        -workflow.variable=input_fasta_file,${fasta_file},String \
        -workflow.variable=input_fasta_psq_file,${fasta_file}.psq,String \
        -vmArgs -Xmx${task.memory.mega-5000}m -Duser.home=\$PWD;
        sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${sample_id}.qcml > ${sample_id}.qcml2;
        mv ${sample_id}.qcml2 ${sample_id}.qcml     
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
        set sample_id, internal_code, checksum, file("${sample_id}.featureXML") into srm_featureXMLfiles_for_calc_peptide_area, srm_featureXMLfiles_for_calc_mass_accuracy, srm_featureXMLfiles_for_calc_median_fwhm
        set sample_id, internal_code, checksum, file(mzML_file) into srm_mzML_file_for_MedianITMS2
        
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
 * Run calculation of MS2 spectral count 
 */

process calc_MS2_spectral_count {
    publishDir shotgun_output

    tag { sample_id }
    def process_id = MS2specCount_ID
    
    input:
    set sample_id, internal_code, checksum, file(qcmlfile) from qcmlfiles_for_MS2_spectral_count
    file(workflowfile) from getWFFile(baseQCPath, process_id)

    output:
    file("${sample_id}_QC_${process_id}.json")

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${process_id}", qccvp:ontology[process_id], chksum:checksum, ojfile:"${sample_id}")
	knime.launch()
}

/*
 * Run calculation of total number of unique identified peptides 
 */

process calc_tot_num_uniq_peptides {
    publishDir shotgun_output

    tag { sample_id }
    def process_id = TotNumOfUniPep_ID
   
    input:
    set sample_id, internal_code, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_peptides
    file(workflowfile) from getWFFile(baseQCPath, process_id)

    output:
    file("${sample_id}_QC_${process_id}.json")

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${process_id}", qccvp:ontology[process_id], chksum:checksum, ojfile:"${sample_id}")
	knime.launch()
}

/*
 * Run calculation of total number of uniquely identified proteins
 */
process calc_tot_num_uniq_proteins {
    publishDir shotgun_output

    tag { sample_id }
    def process_id = TotNumOfUniPep_ID   

    input:
    set sample_id, internal_code, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_proteins
    file(workflowfile) from getWFFile(baseQCPath, process_id)

    output:
    file("${sample_id}_QC_${process_id}.json")

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${process_id}", qccvp:ontology[process_id], chksum:checksum, ojfile:"${sample_id}")
	knime.launch()
}

/*
 * Run calculation of median IT MS2
 */
process calc_median_IT_MS2 {
    publishDir common_output

    tag { sample_id }
    def process_id = MedianITMS2_ID   

    input:
    set sample_id, internal_code, checksum, file(mzml_file) from shot_mzML_file_for_MedianITMS2.mix(srm_mzML_file_for_MedianITMS2)
    file(workflowfile) from getWFFile(baseQCPath, process_id)

    output:
    file("${sample_id}_QC_${process_id}.json")

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzml_file, qccv:"QC_${process_id}", qccvp:ontology[process_id], chksum:checksum, ojfile:"${sample_id}")
	knime.launch()
	
}

/*
 * Run calculation of peptide area
 */
process calc_peptide_area {
    publishDir common_output

    tag { sample_id }
    def process_id = PepArea_ID   

    input:
    set sample_id, internal_code, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_peptide_area.mix(srm_featureXMLfiles_for_calc_peptide_area)
	file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, process_id)

    output:
    file("${sample_id}_QC_${process_id}.json")

	script:
	def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${process_id}", qccvp:ontology[process_id], chksum:checksum, ojfile:"${sample_id}")
	knime.launch()
	
}
 
/*
 * Run calculation of Mass accuracy
 */
 process calc_mass_accuracy {
    publishDir common_output

    tag { sample_id }
    def process_id = MassAccuracy_ID   

    input:
    set sample_id, internal_code, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_mass_accuracy.mix(srm_featureXMLfiles_for_calc_mass_accuracy)
	file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, process_id)

    output:
    file("${sample_id}_QC_${process_id}.json")

	script:
	def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${process_id}", qccvp:ontology[process_id], chksum:checksum, ojfile:"${sample_id}")
	knime.launch()
	
}
 
/*
 * Run calculation of Median Fwhm
 */
 process calc_median_fwhm {
    publishDir common_output

    tag { sample_id }
    def process_id = MedianFwhm_ID   

    input:
    set sample_id, internal_code, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_median_fwhm.mix(srm_featureXMLfiles_for_calc_median_fwhm)
	file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, process_id)

    output:
    file("${sample_id}_QC_${process_id}.json")

	script:
	def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${process_id}", qccvp:ontology[process_id], chksum:checksum, ojfile:"${sample_id}")
	knime.launch()
	
}
 
/*
 Functions
*/

    def public getWFFile(filePrefix, WF_ID) {
		return file("${filePrefix}${WF_ID}.knwf")
     }
     
    def public checkWFFiles(filePrefix, WF_IDs) {
		for (WF_ID in WF_IDs) {
			knwfFIle = getWFFile(filePrefix, WF_ID)
			checkFile(knwfFIle)
		}		
     }

    def public checkFiles(filePaths) { 
 		for (filePath in filePaths) {
			checkFile(filePath)	
	}
}
     	
    def public checkFile(filePath) { 
  		if (!filePath.exists()) {
			error "Cannot find any ${filePath} file!!!"	
     	}
     }
     