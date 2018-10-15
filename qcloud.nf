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
json_output      = "output/json_output"


// Files needed
srmCSV = file("${CSV_folder}/qtrap_bsa.traml")
peptideCSV = file("${CSV_folder}/knime_peptides_final.csv")
peptideCSV_C4L = file("${CSV_folder}/knime_peptides_qc4l.csv") 

checkFiles([srmCSV, peptideCSV])

/*
 * check for workflow existence
 */ 

// QC01/QC02 WF
shotgunWF            = file("${workflowsFolder}/module_workflow_shotgun.knwf")
// QCS1/QCS2 WF
srmWF                = file("${workflowsFolder}/module_workflow_srm.knwf")
// QC03 WFs
shotgun_qc4l_cidWF   = file("${workflowsFolder}/module_workflow_qc4l_cid.knwf")
shotgun_qc4l_hcdWF   = file("${workflowsFolder}/module_workflow_qc4l_hcd.knwf")
shotgun_qc4l_etcidWF = file("${workflowsFolder}/module_workflow_qc4l_etcid.knwf")
shotgun_qc4l_ethcdWF = file("${workflowsFolder}/module_workflow_qc4l_ethcd.knwf")

// Common WFs
chekPeptidesWF = file("${workflowsFolder}/module_check_peptides.knwf")
api_connectionWF = file("${workflowsFolder}/module_api_conn.knwf")

// Check presence of knime's workflow files
checkFiles([shotgunWF, srmWF, chekPeptidesWF,api_connectionWF, shotgun_qc4l_cidWF, shotgun_qc4l_hcdWF, shotgun_qc4l_etcidWF, shotgun_qc4l_ethcdWF])

// Correspondences between db analysis name, QC_ID and ID ofr db insert
def Correspondence = [:]
//MS2specCount
Correspondence["MS2specCount"] = ["shotgun" : "0000007", "shotgun_qc4l_cid" : "1002001", "shotgun_qc4l_hcd" : "1002009", "shotgun_qc4l_etcid" : "1002017", "shotgun_qc4l_ethcd" : "1002025"]
//totNumOfUniPep
Correspondence["totNumOfUniPep"] = ["shotgun" : "0000031", "shotgun_qc4l_cid" : "1002002", "shotgun_qc4l_hcd" : "1002010", "shotgun_qc4l_etcid" : "1002018", "shotgun_qc4l_ethcd": "1002026"] 
//totNumOfUniProt
Correspondence["totNumOfUniProt"] = ["shotgun" : "0000032", "shotgun_qc4l_cid" : "1002003", "shotgun_qc4l_hcd" : "1002011", "shotgun_qc4l_etcid" : "1002019", "shotgun_qc4l_ethcd" : "1002027"]
//TotNumOfPsm NEW
Correspondence["totNumOfPsm"] = ["shotgun" : "0000029", "shotgun_qc4l_cid" : "1002004", "shotgun_qc4l_hcd" : "1002012", "shotgun_qc4l_etcid" : "1002020", "shotgun_qc4l_ethcd" : "1002028"]
//medianITMS1 NEW
Correspondence["medianITMS1"] = ["shotgun" : "1000927", "shotgun_qc4l_cid" : "1000933", "shotgun_qc4l_hcd" : "1000934", "shotgun_qc4l_etcid" : "1000935", "shotgun_qc4l_ethcd" : "1000936"]
//tic NEW
Correspondence["tic"] = ["shotgun" : "0000048", "shotgun_qc4l_cid" : "1000937", "shotgun_qc4l_hcd" : "1000938", "shotgun_qc4l_etcid" : "1000939", "shotgun_qc4l_ethcd" : "1000940"]
//medianITMS2
Correspondence["medianITMS2"] = ["shotgun" : "1000928", "srm" : "???", "shotgun_qc4l_cid" : "1002005", "shotgun_qc4l_hcd" : "1002013", "shotgun_qc4l_etcid" : "1002021", "shotgun_qc4l_ethcd" : "1002029"] 
//pepArea
Correspondence["pepArea"] = ["shotgun" : "1001844", "srm" : "???"]
Correspondence["pepArea_qc4l"] = ["shotgun_qc4l_cid" : "1001844"]
//massAccuracy
Correspondence["massAccuracy"] = ["shotgun" : "1000014", "srm" : "???", "shotgun_qc4l_cid" : "1002007", "shotgun_qc4l_hcd" : "1002015", "shotgun_qc4l_etcid" : "1002023", "shotgun_qc4l_ethcd" : "1002031"]
//medianFwhm
Correspondence["medianFwhm"] = ["shotgun" : "1010086", "srm" : "???", "shotgun_qc4l_cid" : "1002008", "shotgun_qc4l_hcd" : "1002016", "shotgun_qc4l_etcid" : "1002024", "shotgun_qc4l_ethcd" : "1002032"]

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
ontology["1002001"] = "9000001"
ontology["1002002"] = "9000001"
ontology["1002003"] = "9000001"
ontology["1002004"] = "9000001"
ontology["1002005"] = "9000002"
ontology["1002007"] = "1002007"
ontology["1002008"] = "9000003"

ontology["1002009"] = "9000001"
ontology["1002010"] = "9000001"
ontology["1002011"] = "9000001"
ontology["1002012"] = "9000001"
ontology["1002013"] = "9000002"
ontology["1002015"] = "1002015"
ontology["1002016"] = "9000003"

ontology["1002017"] = "9000001"
ontology["1002018"] = "9000001"
ontology["1002019"] = "9000001"
ontology["1002020"] = "9000001"
ontology["1002021"] = "9000002"
ontology["1002023"] = "1002023"
ontology["1002024"] = "9000003"

ontology["1002025"] = "9000001"
ontology["1002026"] = "9000001"
ontology["1002027"] = "9000001"
ontology["1002028"] = "9000001"
ontology["1002029"] = "9000002"
ontology["1002031"] = "1002031"
ontology["1002032"] = "9000003"
ontology["1000927"] = "9000002"
ontology["0000048"] = "0000048"

ontology["QC01"] = "0000005"
ontology["QC02"] = "0000006"
ontology["QC03"] = "0000009" 
ontology["QCS1"] = "0000005"
ontology["QCS2"] = "0000006"

// Check presence of knime's workflow files
baseQCPath     = "${workflowsFolder}/module_parameter_QC_"
checkWFFiles(baseQCPath, Correspondence.keySet())

/*
 * Create a channel for mzlfiles files; Temporary for testing purposes only
 */
Channel
    .fromPath( params.zipfiles )             
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
 * Run makeblastdb on fasta data
 */

process makeblastdb {
    storeDir blastdb_folder
    afterScript("chmod 777 ${blastdb_folder}")
    tag { genome_id }

    input:
    set genome_id, fasta_file, internal_dbfile, file(fasta_path) from fasta_desc

    output:
    set genome_id, internal_dbfile, file ("*") into blastdbs, blastdbs_d
    
    script:
    """
     if [ `echo ${fasta_file} | grep 'gz'` ]; then zcat ${fasta_file} > ${internal_dbfile}; else ln -s ${fasta_file} ${internal_dbfile}; fi
     makeblastdb -dbtype prot -in ${internal_dbfile} -out ${internal_dbfile}
    """
}

/*
 * Run msconvert on raw data. In case QC0S add a parameter
 */

process msconvert {
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
 * Run batch correction on mzl and eventually unzip the input file
 * We remove the string xmlns="http://psi.hupo.org/ms/mzml" since it can causes problem with some executions
 */

process correctMzml {
    publishDir "output/correctMzml"
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

/*
 * Cpombine different channels (blast dbs, corrected mzml files) for obtaining the required input 
 * for the next steps
 */

input_pipe_withcode_reordered = corrected_mzmlfiles_for_second_step.combine(qconfig_desc,by: 0).map{
  qc_id, sample_id, checksum, file, genome, analysis -> [genome, qc_id, sample_id, file, analysis, checksum]
}

input_pipe_complete_first_step = input_pipe_withcode_reordered.combine(blastdbs, by: 0)


input_pipe_complete_first_step
     .into{ input_pipe_complete_first_step_for_srm; input_pipe_complete_first_step_for_shotgun; input_pipe_complete_first_step_for_shotgun_qc4l_cid; input_pipe_complete_first_step_for_shotgun_qc4l_hcd; input_pipe_complete_first_step_for_shotgun_qc4l_etcid; input_pipe_complete_first_step_for_shotgun_qc4l_ethcd ; debug }


/*
 * Run shotgun on raw data (In case QC01 // QC02). 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
*/

process run_shotgun {
    publishDir "output/run_shotgun"

    tag { sample_id }
    
    label 'big_mem'
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun
    file(workflowfile) from shotgunWF
    
    when:
    analysis_type == 'shotgun'

    output:
    set sample_id, internal_code, analysis_type, checksum, file("${sample_id}.featureXML") into shot_featureXMLfiles_for_calc_peptide_area, shot_featureXMLfiles_for_calc_mass_accuracy, shot_featureXMLfiles_for_calc_median_fwhm
    set sample_id, internal_code, analysis_type, checksum, file(mzML_file) into shot_mzML_file_for_MedianITMS1, shot_mzML_file_for_MedianITMS2, shot_mzML_file_for_check 
    set sample_id, internal_code, analysis_type, checksum, file("${sample_id}.qcml") into qcmlfiles_for_MS2_spectral_count, qcmlfiles_for_tot_num_uniq_peptides, qcmlfiles_for_tot_num_uniq_proteins, qcmlfiles_for_tot_num_psm

    script:
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run srm on raw data (In case QC01 // QC02) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process run_srm {
     publishDir "output/run_srm"
      tag { sample_id }

       label 'big_mem'
        input:
        set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_srm
        file(workflowfile) from srmWF
        file(srmCSV)
        
        when:
        analysis_type == 'srm'

        output:
        set sample_id, internal_code, analysis_type, checksum, file("${sample_id}.featureXML") into srm_featureXMLfiles_for_calc_peptide_area, srm_featureXMLfiles_for_calc_mass_accuracy, srm_featureXMLfiles_for_calc_median_fwhm
        set sample_id, internal_code, analysis_type, checksum, file(mzML_file) into srm_mzML_file_for_MedianITMS1, srm_mzML_file_for_MedianITMS2, srm_mzML_file_for_check 
    
        script:
        def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzML_file, ofeatxml:"${sample_id}.featureXML", srmCSV:srmCSV)
        knime.launch()
}

/*
 * Run shotgun_qc4l_cid on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_cid {
     publishDir "output/shotgun_qc4l_cid"
    tag { sample_id }
    label 'big_mem'
    
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun_qc4l_cid
    file(workflowfile) from shotgun_qc4l_cidWF
    
    when:
    analysis_type == 'shotgun_qc4l'

    output:
    set val("${sample_id}_cid"), internal_code, val("shotgun_qc4l_cid"), checksum, file("${sample_id}.featureXML") into shot_qc4l_cid_featureXMLfiles_for_calc_peptide_area, shot_qc4l_cid_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_cid_featureXMLfiles_for_calc_median_fwhm
    set val("${sample_id}_cid"), internal_code, val("shotgun_qc4l_cid"), checksum, file(mzML_file) into shot_qc4l_cid_mzML_file_for_MedianITMS1, shot_qc4l_cid_mzML_file_for_MedianITMS2, shot_qc4l_cid_mzML_file_for_check 
    set val("${sample_id}_cid"), internal_code, val("shotgun_qc4l_cid"), checksum, file("${sample_id}.qcml") into shot_qc4l_cid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_cid_qcmlfiles_for_tot_num_psm

    script:
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run shotgun_qc4l_hcd on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_hcd {
     publishDir "output/shotgun_qc4l_hcd"
    tag { sample_id }
    
    label 'big_mem'
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun_qc4l_hcd
    file(workflowfile) from shotgun_qc4l_hcdWF
    
    when:
    analysis_type == 'shotgun_qc4l'

    output:
    set val("${sample_id}_hcd"), internal_code, val("shotgun_qc4l_hcd"), checksum, file("${sample_id}.featureXML") into shot_qc4l_hcd_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_hcd_featureXMLfiles_for_calc_median_fwhm
    set val("${sample_id}_hcd"), internal_code, val("shotgun_qc4l_hcd"), checksum, file(mzML_file) into shot_qc4l_hcd_mzML_file_for_MedianITMS1, shot_qc4l_hcd_mzML_file_for_MedianITMS2, shot_qc4l_hcd_mzML_file_for_check 
    set val("${sample_id}_hcd"), internal_code, val("shotgun_qc4l_hcd"), checksum, file("${sample_id}.qcml") into shot_qc4l_hcd_qcmlfiles_for_MS2_spectral_count, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_hcd_qcmlfiles_for_tot_num_psm

    script:
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run shotgun_qc4l_etcid on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_etcid {
     publishDir "output/shotgun_qc4l_etcid"
    tag { sample_id }
    
    label 'big_mem'
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun_qc4l_etcid
    file(workflowfile) from shotgun_qc4l_etcidWF
    
    when:
    analysis_type == 'shotgun_qc4l'

    output:
    set val("${sample_id}_etcid"), internal_code, val("shotgun_qc4l_etcid"), checksum, file("${sample_id}.featureXML") into shot_qc4l_etcid_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_etcid_featureXMLfiles_for_calc_median_fwhm
    set val("${sample_id}_etcid"), internal_code, val("shotgun_qc4l_etcid"), checksum, file(mzML_file) into shot_qc4l_etcid_mzML_file_for_MedianITMS1, shot_qc4l_etcid_mzML_file_for_MedianITMS2, shot_qc4l_etcid_mzML_file_for_check 
    set val("${sample_id}_etcid"), internal_code, val("shotgun_qc4l_etcid"), checksum, file("${sample_id}.qcml") into shot_qc4l_etcid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_etcid_qcmlfiles_for_tot_num_psm

    script:
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run shotgun_qc4l_ethcd  on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_ethcd  {
     publishDir "output/shotgun_qc4l_ethcd"
    tag { sample_id }
    
    label 'big_mem'
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun_qc4l_ethcd 
    file(workflowfile) from shotgun_qc4l_etcidWF
    
    when:
    analysis_type == 'shotgun_qc4l'

    output:
    set val("${sample_id}_ethcd"), internal_code, val("shotgun_qc4l_ethcd"), checksum, file("${sample_id}.featureXML") into shot_qc4l_ethcd_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_ethcd_featureXMLfiles_for_calc_median_fwhm
    set val("${sample_id}_ethcd"), internal_code, val("shotgun_qc4l_ethcd"), checksum, file(mzML_file) into shot_qc4l_ethcd_mzML_file_for_MedianITMS1, shot_qc4l_ethcd_mzML_file_for_MedianITMS2, shot_qc4l_ethcd_mzML_file_for_check 
    set val("${sample_id}_ethcd"), internal_code, val("shotgun_qc4l_ethcd"), checksum, file("${sample_id}.qcml") into shot_qc4l_ethcd_qcmlfiles_for_MS2_spectral_count, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_ethcd_qcmlfiles_for_tot_num_psm

    script:
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run calculation of MS2 spectral count 
 */

process calc_MS2_spectral_count {
    publishDir "output/spec_count"
    tag { "${sample_id}-${analysis_type}" }
    
    input:
    set sample_id, internal_code, val(analysis_type), checksum, file(qcmlfile) from qcmlfiles_for_MS2_spectral_count.mix(shot_qc4l_cid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_hcd_qcmlfiles_for_MS2_spectral_count, shot_qc4l_etcid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_ethcd_qcmlfiles_for_MS2_spectral_count)
    file(workflowfile) from getWFFile(baseQCPath, "MS2specCount")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['MS2specCount'][analysis_type]}.json") into ms2_spectral_for_delivery

    script:
    def analysis_id = Correspondence['MS2specCount'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
}

/*
 * Run calculation of total number of unique identified peptides 
 */

process calc_tot_num_uniq_peptides {
    publishDir "output/uniq_peptides"
    tag { "${sample_id}-${analysis_type}" }
   
    input:
    set sample_id, internal_code, analysis_type, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_peptides.mix(shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_peptides)
    file(workflowfile) from getWFFile(baseQCPath, "totNumOfUniPep")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['totNumOfUniPep'][analysis_type]}.json") into uni_peptides_for_delivery

    script:
    def analysis_id = Correspondence['totNumOfUniPep'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
}

/*
 * Run calculation of total number of uniquely identified proteins
 */
process calc_tot_num_uniq_proteins {
    publishDir "output/uni_proteins"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_proteins.mix(shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_proteins)
    file(workflowfile) from getWFFile(baseQCPath, "totNumOfUniProt")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['totNumOfUniProt'][analysis_type]}.json") into uni_prots_for_delivery

    script:
    def analysis_id = Correspondence['totNumOfUniProt'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of total number of Peptide Spectral Matches
 */
process calc_tot_num_psm {
    publishDir "output/num_psm"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_psm.mix(shot_qc4l_cid_qcmlfiles_for_tot_num_psm, shot_qc4l_hcd_qcmlfiles_for_tot_num_psm, shot_qc4l_etcid_qcmlfiles_for_tot_num_psm, shot_qc4l_ethcd_qcmlfiles_for_tot_num_psm)
    file(workflowfile) from getWFFile(baseQCPath, "totNumOfPsm")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['totNumOfPsm'][analysis_type]}.json") into tot_psm_for_delivery

    script:
    def analysis_id = Correspondence['totNumOfPsm'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of median IT MS1
 */
process calc_median_IT_MS1 {
    publishDir "output/median_it1"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(mzml_file) from shot_mzML_file_for_MedianITMS1.mix(srm_mzML_file_for_MedianITMS1, shot_qc4l_cid_mzML_file_for_MedianITMS1, shot_qc4l_hcd_mzML_file_for_MedianITMS1, shot_qc4l_etcid_mzML_file_for_MedianITMS1, shot_qc4l_ethcd_mzML_file_for_MedianITMS1)
    file(workflowfile) from getWFFile(baseQCPath, "medianITMS1")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['medianITMS1'][analysis_type]}.json") into median_itms1_for_delivery

    script:
    def analysis_id = Correspondence['medianITMS1'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzml_file, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of median IT MS2
 */
process calc_median_IT_MS2 {
    publishDir "output/median_it2"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(mzml_file) from shot_mzML_file_for_MedianITMS2.mix(srm_mzML_file_for_MedianITMS2, shot_qc4l_cid_mzML_file_for_MedianITMS2, shot_qc4l_hcd_mzML_file_for_MedianITMS2, shot_qc4l_etcid_mzML_file_for_MedianITMS2, shot_qc4l_ethcd_mzML_file_for_MedianITMS2)
    file(workflowfile) from getWFFile(baseQCPath, "medianITMS2")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['medianITMS2'][analysis_type]}.json") into median_itms2_for_delivery

    script:
    def analysis_id = Correspondence['medianITMS2'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, mem:"${task.memory.mega-5000}m", mzml:mzml_file, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of peptide area
 */
process calc_peptide_area {
    publishDir "output/pep_area"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_peptide_area.mix(srm_featureXMLfiles_for_calc_peptide_area)
    file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, "pepArea")

    output:
    set sample_id, internal_code, checksum, val("${Correspondence['pepArea'][analysis_type]}"), file("${sample_id}_QC_${Correspondence['pepArea'][analysis_type]}.json") into pep_area_for_check

    script:
    def analysis_id = Correspondence['pepArea'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of peptide area
 */
process calc_peptide_area_c4l {
    publishDir "output/pep_area_c4l"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_qc4l_cid_featureXMLfiles_for_calc_peptide_area
    file(peptideCSV_C4L)
    file(workflowfile) from getWFFile(baseQCPath, "pepArea_qc4l")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['pepArea_qc4l'][analysis_type]}.json") into pep_c4l_for_delivery

    script:
    def analysis_id = Correspondence['pepArea_qc4l'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, csvpep:peptideCSV_C4L, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}", extrapars:'-workflow.variable=delta_mass,5,double -workflow.variable=delta_rt,250,double -workflow.variable=charge,2,double -workflow.variable=threshold_area,1000000,double')
    knime.launch()
    
}

/*
 * Run calculation of Sum of all Total Ion Current per RT
 
process calc_tic {
    publishDir "output/tic"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_qc4l_cid_featureXMLfiles_for_calc_peptide_area
    file(workflowfile) from getWFFile(baseQCPath, "tic")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['tic'][analysis_type]}.json") into tic_for_delivery

    script:
    def analysis_id = Correspondence['tic'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, csvpep:peptideCSV_C4L, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}", extrapars:'-workflow.variable=delta_mass,5,double -workflow.variable=delta_rt,250,double -workflow.variable=charge,2,double -workflow.variable=threshold_area,1000000,double')
    knime.launch()   
}
 */
 
/*
 * Run calculation of Mass accuracy
 */
 process calc_mass_accuracy {
    publishDir "output/calc_mass_accuracy"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_mass_accuracy.mix(srm_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_cid_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_hcd_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_etcid_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_ethcd_featureXMLfiles_for_calc_mass_accuracy)
    file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, "massAccuracy") 

    output:
    set sample_id, internal_code, checksum, val("${Correspondence['massAccuracy'][analysis_type]}"),  file("${sample_id}_QC_${Correspondence['massAccuracy'][analysis_type]}.json") into mass_json_for_check

    script:
    def analysis_id = Correspondence['massAccuracy'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${ontology_id}", qccvp:"QC_${ontology[analysis_type]}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of Median Fwhm
 */
 process calc_median_fwhm {
    publishDir "output/calc_median_fwhm"
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_median_fwhm.mix(srm_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_cid_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_hcd_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_etcid_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_ethcd_featureXMLfiles_for_calc_median_fwhm)
    file(peptideCSV)
    file(workflowfile) from getWFFile(baseQCPath, "medianFwhm") 

    output:
    set sample_id, internal_code, checksum, val("${Correspondence['medianFwhm'][analysis_type]}"),  file("${sample_id}_QC_${Correspondence['medianFwhm'][analysis_type]}.json") into median_fwhm_for_check

    script:
    def analysis_id = Correspondence['medianFwhm'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def knime = new Knime(wf:workflowfile, csvpep:peptideCSV, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Check petide results (appaño)
 */
 process check_peptides {
    publishDir "output/check_peptides"
    tag { "${sample_id}-${process_id}" }
    beforeScript("mkdir out")

    input:
    set sample_id, internal_id, checksum, process_id, file(json_file) from pep_area_for_check
    file(peptideCSV)
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("out/${json_file}") into pep_checked_for_delivery

    script:
    def knime = new Knime(qccv:"QC_${process_id}", wf:workflowfile, chksum:checksum, csvpep:peptideCSV, stype:internal_id, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./out", ojfile:"${json_file}")
    knime.launch()
}

/*
 * Check fwhm results (appaño)
 */
 process check_fwhm {
    tag { sample_id }
    beforeScript("mkdir out")

    input:
    set sample_id, internal_id, checksum, process_id, file(json_file) from mass_json_for_check
    file(peptideCSV)
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("out/${json_file}") into mass_checked_for_delivery

    script:
    def knime = new Knime(qccv:"QC_${process_id}", wf:workflowfile, chksum:checksum,  csvpep:peptideCSV, stype:internal_id, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./out", ojfile:"${json_file}")
    knime.launch()
}

/*
 * Check median results (appaño)
 */
 process check_median {
    tag { sample_id }
    beforeScript("mkdir out")

    input:
    set sample_id, internal_id, checksum, process_id, file(json_file) from median_fwhm_for_check
    file(peptideCSV)
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("out/${json_file}") into median_checked_for_delivery

    script:
    def knime = new Knime(qccv:"QC_${process_id}", wf:workflowfile, chksum:checksum,  csvpep:peptideCSV, stype:internal_id, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./out", ojfile:"${json_file}")
    knime.launch()
}

json_checked_for_delivery = pep_checked_for_delivery.mix(pep_c4l_for_delivery).join(mass_checked_for_delivery, remainder:true).join(median_checked_for_delivery, remainder:true)

process check_mzML {
    tag { sample_id }
    label 'local'
    
    input:
    set sample_id, internal_id, analysis_type, checksum, file(mzML_file) from shot_mzML_file_for_check.mix(srm_mzML_file_for_check, shot_qc4l_cid_mzML_file_for_check, shot_qc4l_hcd_mzML_file_for_check, shot_qc4l_etcid_mzML_file_for_check, shot_qc4l_ethcd_mzML_file_for_check)

    output:
    set sample_id, internal_id, analysis_type, checksum, file("${mzML_file}.timestamp"), file("${mzML_file}.filename") into mZML_params_for_mapping

    script:
    """
        xmllint --xpath 'string(/indexedmzML/mzML/run/@startTimeStamp)' ${mzML_file} > ${mzML_file}.timestamp
        xmllint --xpath 'string(/indexedmzML/mzML/fileDescription/sourceFileList/sourceFile/@name)' ${mzML_file} > ${mzML_file}.filename
    """
}

mZML_params_for_delivery = mZML_params_for_mapping.map{
        sample_id , internal_id, analysis_type, checksum, timestamp, filename -> 
        [sample_id , internal_id, analysis_type, checksum, timestamp.text, filename.text]
}

 
jointJsons = ms2_spectral_for_delivery.join(uni_peptides_for_delivery).join(uni_prots_for_delivery).join(median_itms2_for_delivery).join(json_checked_for_delivery)

jsonToBeSent = jointJsons.map{ it -> def l = [it[0]]; l.addAll([it.drop(1)]); return l }
    


  
 process sendToDB {
    tag { sample_id }

    input:
    file(workflowfile) from api_connectionWF

    set sample_id, internal_code, analysis_type, checksum, timestamp, filename, file("*") from mZML_params_for_delivery.join(jsonToBeSent)

    val db_host from params.db_host

    script:
    def pieces = sample_id.tokenize( '_' )
    def lab_id = pieces[0]  
    def parent_id = ontology[internal_code]

    def knime = new Knime(wf:workflowfile, rdate:timestamp, oriname:filename, chksum:checksum, stype:internal_code, ifolder:".", labs:lab_id, utoken:"${db_host}/api/auth", uifile:"${db_host}/api/file/QC:${parent_id}", uidata:"${db_host}/api/data/pipeline", mem:"${task.memory.mega-5000}m")
    knime.launch()
}



/*
 * Functions
 */
    
    
    def public getWFFile(filePrefix, WF_ID) {
        return file("${filePrefix}${WF_ID}.knwf")
     }
     
    def public checkWFFiles(filePrefix, WF_vals) {
        def WF_IDs = WF_vals.toList().unique()
        WF_IDs.each() {
            knwfFIle = getWFFile(filePrefix, it)
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
     
