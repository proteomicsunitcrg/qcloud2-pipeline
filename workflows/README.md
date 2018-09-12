# QCLOUD 2.0 PIPELINE (Nextflow+Knime)

## STEP 1 - Proteomics workflows</br> </br> 

Remove XML namespace from mzML file: 
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```
Proteomics **SHOTGUN**: </br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_fasta_file,/users/pr/databases/sp_bovine_2015_11_wo_contaminants_shuffled.fasta,String \
-workflow.variable=input_fasta_psq_file,/users/pr/databases/BLASTformattedDB/sp_bovine_2015_11_wo_contaminants_shuffled.fasta.psq,String \
-workflow.variable=output_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=output_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=output_idxml_file,/users/pr/rolivella/mydata/idXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.idxml,String
```
Proteomics **SRM**: </br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_srm.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/cc58d80d-6e1e-4902-9adc-b0e0d27eb357_QCS1_5c40d14cf709afec1b6d5a968ba222a3.mzML,String \
-workflow.variable=input_traml,/users/pr/rolivella/mydata/traml/qtrap_bsa.traml,String \
-workflow.variable=output_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/cc58d80d-6e1e-4902-9adc-b0e0d27eb357_QCS1_5c40d14cf709afec1b6d5a968ba222a3.featureXML,String
```
Remove XML namespace from qcML file: 
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```

## STEP 2 - QC parameters</br> </br> 

module_parameter_QC_0000007 (MS2 spectral count)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000007.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000007,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000029 (Total number of PSM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000029.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000029,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000031 (Total number of uniquely identified peptides)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000031.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000031,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000032 (Total number of uniquely identified proteins)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000032.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000032,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1000927 (MEDIAN IT MS1)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1000927.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_string_qccv,QC_1000927,String \
-workflow.variable=input_string_qccv_parent,QC_9000002,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1000928 (MEDIAN IT MS2)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1000928.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_string_qccv,QC_1000928,String \
-workflow.variable=input_string_qccv_parent,QC_9000002,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1001844 (Peptide Area)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1001844.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1001844,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1000014 (Mass accuracy)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1000014.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1000014,String \
-workflow.variable=input_string_qccv_parent,QC_1000014,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1010086 (Median Fwhm)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1010086.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1010086,String \
-workflow.variable=input_string_qccv_parent,QC_1010086,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
## STEP 3 - Check peptide JSON files, send to database and move</br> </br> 

module_check_peptides (only for QC_1000014,QC_1010086 and QC_1000014)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_check_peptides.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1010086,String \
-workflow.variable=input_json_absolute_path,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_filename,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_api_conn
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_api_conn.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_labsystem,70fa8350-1b1b-467e-a714-2b293adef295,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_url_token,http://192.168.101.37:8080/api/auth,String \
-workflow.variable=input_url_insert_file,http://192.168.101.37:8080/api/file/QC:0000005,String \
-workflow.variable=input_url_insert_data,http://192.168.101.37:8080/api/data/pipeline,String \
-workflow.variable=input_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String
```
All inserted JSONs must be moved to the "processed" folder. 
