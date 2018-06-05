Knime workflows batch execution: 

STEP 1 

Clean mzML

Description: given a mzML, removes the string xmlns="http://psi.hupo.org/ms/mzml" in both 'indexedmzML' and 'mzML' tags inside the mzML file. Also extracts an attribute from the mzML file (startTimeStamp) to be stored in a JSON file (fileinfo.json). 

```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.mzML
xmllint --xpath 'string(/indexedmzML/mzML/run/@startTimeStamp)' /users/pr/rolivella/mydata/mzml/180308_Q_QC1X_01_01_WO_xmlns.mzML
echo '{"startTimeStamp": $output_from_xmllint}' > fileinfo.json
```

STEP 2

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun.knwf" -workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzml/180308_Q_QC1X_01_01_WO_xmlns.mzML,String -workflow.variable=input_fasta_file,/users/pr/databases/sp_human_2015_10_contaminants_plus_shuffled.fasta,String -workflow.variable=input_fasta_psq_file,/users/pr/databases/BLASTformattedDB/sp_human_2015_10_contaminants_plus_shuffled.fasta.psq,String -workflow.variable=output_featurexml_file,/users/pr/rolivella/mydata/featureXML/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=output_qcml_file,/users/pr/rolivella/mydata/qcml/180308_Q_QC1X_01_01.qcml,String -workflow.variable=output_idxml_file,/users/pr/rolivella/mydata/idXML/180308_Q_QC1X_01_01.idxml,String
```

STEP 3

Clean featureXML, qcML, idXML

```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.mzML
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.qcML
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.featureXML
```

STEP 4

Workflow name: module_parameter_featurexml.knwf</br>
Extracted parameters: mass accuracy, peak area, fwhm</br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_featurexml.knwf" -workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_bsa_list.csv,String -workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=output_json_file,180308_Q_QC1X_01_01_featurexml,String -workflow.variable=output_json_folder,/users/pr/nodes/outgoing,String
```

Workflow name: module_parameter_it_ms1.knwf</br>
Extracted parameters: mean IT of id peptides MS2</br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_it_ms1.knwf" -workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzml/180308_Q_QC1X_01_01_WO_xmlns.mzML,String -workflow.variable=output_json_file,180308_Q_QC1X_01_01_it_ms1,String -workflow.variable=output_json_folder,/users/pr/rolivella/mydata/json,String
```

Workflow name: module_parameter_it_ms2.knwf</br>
Extracted parameters: mean IT of id peptides MS2</br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_it_ms2.knwf" -workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzml/180308_Q_QC1X_01_01_WO_xmlns.mzML,String -workflow.variable=output_json_file,180308_Q_QC1X_01_01_it_ms2,String -workflow.variable=output_json_folder,/users/pr/rolivella/mydata/json,String
```

Workflow name: module_parameter_tic_sum.knwf</br>
Extracted parameters: TIC sum</br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_tic_sum.knwf" -workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcml/180426Q_QC1X_01_08-201804302202.qcml,String -workflow.variable=output_json_file,180308_Q_QC1X_01_01_tic_sum,String -workflow.variable=output_json_folder,/users/pr/rolivella/mydata/json,String 
```




