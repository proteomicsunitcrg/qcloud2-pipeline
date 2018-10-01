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
chekPeptidesWF = file("${workflowsFolder}/module_check_peptides.knwf")
chekPeptidesWF = file("${workflowsFolder}/module_check_peptides.knwf")
api_connectionWF = file("${workflowsFolder}/module_api_conn.knwf")

checkFiles([shotgunWF, srmWF, chekPeptidesWF,api_connectionWF])

baseQCPath     = "${workflowsFolder}/module_parameter_QC_"

// Shotgun QC ID
MS2specCount_ID		= "0000007" // problem
TotNumOfUniPep_ID	= "0000031" // problem
TotNumOfUniProt_ID	= "0000032" // problem

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
ontology["QC01"] = "0000005" 
ontology["QC02"] = "0000006" 
ontology["QCS1"] = "0000005" 
ontology["QCS2"] = "0000006"

// Check Knime workflow files
checkWFFiles(baseQCPath, [MS2specCount_ID, TotNumOfUniPep_ID, MedianITMS2_ID, PepArea_ID, MassAccuracy_ID, MedianFwhm_ID])


/*
 * Create a channel for mzlfiles files; Temporary for testing purposes only
 */
Channel
    .watchPath( params.zipfiles )             
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
    label 'little_comp'
  
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
        set sample_id, internal_code, checksum, file(mzML_file) into shot_mzML_file_for_MedianITMS2, shot_mzML_file_for_delivery 
        set sample_id, internal_code, checksum, file("${sample_id}.qcml") into qcmlfiles_for_MS2_spectral_count, qcmlfiles_for_tot_num_uniq_peptides, qcmlfiles_for_tot_num_uniq_proteins

        
       """
        mkdir tmpdir
        export TMPDIR=\$PWD/tmpdir
        knime -data \$PWD -clean -consoleLog --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
        -workflowFile=${workflowfile} \
        -workflow.variable=input_mzml_file,${mzML_file},String \
        -workflow.variable=output_qcml_file,${sample_id}.qcml,String \
        -workflow.variable=output_featurexml_file,${sample_id}.featureXML,String \
        -workflow.variable=output_idxml_file,${sample_id}.idXML,String \
        -workflow.variable=input_fasta_file,${fasta_file},String \
        -workflow.variable=input_fasta_psq_file,${fasta_file}.psq,String \
        -vmArgs -Xmx${task.memory.mega-5000}m -Duser.home=\$PWD;
        sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g ${sample_id}.qcml | sed s@'qcML xmlns=\"https://github.com/qcML/qcml\"'@qcML@g > ${sample_id}.qcml2
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
        set sample_id, internal_code, checksum, file(mzML_file) into srm_mzML_file_for_MedianITMS2, srm_mzML_file_for_delivery 
        
       """
        mkdir tmpdir
        export TMPDIR=\$PWD/tmpdir

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
    
    input:
    set sample_id, internal_code, checksum, file(qcmlfile) from qcmlfiles_for_MS2_spectral_count
    file(workflowfile) from getWFFile(baseQCPath, MS2specCount_ID)

    output:
    set sample_id, file("${sample_id}_QC_${MS2specCount_ID}.json") into ms2_spectral_for_delivery

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${MS2specCount_ID}", qccvp:"QC_${ontology[MS2specCount_ID]}", chksum:checksum, ojid:"${sample_id}")
	knime.launch()
}

/*
 * Run calculation of total number of unique identified peptides 
 */

process calc_tot_num_uniq_peptides {
    publishDir shotgun_output

    tag { sample_id }
   
    input:
    set sample_id, internal_code, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_peptides
    file(workflowfile) from getWFFile(baseQCPath, TotNumOfUniPep_ID)

    output:
    set sample_id, file("${sample_id}_QC_${TotNumOfUniPep_ID}.json") into uni_peptides_for_delivery

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${TotNumOfUniPep_ID}", qccvp:"QC_${ontology[TotNumOfUniPep_ID]}", chksum:checksum, ojid:"${sample_id}")
	knime.launch()
}

/*
 * Run calculation of total number of uniquely identified proteins
 */
process calc_tot_num_uniq_proteins {

    tag { sample_id }

    input:
    set sample_id, internal_code, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_proteins
    file(workflowfile) from getWFFile(baseQCPath, TotNumOfUniProt_ID)

    output:
    set sample_id, file("${sample_id}_QC_${TotNumOfUniProt_ID}.json") into uni_prots_for_delivery

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${TotNumOfUniProt_ID}", qccvp:"QC_${ontology[TotNumOfUniProt_ID]}", chksum:checksum, ojid:"${sample_id}")
	knime.launch()
}

/*
 * Run calculation of median IT MS2
 */
process calc_median_IT_MS2 {

    tag { sample_id }

    input:
    set sample_id, internal_code, checksum, file(mzml_file) from shot_mzML_file_for_MedianITMS2.mix(srm_mzML_file_for_MedianITMS2)
    file(workflowfile) from getWFFile(baseQCPath, MedianITMS2_ID)

    output:
    set sample_id, file("${sample_id}_QC_${MedianITMS2_ID}.json") into median_itms2_for_delivery

	script:
	def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzml_file, qccv:"QC_${MedianITMS2_ID}", qccvp:"QC_${ontology[MedianITMS2_ID]}", chksum:checksum, ojid:"${sample_id}")
	knime.launch()
	
}

/*
 * Run calculation of peptide area
 */
process calc_peptide_area {

    tag { sample_id }

    input:
    set sample_id, internal_code, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_peptide_area.mix(srm_featureXMLfiles_for_calc_peptide_area)
	file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, PepArea_ID)

    output:
    set sample_id, internal_code, checksum, PepArea_ID, file("${sample_id}_QC_${PepArea_ID}.json") into pep_area_for_check

	script:
	def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${PepArea_ID}", qccvp:"QC_${ontology[PepArea_ID]}", chksum:checksum, ojid:"${sample_id}")
	knime.launch()
	
}
 
/*
 * Run calculation of Mass accuracy
 */
 process calc_mass_accuracy {

    tag { sample_id }

    input:
    set sample_id, internal_code, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_mass_accuracy.mix(srm_featureXMLfiles_for_calc_mass_accuracy)
	file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, MassAccuracy_ID)

    output:
    set sample_id, internal_code, checksum, MassAccuracy_ID, file("${sample_id}_QC_${MassAccuracy_ID}.json") into mass_json_for_check

	script:
	def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${MassAccuracy_ID}", qccvp:"QC_${ontology[MassAccuracy_ID]}", chksum:checksum, ojid:"${sample_id}")
	knime.launch()
	
}
 
/*
 * Run calculation of Median Fwhm
 */
 process calc_median_fwhm {

    tag { sample_id }

    input:
    set sample_id, internal_code, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_median_fwhm.mix(srm_featureXMLfiles_for_calc_median_fwhm)
	file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, MedianFwhm_ID)

    output:
    set sample_id, internal_code, checksum, MedianFwhm_ID, file("${sample_id}_QC_${MedianFwhm_ID}.json") into median_fwhm_for_check

	script:
	def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${MedianFwhm_ID}", qccvp:"QC_${ontology[MedianFwhm_ID]}", chksum:checksum, ojid:"${sample_id}")
	knime.launch()
	
}

/*
 * Check petide results (appaño)
 */
 process check_peptides {
    tag { sample_id }
	beforeScript("mkdir tmp")

    input:
    set sample_id, internal_id, checksum, process_id, file(json_file) from pep_area_for_check
    file(peptideCSV)
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("tmp/${json_file}") into pep_checked_for_delivery

	script:
	def knime = new Knime(qccv:"QC_${process_id}", wf:workflowfile, chksum:checksum,  csvpep:peptideCSV, stype:internal_id, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./tmp", ojfile:"${json_file}")
	knime.launch()
}

 process check_fwhm {
    tag { sample_id }
	beforeScript("mkdir tmp")

    input:
    set sample_id, internal_id, checksum, process_id, file(json_file) from mass_json_for_check
    file(peptideCSV)
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("tmp/${json_file}") into mass_checked_for_delivery

	script:
	def knime = new Knime(qccv:"QC_${process_id}", wf:workflowfile, chksum:checksum,  csvpep:peptideCSV, stype:internal_id, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./tmp", ojfile:"${json_file}")
	knime.launch()
}
 process check_median {
    tag { sample_id }
	beforeScript("mkdir tmp")

    input:
    set sample_id, internal_id, checksum, process_id, file(json_file) from median_fwhm_for_check
    file(peptideCSV)
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("tmp/${json_file}") into median_checked_for_delivery

	script:
	def knime = new Knime(qccv:"QC_${process_id}", wf:workflowfile, chksum:checksum,  csvpep:peptideCSV, stype:internal_id, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./tmp", ojfile:"${json_file}")
	knime.launch()
}

// Group the results from checked json files
json_checked_for_delivery = pep_checked_for_delivery.join(mass_checked_for_delivery).join(median_checked_for_delivery)

/*
 * Send data to the database  // join the data based on sample ID and send everything to the DB
 */
 
 process sendToDB {
    tag { sample_id }

    input:
    file(workflowfile) from api_connectionWF

    set sample_id, internal_code, checksum, file(mzML_file), file(ms2_spectral), file(uni_peptides), file(uni_prots), file(median_itms2), file(json1), file(json2), file(json3) from shot_mzML_file_for_delivery.mix(srm_mzML_file_for_delivery).join(ms2_spectral_for_delivery).join(uni_peptides_for_delivery).join(uni_prots_for_delivery).join(median_itms2_for_delivery).join(json_checked_for_delivery)
 //  set sample_id, internal_code, checksum, file(mzML_file), file(median_itms2), file(json1), file(json2), file(json3) from shot_mzML_file_for_delivery.mix(srm_mzML_file_for_delivery).join(median_itms2_for_delivery).join(json_checked_for_delivery)
    val db_host from params.db_host

	script:
    def pieces = sample_id.tokenize( '_' )
    def lab_id = pieces[0]	
    def parent_id = ontology[internal_code]

	def knime = new Knime(wf:workflowfile, chksum:checksum, stype:internal_code, ifolder:".", mzml:mzML_file, labs:lab_id, utoken:"${db_host}/api/auth", uifile:"${db_host}/api/file/QC:${parent_id}", uidata:"${db_host}/api/data/pipeline", mem:"${task.memory.mega-5000}m")
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
     
