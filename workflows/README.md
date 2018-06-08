# QCLOUD 2.0 PIPELINE (Nextflow+Knime)

## STEP 1</br></br> 

Clean and send file info to the QCloud server</br> </br> 

Description: given a mzML, removes the string xmlns="http://psi.hupo.org/ms/mzml" in both 'indexedmzML' and 'mzML' tags inside the mzML file. Also extracts an attribute from the mzML file (startTimeStamp), the checksum of the file and the instrument API key. Later all this information is sent in JSON format to the server.</br> </br>   

```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.mzML
```

```
xmllint --xpath 'string(/indexedmzML/mzML/run/@startTimeStamp)' /users/pr/rolivella/mydata/mzml/180308_Q_QC1X_01_01_WO_xmlns.mzML
```

```
cksum $filename
```

```
$lumos_apikey='a79c4765-aeaf-488e-97fd-ee4479b0b261'
```

```
$json_body='{"labSystem": {"apiKey": "$lumos_apikey"},"creationDate": "$output_from_xmllint","filename": "$filename","checksum":"$cheksum"}'
```

```
echo $json_body > QCPIPELINE_STEP1_$filename.json
```

```
curl -i -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '$json_body' 'http://172.17.151.92:8080/api/file/add/QC:0000005'
```
 
## STEP 2</br> </br> 

Proteomics workflow: </br> </br> 


```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun.knwf" -workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzml/180308_Q_QC1X_01_01_WO_xmlns.mzML,String -workflow.variable=input_fasta_file,/users/pr/databases/sp_human_2015_10_contaminants_plus_shuffled.fasta,String -workflow.variable=input_fasta_psq_file,/users/pr/databases/BLASTformattedDB/sp_human_2015_10_contaminants_plus_shuffled.fasta.psq,String -workflow.variable=output_featurexml_file,/users/pr/rolivella/mydata/featureXML/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=output_qcml_file,/users/pr/rolivella/mydata/qcml/180308_Q_QC1X_01_01.qcml,String -workflow.variable=output_idxml_file,/users/pr/rolivella/mydata/idXML/180308_Q_QC1X_01_01.idxml,String
```

## STEP 3</br> </br> 

Clean output featureXML, qcML, idXML</br> </br> 

```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.mzML
```

```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.qcML
```

```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.featureXML
```

## STEP 4</br> </br> 

In general a KNIME workflow will accept one or more OpenMS files like .mzML, .qcML, etc. depending on the QC parameter to compute. The output must be a JSON file with this filename: QCCVCODENUM_FILENAME.json, for instance QC1001844_180308_Q_QC01_01_01.json. 

![2018-06-08 10_54_03-qcloud-detailed-overview pptx - powerpoint](https://user-images.githubusercontent.com/1679820/41148872-5489c732-6b0a-11e8-9515-857171236b77.png)

Workflow name: module_parameter_QC_1001844.knwf</br>
Extracted parameters: QC:1001844 (MS1 feature area or peak area)</br></br>

input_csv_file, list of peptides for QC01 and QC02</br>
input_featurexml_file, is the .featureXML from the output of module_workflow_shotgun</br>
input_sample_type, QC01 or QC02</br>
output_json_file, output JSON filename</br>
output_json_folder, output JSON folder</br></br>

```
$cvqc='QC_1001844'
```

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_'$cvqc'.knwf" -workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String -workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=output_json_file,$cvqc'180308_Q_QC1X_01_01',String -workflow.variable=output_json_folder,/users/pr/nodes/outgoing,String -workflow.variable=input_sample_type,QC01,String
```

```
curl -i -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '$json_body' 'http://172.17.151.92:8080/api/file/add/QC:0000005'
```
