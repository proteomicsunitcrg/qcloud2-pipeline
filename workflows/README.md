# QCLOUD 2.0 PIPELINE (Nextflow+Knime)

## STEP 1</br></br> 

Folder where the data will be collected: 
```
/users/pr/nodes/incoming/$YYMM
```

Define file path and its filename: 
```
$file_path = /users/pr/nodes/outgoing/mzML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.raw.mzML
$filename = 02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887
```

Remove XML namespace: 
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```
 
## STEP 2</br> </br> 

Proteomics **SHOTGUN**: </br> </br> 

input_mzml_file, input mzML file</br>
input_fasta_file, input FASTA database file (BSA or HeLa)</br>
input_fasta_psq_file, input FASTA.PSQ database file (BSA or HeLa)</br>
output_featurexml_file, output featureXML filename and path</br>
output_qcml_file, output qcXML filename and path</br>
output_idxml_file, output idXML filename and path</br></br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/qcloud/nextflow/workflows/module_workflow_shotgun.knwf" -workflow.variable=input_mzml_file,/users/pr/nodes/outgoing/mzML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.mzML,String -workflow.variable=input_fasta_file,/users/pr/qcloud/nextflow/fasta/sp_bovine_2015_11_wo_contaminants_shuffled.fasta,String -workflow.variable=input_fasta_psq_file,/users/pr/qcloud/nextflow/blastdb/shotgun_bsa.fasta.psq,String -workflow.variable=output_featurexml_file,/users/pr/nodes/outgoing/featureXML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.featureXML,String -workflow.variable=output_qcml_file,/users/pr/nodes/outgoing/qcML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.qcml,String -workflow.variable=output_idxml_file,/users/pr/nodes/outgoing/idXML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.idxml,String
```
Proteomics **SRM**: </br> </br> 

input_mzml_file, input mzML file</br>
input_traml, input mzML file</br>
output_featurexml_file, output featureXML filename and path</br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/qcloud/nextflow/workflows/module_workflow_srm.knwf" -workflow.variable=input_mzml_file,42839b81-9038-4b86-b1b6-c55d7cd9503c_QC01_f3672ebc3f88fbbf976ac4e52cd3f98f.mzML,String -workflow.variable=input_traml,/users/pr/qcloud/nextflow/fasta/sp_bovine_2015_11_wo_contaminants_shuffled.fasta,String -workflow.variable=input_fasta_psq_file,/users/pr/qcloud/nextflow/blastdb/shotgun_bsa.fasta.psq,String -workflow.variable=output_featurexml_file,/users/pr/nodes/outgoing/featureXML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.featureXML,String -workflow.variable=output_qcml_file,/users/pr/nodes/outgoing/qcML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.qcml,String -workflow.variable=output_idxml_file,/users/pr/nodes/outgoing/idXML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.idxml,String
```

## STEP 3</br> </br> 

In general a KNIME workflow will accept one or more OpenMS files like .mzML, .qcML, etc. depending on the QC parameter to compute. The output must be a JSON file with this filename: QCCVCODENUM_FILENAME.json, for instance QC1001844_180308_Q_QC01_01_01.json. 

![2018-06-08 10_54_03-qcloud-detailed-overview pptx - powerpoint](https://user-images.githubusercontent.com/1679820/41148872-5489c732-6b0a-11e8-9515-857171236b77.png)

Workflow name: module_parameter_QC_1001844.knwf</br>
Extracted parameters: QC:1001844 (MS1 feature area or peak area)</br></br>

input_csv_file, list of peptides for QC01 and QC02</br>
input_featurexml_file, is the .featureXML from the output of module_workflow_shotgun</br>
input_sample_type, QC01 or QC02</br>
input_string_checksum, file checksum</br>
output_json_file, output JSON filename</br>
output_json_folder, output JSON folder</br>

Sets the QC parameter and workflow to search: 

```
$cvqc='QC_1001844'
```

KNIME QC parameter computing module: 

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1001844_v2.knwf" -workflow.variable=input_csv_file,/users/pr/qcloud/nextflow/csv/knime_peptides_final.csv,String -workflow.variable=input_featurexml_file,/users/pr/nodes/outgoing/featureXML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.featureXML,String -workflow.variable=input_sample_type,QC01,String -workflow.variable=input_string_checksum,96410bfd152abfc6565266c837ce7887,String -workflow.variable=output_json_file,'02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887_QC_1001844.json',String -workflow.variable=output_json_folder,/users/pr/nodes/outgoing/JSON/1806,String 
```

Store JSON file to QCloud database: 

[pending]
