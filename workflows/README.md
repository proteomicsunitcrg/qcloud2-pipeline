# QCLOUD 2.0 PIPELINE (Nextflow+Knime)

## STEP 1</br>

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

Proteomics **SHOTGUN**: </br>

input_mzml_file, input mzML file</br>
input_fasta_file, input FASTA database file (BSA or HeLa)</br>
input_fasta_psq_file, input FASTA.PSQ database file (BSA or HeLa)</br>
output_featurexml_file, output featureXML filename and path</br>
output_qcml_file, output qcXML filename and path</br>
output_idxml_file, output idXML filename and path</br></br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/qcloud/nextflow/workflows/module_workflow_shotgun.knwf" -workflow.variable=input_mzml_file,/users/pr/nodes/outgoing/mzML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.mzML,String -workflow.variable=input_fasta_file,/users/pr/qcloud/nextflow/fasta/sp_bovine_2015_11_wo_contaminants_shuffled.fasta,String -workflow.variable=input_fasta_psq_file,/users/pr/qcloud/nextflow/blastdb/shotgun_bsa.fasta.psq,String -workflow.variable=output_featurexml_file,/users/pr/nodes/outgoing/featureXML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.featureXML,String -workflow.variable=output_qcml_file,/users/pr/nodes/outgoing/qcML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.qcml,String -workflow.variable=output_idxml_file,/users/pr/nodes/outgoing/idXML/1806/02656d22-b9d9-43e1-9375-f257b5f9717c_QC01_96410bfd152abfc6565266c837ce7887.idxml,String
```
Proteomics **SRM**: </br>

input_mzml_file, input mzML file</br>
input_traml, input mzML file</br>
output_featurexml_file, output featureXML filename and path</br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/qcloud/nextflow/workflows/module_workflow_srm.knwf" -workflow.variable=input_mzml_file,/users/pr/nodes/outgoing/mzML/1806/42839b81-9038-4b86-b1b6-c55d7cd9503c_QC01_f3672ebc3f88fbbf976ac4e52cd3f98f.mzML,String -workflow.variable=input_traml,users/pr/qcloud/nextflow/csv/qtrap_bsa.traml,String -workflow.variable=output_featurexml_file,/users/pr/nodes/outgoing/featureXML/1806/42839b81-9038-4b86-b1b6-c55d7cd9503c_QC01_f3672ebc3f88fbbf976ac4e52cd3f98f.featureXML,String
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

Store JSON file to QCloud database: </br>

Post file info: </br>

QC:0000005 means QC01</br>
02656d22-b9d9-43e1-9375-f257b5f9717c is labsys key

```
curl -i -H 'Authorization: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYW5pZWwubWFuY2VyYUBjcmcuZXUiLCJhdWRpZW5jZSI6IndlYiIsImNyZWF0ZWQiOjE1MzAyNTkzMjI0NDIsImV4cCI6MTUzMDg2NDEyMiwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlJPTEVfVVNFUiJ9LHsiYXV0aG9yaXR5IjoiUk9MRV9NQU5BR0VSIn0seyJhdXRob3JpdHkiOiJST0xFX0FETUlOIn1dfQ.F7lL8dYsGdCRW9H6MGkIjD7eiwOZAiX2MlZqzFFhAaKY3ZZWfaqvncXrhQ4F02sP27dQ1Fh2v80zVoXwMkNhPw' -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '{"creationDate": "2018-05-31 21:45:05","filename": "180531_Q_QC1F_01_02","checksum":"a593cea2cd0924f529e3b6d8bdf45664"}' 'http://192.168.101.37:8181/api/file/QC:0000005/02656d22-b9d9-43e1-9375-f257b5f9717c'
```
Post data to file: </br>

```
curl -i -H 'Authorization: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYW5pZWwubWFuY2VyYUBjcmcuZXUiLCJhdWRpZW5jZSI6IndlYiIsImNyZWF0ZWQiOjE1MzAyNTkzMjI0NDIsImV4cCI6MTUzMDg2NDEyMiwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlJPTEVfVVNFUiJ9LHsiYXV0aG9yaXR5IjoiUk9MRV9NQU5BR0VSIn0seyJhdXRob3JpdHkiOiJST0xFX0FETUlOIn1dfQ.F7lL8dYsGdCRW9H6MGkIjD7eiwOZAiX2MlZqzFFhAaKY3ZZWfaqvncXrhQ4F02sP27dQ1Fh2v80zVoXwMkNhPw' -H 'Accept: application/json' -H 'Content-Type:application/json' -X POST --data '$data_param' 'http://192.168.101.37:8181/api/data/pipeline'
```
Where $data_param= </br>

```
{
  "file" : {
    "checksum" : "a593cea2cd0924f529e3b6d8bdf45664"
  },
  "data" : [ {
    "parameter" : {
      "QCCV" : "QC:1001844"
    },
    "values" : [ {
      "sequence" : "EAC(Carbamidomethyl)FAVEGPK",
      "mass_acc" : 0.5983956158408309
    }, {
      "sequence" : "EC(Carbamidomethyl)C(Carbamidomethyl)HGDLLEC(Carbamidomethyl)ADDR",
      "mass_acc" : 0.32304470627096477
    }, {
      "sequence" : "EYEATLEEC(Carbamidomethyl)C(Carbamidomethyl)AK",
      "mass_acc" : 0.13539907509054283
    }, {
      "sequence" : "HLVDEPQNLIK",
      "mass_acc" : 0.714647658269317
    }, {
      "sequence" : "LVNELTEFAK",
      "mass_acc" : 0.777346695311011
    }, {
      "sequence" : "NEC(Carbamidomethyl)FLSHK",
      "mass_acc" : 0.7115451443202172
    }, {
      "sequence" : "SLHTLFGDELC(Carbamidomethyl)K",
      "mass_acc" : 0.01365762278395882
    }, {
      "sequence" : "TC(Carbamidomethyl)VADESHAGC(Carbamidomethyl)EK",
      "mass_acc" : 0.07932435272596104
    }, {
      "sequence" : "VPQVSTPTLVEVSR",
      "mass_acc" : 0.23677258801063458
    }, {
      "sequence" : "VPQVSTPTLVEVSR",
      "mass_acc" : 0.38794578499440446
    }, {
      "sequence" : "YIC(Carbamidomethyl)DNQDTISSK",
      "mass_acc" : 0.5377631215703618
    } ]
  } ]
}
```
