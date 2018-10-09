# QCLOUD 2.0 PIPELINE (Nextflow+Knime)

## STEP 1 - Proteomics workflows</br> </br> 

Remove XML namespace from mzML file: 
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```
Proteomics **SHOTGUN** (QC01, QC02 and QC03): </br>

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
Remove XML namespace from qcML file:
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```

Proteomics **SRM**: </br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_srm.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/cc58d80d-6e1e-4902-9adc-b0e0d27eb357_QCS1_5c40d14cf709afec1b6d5a968ba222a3.mzML,String \
-workflow.variable=input_traml,/users/pr/rolivella/mydata/traml/qtrap_bsa.traml,String \
-workflow.variable=output_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/cc58d80d-6e1e-4902-9adc-b0e0d27eb357_QCS1_5c40d14cf709afec1b6d5a968ba222a3.featureXML,String
```
## STEP 2 - QC parameters</br> </br> 

module_parameter_QC_0000007 (MS2 spectral count) (Only Shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000007.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000007,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000029 (Total number of PSM) (Only Shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000029.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000029,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000031 (Total number of uniquely identified peptides) (Only shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000031.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000031,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000032 (Total number of uniquely identified proteins) (Only shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000032.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000032,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```

module_parameter_QC_1000928 (MEDIAN IT MS2) (Both Shotgun and SRM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1000928.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_string_qccv,QC_1000928,String \
-workflow.variable=input_string_qccv_parent,QC_9000002,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1001844 (Peptide Area) (Both Shotgun and SRM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1001844.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1001844,String \
-workflow.variable=input_string_qccv_parent,QC_1000014,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```

module_parameter_QC_1001844_qc4l (Peptide Area) (for Shotgun QC4L)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1001844_qc4l.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/20180925_isotopologues_complete.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/180928_Q_QC4L_01_01_aliquot1_vial66.featureXML,String \
-workflow.variable=input_sample_type,QC03,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1001844,String \
-workflow.variable=input_string_qccv_parent,QC_1000014,String \
-workflow.variable=output_json_folder,/users/pr/rolivella/mydata/json,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=delta_mass,5,String \
-workflow.variable=delta_rt,250,String \
-workflow.variable=charge,2,String
```

module_parameter_QC_1000014 (Mass accuracy) (Both Shotgun and SRM)
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
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1010086 (Median Fwhm) (Both Shotgun and SRM)
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
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```

## STEP 3 - Check peptide JSON files, send to database and move</br> </br> 

module_check_peptides (only for QC_1000014,QC_1001844 and QC_1010086)

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_check_peptides.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_string_qccv,QC_1010086,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_json_folder,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
-workflow.variable=input_json_filename,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
-workflow.variable=output_json_filename,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
```

module_api_conn 

input_mass_spec_run_date =
```
xmllint --xpath 'string(/indexedmzML/mzML/run/@startTimeStamp)' /users/pr/rolivella/mydata/mzML/nf/9d9d9d1b-9d9d-4f1a-9d27-9d2f7635059d_QC03_54c6681460c136b37fce4caadda655ed.mzML

```

input_original_name = 

```
xmllint --xpath 'string(/indexedmzML/mzML/fileDescription/sourceFileList/sourceFile/@name)' /users/pr/rolivella/mydata/mzML/nf/181004_Q_QC1F_01_04.mzML
```

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
-workflow.variable=input_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \ 
-workflow.variable=input_mass_spec_run_date,$$$input_mass_spec_run_date$$$,String \
-workflow.variable=input_original_name,$$$input_mass_spec_run_date$$$,String

```
