# QCLOUD 2.0 PIPELINE (Nextflow+Knime)

## STEP 1</br></br> 

Folder where the data will be collected: 
```
/users/pr/nodes/incoming/$YYMM
```

Define file path and its filename: 
```
$file_path = /users/pr/nodes/incoming/1806/180531_Q_QC1F_01_02.mzML
$filename = 180531_Q_QC1F_01_02
```

Remove XML namespace: 
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```

Get mzML run date:
```
$creation_date = xmllint --xpath 'string(/indexedmzML/mzML/run/@startTimeStamp)' $file_path | sed -e 's@T@ @g' | sed -e 's@Z@@g' 
```

Get mzML cheksum: 
```
$checksum = md5sum  $file_path | awk '{ print $1 }'
```

Define the LS-MS where the data come from (it will be extracted from filename):  
```
$lumos_apikey='02656d22-b9d9-43e1-9375-f257b5f9717c'
```

Prepare the JSON file where the data will be sent and stored: 
```
$json_body='{"labSystem": {"creationDate": "$creation_date","filename": "$filename","checksum":"$cheksum"}'
```

Store the JSON file in the filesystem: 
```
echo $json_body > /users/pr/nodes/outgoing/JSON/1806/QCPIPELINE_STEP1_$filename.json
```

Send the JSON file to QCloud database: 

- GET token for authentication (jq commandline JSON processor must be installed): 

```
$token = curl -i -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '{"username": "daniel.mancera@crg.eu","password": "q........7"}' 'http://172.17.151.92:8080/api/auth' | jq -r '.token'
```

- POST file metadata in the QCloud database: 

```
curl -i -H 'Authorization:$token' -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '$json_body' 'http://172.17.151.92:8080/api/file/QC:0000005/$lumos_apikey'
```

- For instance:

```
curl -i -H 'Authorization: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYW5pZWwubWFuY2VyYUBjcmcuZXUiLCJhdWRpZW5jZSI6IndlYiIsImNyZWF0ZWQiOjE1Mjg4NzMwODAyNjYsImV4cCI6MTUyOTQ3Nzg4MCwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlJPTEVfVVNFUiJ9LHsiYXV0aG9yaXR5IjoiUk9MRV9NQU5BR0VSIn0seyJhdXRob3JpdHkiOiJST0xFX0FETUlOIn1dfQ.McZK9coRSgOQ7-XxhokBaakQqOh_mE33tprrxOIfMelTY-s5BDRGKSIOYJfGvGzwAAzLzoPm1w32Q5I979hd3w' -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '{"creationDate": "2018-05-31 21:45:05","filename": "180531_Q_QC1F_01_02","checksum":"a593cea2cd0924f529e3b6d8bdf45664"}' 'http://172.17.151.92:8080/api/file/QC:0000005/02656d22-b9d9-43e1-9375-f257b5f9717c'
 ```
 
## STEP 2</br> </br> 

Proteomics OpenMS KNIME workflow: </br> </br> 

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/qcloud/nextflow/workflows/module_workflow_shotgun.knwf" -workflow.variable=input_mzml_file,/users/pr/nodes/incoming/1806/180531_Q_QC1F_01_02.mzML,String -workflow.variable=input_fasta_file,/users/pr/qcloud/nextflow/fasta/sp_bovine_2015_11_wo_contaminants_shuffled.fasta,String -workflow.variable=input_fasta_psq_file,/users/pr/qcloud/nextflow/blastdb/shotgun_bsa.fasta.psq,String -workflow.variable=output_featurexml_file,/users/pr/nodes/outgoing/featureXML/1806/180531_Q_QC1F_01_02.featureXML,String -workflow.variable=output_qcml_file,/users/pr/nodes/outgoing/qcML/1806/180531_Q_QC1F_01_02.qcml,String -workflow.variable=output_idxml_file,/users/pr/nodes/outgoing/idXML/1806/180531_Q_QC1F_01_02.idxml,String
```

## STEP 3</br> </br> 

In general a KNIME workflow will accept one or more OpenMS files like .mzML, .qcML, etc. depending on the QC parameter to compute. The output must be a JSON file with this filename: QCCVCODENUM_FILENAME.json, for instance QC1001844_180308_Q_QC01_01_01.json. 

![2018-06-08 10_54_03-qcloud-detailed-overview pptx - powerpoint](https://user-images.githubusercontent.com/1679820/41148872-5489c732-6b0a-11e8-9515-857171236b77.png)

Workflow name: module_parameter_QC_1001844.knwf</br>
Extracted parameters: QC:1001844 (MS1 feature area or peak area)</br></br>

input_csv_file, list of peptides for QC01 and QC02</br>
input_featurexml_file, is the .featureXML from the output of module_workflow_shotgun</br>
input_sample_type, QC01 or QC02</br>
output_json_file, output JSON filename</br>
output_json_folder, output JSON folder</br></br>

Sets the QC parameter and workflow to search: 

```
$cvqc='QC_1001844'
```

KNIME QC parameter computing module: 

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/qcloud/nextflow/workflows/module_parameter_QC_1001844.knwf" -workflow.variable=input_csv_file,/users/pr/qcloud/nextflow/csv/knime_peptides_final.csv,String -workflow.variable=input_featurexml_file,/users/pr/nodes/outgoing/featureXML/1806/180531_Q_QC1F_01_02.featureXML,String -workflow.variable=output_json_file,$cvqc_'180531_Q_QC1F_01_02',String -workflow.variable=output_json_folder,/users/pr/nodes/outgoing/JSON/1806,String -workflow.variable=input_sample_type,QC01,String
```

Store the KNIME output file path to a variable: 

```
$output_param_json_file = '/users/pr/nodes/outgoing/JSON/1806/QC_1001844_180531_Q_QC1F_01_02.json'
```

Store JSON file to QCloud database: 

```
curl -i -H 'Authorization: $token' -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '$output_param_json_file' 'http://172.17.151.92:8080/api/data/peptides/QC:1001844/a593cea2cd0924f529e3b6d8bdf45664'
```

For instance: 

```
curl -i -H 'Authorization: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYW5pZWwubWFuY2VyYUBjcmcuZXUiLCJhdWRpZW5jZSI6IndlYiIsImNyZWF0ZWQiOjE1Mjg4NzMwODAyNjYsImV4cCI6MTUyOTQ3Nzg4MCwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlJPTEVfVVNFUiJ9LHsiYXV0aG9yaXR5IjoiUk9MRV9NQU5BR0VSIn0seyJhdXRob3JpdHkiOiJST0xFX0FETUlOIn1dfQ.McZK9coRSgOQ7-XxhokBaakQqOh_mE33tprrxOIfMelTY-s5BDRGKSIOYJfGvGzwAAzLzoPm1w32Q5I979hd3w' -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '[{"sequence" : "HLVDEPQNLIK","value" : 624275000}, {"sequence" : "LVNELTEFAK","value" : 652085000}, {"sequence" : "YIC(Carbamidomethyl)DNQDTISSK","value" : 467011000}]' 'http://172.17.151.92:8080/api/data/peptides/QC:1001844/a593cea2cd0924f529e3b6d8bdf45664'
```
