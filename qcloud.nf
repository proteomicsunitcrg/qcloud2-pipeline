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
 */

                                                          
params.help            = false
params.resume          = false

/*
* PIPELINE 
*/

version = 2.0

log.info """BIOCORE@CRG Qcloud - N F  ~  version ${version}
========================================
╔═╗ ┌─┐┬  ┌─┐┬ ┬┌┬┐
║═╬╗│  │  │ ││ │ ││
╚═╝╚└─┘┴─┘└─┘└─┘─┴┘
========================================
zipfiles (input files)            : ${params.zipfiles}
qconfig (config file)             : ${params.qconfig}
fasta_tab (tsv file)              : ${params.fasta_tab}
email for notification            : ${params.email}
"""

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

//peptideCSVs
def peptideCSVs = [:]
peptideCSVs["QC01"] = "peptide.csv"
peptideCSVs["QC02"] = "peptide.csv"
peptideCSVs["QC03"] = "peptide_C4L.csv"


checkFiles([srmCSV, peptideCSV, peptideCSV_C4L])

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

// Check presence of knime's workflow files
baseQCPath     = "${workflowsFolder}/module_parameter_QC_"

def dbindex = new DBindexes()
def Correspondence = dbindex.getCorrespondence()
def ontology = dbindex.getOntology()

checkWFFiles(baseQCPath, Correspondence.keySet())

/*
 * Create a channel for mzlfiles files; Temporary for testing purposes only
 */
 
// Below handles original_id from processing of samples: 181112_Q_QC1F_01_01_9d9d9d1b-9d9d-4f1a-9d27-9d2f7635059d_QC01_0d97b132db1ecedc3b5fdbddec6fba72.zip

Channel
    //.fromPath( params.zipfiles )             
    .watchPath( params.zipfiles )             
    .map { 
        file = it
        id = it.getName()
        ext = params.zipfiles.tokenize( '/' )
        pieces = id.tokenize( '_' )
        checksum = pieces[-1].replace(".zip", "")
        [pieces[0..-4].join( '_' ), pieces[-3], pieces[-2], checksum, file]
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
    set orifile, labsys, qcode, checksum, file(zipfile) from zipfiles

    output:
    set val("${labsys}_${qcode}_${checksum}"), qcode, checksum, file("${labsys}_${qcode}_${checksum}.mzML") into mzmlfiles_for_correction
    //set val("${labsys}_${qcode}_${checksum}"), val("${orifile}") into orifile_name
    
    script:
    extrapar = ""
    if (qcode =~'QCS') {
        extrapar = "-a"
    }
    if (qcode =~'QC03') {
        extrapar = "-t \"--mzML\""
    }

    webmode = ""
    if ( params.containsKey( "webmode" ) ) {
        webmode = "-w "+params.webmode
    }

    """
     mv ${zipfile} ${labsys}_${qcode}_${checksum}.zip
     bash webservice.sh ${extrapar} -l ${labsys} -q ${qcode} -c ${checksum} -r ${labsys}_${qcode}_${checksum}.zip -i ${params.webdavip} -f ${orifile} -p ${params.webdavpass} -o ${labsys}_${qcode}_${checksum} ${webmode}
     unzip ${labsys}_${qcode}_${checksum}.mzML.zip
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
    set sample_id, internal_code, analysis_type, checksum, file("${sample_id}.qcml") into qcmlfiles_for_MS2_spectral_count, qcmlfiles_for_tot_num_uniq_peptides, qcmlfiles_for_tot_num_uniq_proteins, qcmlfiles_for_tot_num_psm, qcmlfiles_for_tic

    script:
    def outfiles = "${sample_id}.featureXML ${sample_id}.qcml ${sample_id}.idXML"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfiles, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run srm on raw data (In case QC01 // QC02) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process run_srm {
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
        def outfile = "${sample_id}.featureXML"
        def knime = new Knime(wf:workflowfile, empty_out_file:outfile, mem:"${task.memory.mega-5000}m", mzml:mzML_file, ofeatxml:"${sample_id}.featureXML", srmCSV:srmCSV)
        knime.launch()
}

/*
 * Run shotgun_qc4l_cid on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_cid {
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
    set val("${sample_id}_cid"), internal_code, val("shotgun_qc4l_cid"), checksum, file("${sample_id}.qcml") into shot_qc4l_cid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_cid_qcmlfiles_for_tot_num_psm, shot_qc4l_cid_qcmlfiles_for_tic

    script:
    def outfiles = "${sample_id}.featureXML ${sample_id}.qcml ${sample_id}.idXML"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfiles, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run shotgun_qc4l_hcd on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_hcd {
    tag { sample_id }
    
    label 'big_mem'
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun_qc4l_hcd
    file(workflowfile) from shotgun_qc4l_hcdWF
    
    when:
    analysis_type == 'shotgun_qc4l'

    output:
    set val("${sample_id}_hcd"), internal_code, val("shotgun_qc4l_hcd"), checksum, file("${sample_id}.featureXML") into shot_qc4l_hcd_featureXMLfiles_for_calc_peptide_area, shot_qc4l_hcd_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_hcd_featureXMLfiles_for_calc_median_fwhm
    set val("${sample_id}_hcd"), internal_code, val("shotgun_qc4l_hcd"), checksum, file(mzML_file) into shot_qc4l_hcd_mzML_file_for_MedianITMS1, shot_qc4l_hcd_mzML_file_for_MedianITMS2, shot_qc4l_hcd_mzML_file_for_check 
    set val("${sample_id}_hcd"), internal_code, val("shotgun_qc4l_hcd"), checksum, file("${sample_id}.qcml") into shot_qc4l_hcd_qcmlfiles_for_MS2_spectral_count, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_hcd_qcmlfiles_for_tot_num_psm, shot_qc4l_hcd_qcmlfiles_for_tic

    script:
    def outfiles = "${sample_id}.featureXML ${sample_id}.qcml ${sample_id}.idXML"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfiles, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run shotgun_qc4l_etcid on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_etcid {
    tag { sample_id }
    
    label 'big_mem'
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun_qc4l_etcid
    file(workflowfile) from shotgun_qc4l_etcidWF
    
    when:
    analysis_type == 'shotgun_qc4l'

    output:
    set val("${sample_id}_etcid"), internal_code, val("shotgun_qc4l_etcid"), checksum, file("${sample_id}.featureXML") into shot_qc4l_etcid_featureXMLfiles_for_calc_peptide_area, shot_qc4l_etcid_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_etcid_featureXMLfiles_for_calc_median_fwhm
    set val("${sample_id}_etcid"), internal_code, val("shotgun_qc4l_etcid"), checksum, file(mzML_file) into shot_qc4l_etcid_mzML_file_for_MedianITMS1, shot_qc4l_etcid_mzML_file_for_MedianITMS2, shot_qc4l_etcid_mzML_file_for_check 
    set val("${sample_id}_etcid"), internal_code, val("shotgun_qc4l_etcid"), checksum, file("${sample_id}.qcml") into shot_qc4l_etcid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_etcid_qcmlfiles_for_tot_num_psm, shot_qc4l_etcid_qcmlfiles_for_tic

    script:
    def outfiles = "${sample_id}.featureXML ${sample_id}.qcml ${sample_id}.idXML"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfiles, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run shotgun_qc4l_ethcd  on raw data (In case QC03) 
 * Choose blast_db and fasta file depending on species
 * choose genome depending on QC code in the file name // description etc .
 */

process shotgun_qc4l_ethcd  {
    tag { sample_id }
    
    label 'big_mem'
    afterScript "$baseDir/bin/fixQcml.sh"

    input:
    set genome_id, internal_code, sample_id, file(mzML_file), analysis_type, checksum, fasta_file, file ("*") from input_pipe_complete_first_step_for_shotgun_qc4l_ethcd 
    file(workflowfile) from shotgun_qc4l_ethcdWF
    
    when:
    analysis_type == 'shotgun_qc4l'

    output:
    set val("${sample_id}_ethcd"), internal_code, val("shotgun_qc4l_ethcd"), checksum, file("${sample_id}.featureXML") into shot_qc4l_ethcd_featureXMLfiles_for_calc_peptide_area, shot_qc4l_ethcd_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_ethcd_featureXMLfiles_for_calc_median_fwhm
    set val("${sample_id}_ethcd"), internal_code, val("shotgun_qc4l_ethcd"), checksum, file(mzML_file) into shot_qc4l_ethcd_mzML_file_for_MedianITMS1, shot_qc4l_ethcd_mzML_file_for_MedianITMS2, shot_qc4l_ethcd_mzML_file_for_check 
    set val("${sample_id}_ethcd"), internal_code, val("shotgun_qc4l_ethcd"), checksum, file("${sample_id}.qcml") into shot_qc4l_ethcd_qcmlfiles_for_MS2_spectral_count, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_ethcd_qcmlfiles_for_tot_num_psm, shot_qc4l_ethcd_qcmlfiles_for_tic

    script:
    def outfiles = "${sample_id}.featureXML ${sample_id}.qcml ${sample_id}.idXML"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfiles, mem:"${task.memory.mega-5000}m", mzml:mzML_file, oqcml:"${sample_id}.qcml", ofeatxml:"${sample_id}.featureXML", oidxml:"${sample_id}.idXML", fasta:fasta_file, psq:"${fasta_file}.psq")
    knime.launch()
            
}

/*
 * Run calculation of MS2 spectral count 
 */

process calc_MS2_spectral_count {
    tag { "${sample_id}-${analysis_type}" }
    
    input:
    set sample_id, internal_code, val(analysis_type), checksum, file(qcmlfile) from qcmlfiles_for_MS2_spectral_count.mix(shot_qc4l_cid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_hcd_qcmlfiles_for_MS2_spectral_count, shot_qc4l_etcid_qcmlfiles_for_MS2_spectral_count, shot_qc4l_ethcd_qcmlfiles_for_MS2_spectral_count)
    file(workflowfile) from getWFFile(baseQCPath, "MS2specCount")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['MS2specCount'][analysis_type]}.json") into ms2_spectral_for_delivery

    script:
    def analysis_id = Correspondence['MS2specCount'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def outfile = "${sample_id}_QC_${Correspondence['MS2specCount'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
}

/*
 * Run calculation of total number of unique identified peptides 
 */

process calc_tot_num_uniq_peptides {
    tag { "${sample_id}-${analysis_type}" }
   
    input:
    set sample_id, internal_code, analysis_type, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_peptides.mix(shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_peptides, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_peptides)
    file(workflowfile) from getWFFile(baseQCPath, "totNumOfUniPep")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['totNumOfUniPep'][analysis_type]}.json") into uni_peptides_for_delivery

    script:
    def analysis_id = Correspondence['totNumOfUniPep'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def outfile = "${sample_id}_QC_${Correspondence['totNumOfUniPep'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
}

/*
 * Run calculation of total number of uniquely identified proteins
 */
process calc_tot_num_uniq_proteins {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_uniq_proteins.mix(shot_qc4l_cid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_hcd_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_etcid_qcmlfiles_for_tot_num_uniq_proteins, shot_qc4l_ethcd_qcmlfiles_for_tot_num_uniq_proteins)
    file(workflowfile) from getWFFile(baseQCPath, "totNumOfUniProt")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['totNumOfUniProt'][analysis_type]}.json") into uni_prots_for_delivery

    script:
    def analysis_id = Correspondence['totNumOfUniProt'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def outfile = "${sample_id}_QC_${Correspondence['totNumOfUniProt'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of total number of Peptide Spectral Matches
 */
process calc_tot_num_psm {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(qcmlfile) from qcmlfiles_for_tot_num_psm.mix(shot_qc4l_cid_qcmlfiles_for_tot_num_psm, shot_qc4l_hcd_qcmlfiles_for_tot_num_psm, shot_qc4l_etcid_qcmlfiles_for_tot_num_psm, shot_qc4l_ethcd_qcmlfiles_for_tot_num_psm)
    file(workflowfile) from getWFFile(baseQCPath, "totNumOfPsm")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['totNumOfPsm'][analysis_type]}.json") into tot_psm_for_delivery

    script:
    def analysis_id = Correspondence['totNumOfPsm'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def outfile = "${sample_id}_QC_${Correspondence['totNumOfPsm'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, mem:"${task.memory.mega-5000}m", qcml:qcmlfile, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of median IT MS1
 */
process calc_median_IT_MS1 {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(mzml_file) from shot_mzML_file_for_MedianITMS1.mix(srm_mzML_file_for_MedianITMS1, shot_qc4l_cid_mzML_file_for_MedianITMS1, shot_qc4l_hcd_mzML_file_for_MedianITMS1, shot_qc4l_etcid_mzML_file_for_MedianITMS1, shot_qc4l_ethcd_mzML_file_for_MedianITMS1)
    file(workflowfile) from getWFFile(baseQCPath, "medianITMS1")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['medianITMS1'][analysis_type]}.json") into median_itms1_for_delivery

    script:
    def analysis_id = Correspondence['medianITMS1'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def outfile = "${sample_id}_QC_${Correspondence['medianITMS1'][analysis_type]}.json" 
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, mem:"${task.memory.mega-5000}m", mzml:mzml_file, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of median IT MS2
 */
process calc_median_IT_MS2 {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(mzml_file) from shot_mzML_file_for_MedianITMS2.mix(srm_mzML_file_for_MedianITMS2, shot_qc4l_cid_mzML_file_for_MedianITMS2, shot_qc4l_hcd_mzML_file_for_MedianITMS2, shot_qc4l_etcid_mzML_file_for_MedianITMS2, shot_qc4l_ethcd_mzML_file_for_MedianITMS2)
    file(workflowfile) from getWFFile(baseQCPath, "medianITMS2")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['medianITMS2'][analysis_type]}.json") into median_itms2_for_delivery

    script:
    def analysis_id = Correspondence['medianITMS2'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def outfile = "${sample_id}_QC_${Correspondence['medianITMS2'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile,  empty_out_file:outfile, mem:"${task.memory.mega-5000}m", mzml:mzml_file, qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of peptide area (only QC1 and QC2)
 */
process calc_peptide_area {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, val(internal_code), analysis_type, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_peptide_area.mix(srm_featureXMLfiles_for_calc_peptide_area)
	file ("peptide.csv") from file (peptideCSV)
	file ("peptide_C4L.csv") from file (peptideCSV_C4L)
    file(workflowfile) from getWFFile(baseQCPath, "pepArea")

    output:
    set sample_id, internal_code, checksum, val("${Correspondence['pepArea'][analysis_type]}"), file("${sample_id}_QC_${Correspondence['pepArea'][analysis_type]}.json") into pep_area_for_check

    script:
    def analysis_id = Correspondence['pepArea'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def csvfile = peptideCSVs[internal_code]
	def outfile = "${sample_id}_QC_${Correspondence['pepArea'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, csvpep:csvfile, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Run calculation of peptide area (Only QC3 // hcd)
 */
process calc_peptide_area_c4l {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_qc4l_hcd_featureXMLfiles_for_calc_peptide_area
	file ("peptide.csv") from file (peptideCSV)
	file ("peptide_C4L.csv") from file (peptideCSV_C4L)
    file(workflowfile) from getWFFile(baseQCPath, "pepArea_qc4l")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['pepArea_qc4l'][analysis_type]}.json") into pep_c4l_for_delivery

    script:
    def analysis_id = Correspondence['pepArea_qc4l'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def csvfile = peptideCSVs[internal_code]
    def outfile = "${sample_id}_QC_${Correspondence['pepArea_qc4l'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, csvpep:csvfile, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}", extrapars:'-workflow.variable=delta_mass,10,double -workflow.variable=delta_rt,250,double -workflow.variable=charge,2,double -workflow.variable=threshold_area,1000000,double')
    knime.launch()
    
}

/*
 * Run calculation of peptide area (Only QC3 // others) WORKAROUND
 */
process calc_peptide_area_c4l_fake {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_qc4l_cid_featureXMLfiles_for_calc_peptide_area.mix(shot_qc4l_etcid_featureXMLfiles_for_calc_peptide_area, shot_qc4l_ethcd_featureXMLfiles_for_calc_peptide_area)

    output:
    set sample_id, val(null) into pep_c4l_for_delivery_fake

    script:
	"""
	echo "this is a workaround because of a nextflow problem"
	"""
    
}

/*
 * Run calculation of Sum of all Total Ion Current per RT
 */
process calc_tic {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, val(analysis_type), checksum, file(qcmlfile) from qcmlfiles_for_tic.mix(shot_qc4l_cid_qcmlfiles_for_tic, shot_qc4l_hcd_qcmlfiles_for_tic, shot_qc4l_etcid_qcmlfiles_for_tic, shot_qc4l_ethcd_qcmlfiles_for_tic)
    file(workflowfile) from getWFFile(baseQCPath, "tic")

    output:
    set sample_id, file("${sample_id}_QC_${Correspondence['tic'][analysis_type]}.json") into tic_for_delivery

    script:
    def analysis_id = Correspondence['tic'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def outfile = "${sample_id}_QC_${Correspondence['tic'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, qcml:qcmlfile, stype:internal_code, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()   
}
 
 
/*
 * Run calculation of Mass accuracy
 */
 process calc_mass_accuracy {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_mass_accuracy.mix(srm_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_cid_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_hcd_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_etcid_featureXMLfiles_for_calc_mass_accuracy, shot_qc4l_ethcd_featureXMLfiles_for_calc_mass_accuracy)
	file ("peptide.csv") from file (peptideCSV)
	file ("peptide_C4L.csv") from file (peptideCSV_C4L)
    file(workflowfile) from getWFFile(baseQCPath, "massAccuracy") 

    output:
    set sample_id, internal_code, checksum, val("${Correspondence['massAccuracy'][analysis_type]}"),  file("${sample_id}_QC_${Correspondence['massAccuracy'][analysis_type]}.json") into mass_json_for_check

    script:
    def analysis_id = Correspondence['massAccuracy'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def csvfile = peptideCSVs[internal_code]
    def outfile = "${sample_id}_QC_${Correspondence['massAccuracy'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, csvpep:csvfile, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()

}

/*
 * Run calculation of Median Fwhm
 */
 process calc_median_fwhm {
    tag { "${sample_id}-${analysis_type}" }

    input:
    set sample_id, internal_code, analysis_type, checksum, file(featxml_file) from shot_featureXMLfiles_for_calc_median_fwhm.mix(srm_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_cid_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_hcd_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_etcid_featureXMLfiles_for_calc_median_fwhm, shot_qc4l_ethcd_featureXMLfiles_for_calc_median_fwhm)
	file ("peptide.csv") from file (peptideCSV)
	file ("peptide_C4L.csv") from file (peptideCSV_C4L)
    file(workflowfile) from getWFFile(baseQCPath, "medianFwhm") 

    output:
    set sample_id, internal_code, checksum, val("${Correspondence['medianFwhm'][analysis_type]}"),  file("${sample_id}_QC_${Correspondence['medianFwhm'][analysis_type]}.json") into median_fwhm_for_check

    script:
    def analysis_id = Correspondence['medianFwhm'][analysis_type]
    def ontology_id = ontology[analysis_id]
    def csvfile = peptideCSVs[internal_code]
    def outfile = "${sample_id}_QC_${Correspondence['medianFwhm'][analysis_type]}.json"
    def knime = new Knime(wf:workflowfile, empty_out_file:outfile, csvpep:csvfile, stype:internal_code, featxml:featxml_file, mem:"${task.memory.mega-5000}m", qccv:"QC_${analysis_id}", qccvp:"QC_${ontology_id}", chksum:checksum, ojid:"${sample_id}")
    knime.launch()
    
}

/*
 * Check petide results 
 */
 process check_peptides {
    tag { "${sample_id}-${process_id}-json_file" }
    beforeScript("mkdir out")

    input:
	file ("peptide.csv") from file (peptideCSV)
	file ("peptide_C4L.csv") from file (peptideCSV_C4L)
	set sample_id, internal_code, checksum, process_id, file(json_file) from pep_area_for_check
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("out/${json_file}") into pep_checked_for_delivery

    script:
    def csvfile = peptideCSVs[internal_code]
    def outfile = "out/${json_file}"
    def knime = new Knime(qccv:"QC_${process_id}", empty_out_file:outfile, wf:workflowfile, chksum:checksum, csvpep:csvfile, stype:internal_code, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./out", ojfile:"${json_file}")
    knime.launch()
}

/*
 * Check mass results 
 */
 process check_mass {
    tag { sample_id }
    beforeScript("mkdir out")

    input:
    set sample_id, internal_code, checksum, process_id, file(json_file) from mass_json_for_check
	file ("peptide.csv") from file (peptideCSV)
	file ("peptide_C4L.csv") from file (peptideCSV_C4L)
	file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("out/${json_file}") into mass_checked_for_delivery

    script:
    def csvfile = peptideCSVs[internal_code]
    def outfile = "out/${json_file}"
    def knime = new Knime(qccv:"QC_${process_id}", empty_out_file:outfile, wf:workflowfile, chksum:checksum,  csvpep:csvfile, stype:internal_code, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./out", ojfile:"${json_file}")
    knime.launch()
}

/*
 * Check fwhm results 
 */
 process check_fwhm {
    tag { sample_id }
    beforeScript("mkdir out")
	
    input:
    set sample_id, internal_code, checksum, process_id, file(json_file) from median_fwhm_for_check
	file ("peptide.csv") from file (peptideCSV)
	file ("peptide_C4L.csv") from file (peptideCSV_C4L)
    file(workflowfile) from chekPeptidesWF

    output:
    set sample_id, file("out/${json_file}") into median_checked_for_delivery

    script:
    def csvfile = peptideCSVs[internal_code]
    def outfile = "out/${json_file}"
    def knime = new Knime(qccv:"QC_${process_id}", empty_out_file:outfile, wf:workflowfile, chksum:checksum,  csvpep:csvfile, stype:internal_code, ijfile:json_file, mem:"${task.memory.mega-5000}m", ofolder:"./out", ojfile:"${json_file}")
    knime.launch()
}

process check_mzML {
    tag { sample_id }
	   
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

/*
 * Reshaping channels
 */

// mix peptide channels (from QC01, QC02 and QC03 to have for each id a number of results) 
pep_c4l_all = pep_c4l_for_delivery_fake.mix(pep_c4l_for_delivery, pep_checked_for_delivery)
// joins channels common to any analysis in a single channel 
ms2_spectral_for_delivery.join(tic_for_delivery).join(tot_psm_for_delivery).join(uni_peptides_for_delivery).join(uni_prots_for_delivery).join(median_itms2_for_delivery).join(mass_checked_for_delivery).join(median_checked_for_delivery).join(median_itms1_for_delivery).join(pep_c4l_all).into{jointJsons; jointJsonsAA}

// separate this channel depending on QC01-QC02/ QC03
queueQC12 = Channel.create()
queueQC03 = Channel.create()
jointJsons.choice( queueQC03, queueQC12 ) { a -> a =~ /QC03/ ? 0 : 1 }

// group the outputs of QC03 depending on the original id
queueQC03Grouped = queueQC03.map{ 
    def rawids = it[0].tokenize( '_' );
    def orid = "${rawids[0]}_${rawids[1]}_${rawids[2]}";
    def l = [orid]; 
    l.addAll([it.drop(1)]); 
    return l 
}.groupTuple(size:4)

queueQC03ToBeSent = queueQC03Grouped.map{
	def id = [it[0]]
	id.addAll([it.drop(1).flatten()]); 
	return id
}

// reshape the QC01-QC02 channel
queueQC12ToBeSent = queueQC12.map{ 
    def rawids = it[0].tokenize( '_' );
    def orid = "${rawids[0]}_${rawids[1]}_${rawids[2]}";
    def l = [orid]; 
    l.addAll([it.drop(1)]); 
    return l 
}

// mix the QC01-QC02 and QC03 again
jsonToBeSent = queueQC12ToBeSent.mix(queueQC03ToBeSent)

// reshape the mZML params channel for the submission 
mZML_params_for_delivery = mZML_params_for_mapping.map{
        def rawids = it[0].tokenize( '_' )
        def sample_id = "${rawids[0]}_${rawids[1]}_${rawids[2]}"
        [sample_id , it[1], it[3], it[4].text, it[5].text]
}.unique()


/*
 * Sent to the DB
 */
 process sendToDB {
    tag { sample_id }
    //label 'local'

    input:
    file(workflowfile) from api_connectionWF

    set sample_id, internal_code, checksum, timestamp, filename, file("*") from mZML_params_for_delivery.join(jsonToBeSent)
    val db_host from params.db_host

    script:
    def pieces = sample_id.tokenize( '_' )
    def instrument_id = pieces[0] 
    def parent_id = ontology[internal_code]
    def filepieces = filename.tokenize( '_' )
    def orifile = filepieces[0..-4].join( '_' )

   def knime = new Knime(wf:workflowfile, rdate:timestamp, oriname:orifile, chksum:checksum, stype:internal_code, ifolder:".", labs:instrument_id, utoken:"${db_host}/api/auth", uifile:"${db_host}/api/file/QC:${parent_id}", uidata:"${db_host}/api/data/pipeline", mem:"${task.memory.mega-5000}m")
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
     

