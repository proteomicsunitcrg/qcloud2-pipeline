# QCloud Local Version (QLV)

QCloud is a cloud-based system to support proteomics laboratories in daily quality assessment using a user-friendly interface, easy setup, automated data processing and archiving, and unbiased instrument evaluation. https://qcloud.crg.eu, papers: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0189209 and https://pubs.acs.org/doi/10.1021/acs.jproteome.0c00853#.YFYwlf2PpyE.

With this tutorial you'll we able to install all the QCloud system in your local server and HPC Cluster. It has two main parts: 

1) QCloud Website, as it is in https://qcloud.crg.eu but with administrative permissions and installed in your local server. 
2) QCloud Pipeline, to be run in your preferred HPC Cluster or high performance PC.  

## Global System Requirements: 
- QCloud Website: 
    - Desktop PC or VM with Linux/Windows x64 platform. 
    - Java >= 1.8.  
    - mysql-server >= 14.14.
    
- QCloud Pipeline: 
    - HPC Cluster running CentOS 7 x64 or a high performance PC. 
    - If you install the pipeline in a cluster, you should grant access to QCloud Website URL and port from the cluster's queue. For instance, http://your_server_ip:8090 (see QCloud Website Installation section). This is mandatory as it's the pipeline's way to send processed data to the local database through an internal API.   
    - Singularity container >= 2.6.1.
    - Nextflow >= 20.01.0.5264.
    - At least 3GB free disk space.  

## QCloud Website Installation: 

1. Create a MySQL QCloud user, for instance: 
```mysql 
CREATE USER 'qcloud_user'@'%' IDENTIFIED BY 'password_here';
CREATE database database_name;
GRANT ALL PRIVILEGES ON database_name.* TO 'qcloud_user'@'%';
FLUSH PRIVILEGES;
```
2. Download JAR file: https://www.dropbox.com/s/7y88l6ox7on31ln/QCloud2-1.0.23LOCAL.jar?dl=0 
3. Download and edit external_config.yml configuration file: https://www.dropbox.com/s/uj9e51yfo3spvxy/external_config.yml?dl=0
- 3.1. Update with your database information and credentials:   
```yml
datasource:
    ## MYSQL
    url: jdbc:mysql://localhost:3306/database_name?useSSL=false
    username: "qcloud_user"
    password: "password_here"
    driver-class-name: com.mysql.jdbc.Driver
```
- 3.2. Update with your preferred smtp server for email sending (optional): 
```yml
  mail:
    default-encoding: UTF-8
    host: smtp_mail_host
    username: user_smtp
    password: password_smtp
```
- 3.3. Update with your email:
```yml
  email:
    address: your@mail.com
```
- 3.4. And update the admin email: 
```yml
qcloud:
  admin-email: admin.mail@mail.com
```
If first sign email is the same as the admin-mail then the user will be administrator. Also the backend sends an email to the admin-mail when a new lab and user is added to the QCloud.

4. Run JAR file: 

```java
java -jar /path/to/QCloud2-1.0.23LOCAL --spring.config.location=file:///path/to/external_config.yml
``` 

5. Now [Flyway](https://flywaydb.org/) should automatically create and set up the MySQL database.
6. Once the server is up, open http://localhost:8089 in your browser (Firefox or Google Chrome) and log in with the email you put in the YML file under the field `admin-email`. Currently the 8089 cannot be changed. But if you're experencing some issue with the localhost, we can change it to your particular server address. To do that please open a new issue in this current repository. 
9. Now you must create a new labsystem (LC + mass spec). For this, go to Management > Instruments > Lab systems and create a new System Name, add a Mass spectrometer and Liquid chromatographer. If you don't find you specific LC or MS model, you can add it clicking on Administration > Instruments > Manage controlled vocabulary. Just search by name and enable it. 
10. Once you added a new lab system, you'll be able to see its name at the top-right corner of the QCloud website. If you click it, you'll see in the browser something like: 

`http://localhost:8089/application/view/instrument/d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e`

For the moment, just copy this code "d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e" because we'll use it later at the pipeline installation section. 

Now you should configure **as an adminsitrator** how the QCloud2 is going to be according to your needs. In parallel you can start installing the QCloud2 pipeline (next section).  

First of all: 

- At Data processing > Sample type categories, add the main sample type categories, for instance QC01 and QC02.  

| Name |  Complexity | 
| --------------- | --------------- |  
|QC01 |	LOW |
|QC02	| HIGH |

- At Data processing > Sample types, you'll have to tell to the QCloud2 that QC01 is for BSA, and QC02 is for HeLa, following this convention: https://github.com/proteomicsunitcrg/cv/blob/master/qc-cv.obo.
- At Data processing > Context sources and PEPTIDES tab, add all the peptides that you want to monitor per each sample type. 

For QC01 (BSA):

| Peptide name | Sequence | Abbreviated sequence | Charge | mz | 
| --------------- | --------------- | --------------- |  --------------- |  --------------- |
| EAC(Carbamidomethyl)FAVEGPK | EAC(Carbamidomethyl)FAVEGPK | EAC | 2 | 554,261 |
| EC(Carbamidomethyl)C(Carbamidomethyl)HGDLLEC(Carbamidomethyl)ADDR | EC(Carbamidomethyl)C(Carbamidomethyl)HGDLLEC(Carbamidomethyl)ADDR | ECC | 3 | 583,892 | 
| EYEATLEEC(Carbamidomethyl)C(Carbamidomethyl)AK | EYEATLEEC(Carbamidomethyl)C(Carbamidomethyl)AK | EYE | 2 | 751,811 | 
| HLVDEPQNLIK | HLVDEPQNLIK | HLV | 2 | 653,362 | 
| LVNELTEFAK | LVNELTEFAK | LVN | 2 | 582,319 | 
| NEC(Carbamidomethyl)FLSHK | NEC(Carbamidomethyl)FLSHK | NEC |  2 | 517,74 | 
| SLHTLFGDELC(Carbamidomethyl)K | SLHTLFGDELC(Carbamidomethyl)K | SLH | 2 | 710,35 | 
| TC(Carbamidomethyl)VADESHAGC(Carbamidomethyl)EK | TC(Carbamidomethyl)VADESHAGC(Carbamidomethyl)EK | TCV | 3 | 488,534| 
| VPQVSTPTLVEVSR | VPQVSTPTLVEVSR | VPQ | 2 | 756,425 | 
| YIC(Carbamidomethyl)DNQDTISSK | YIC(Carbamidomethyl)DNQDTISSK | YIC | 2 | 756,425 |

For QC02 (HeLa):

| Peptide name | Sequence | Abbreviated sequence | Charge | mz | 
| --------------- | --------------- | --------------- |  --------------- |  --------------- |
| DDVAQTDLLQIDPNFGSK | DDVAQTDLLQIDPNFGSK | DDV | 2 | 988,484 | 
| EAALSTALSEK | EAALSTALSEK | EAA | 2 | 560,298 | 
| EATTEFSVDAR | EATTEFSVDAR | EAT | 2 | 613,288 | 
| EQFLDGDGWTSR | EQFLDGDGWTSR | EQF | 2 | 705,818 | 
| EVSTYIK | EVSTYIK | EVS | 2 | 420,229 | 
| FAFQAEVNR | FAFQAEVNR | FAF | 2 | 541,275 | 
| FEELNMDLFR | FEELNMDLFR | FEE | 2 | 657,313 | 
| LAVDEEENADNNTK | LAVDEEENADNNTK | LAV | 2 | 781,352 | 
| LGDLYEEEMR | LGDLYEEEMR | LGD | 2 | 627,787 | 
| NPDDITNEEYGEFYK | NPDDITNEEYGEFYK | NPD | 2 | 917,394 | 
| RFPGYDSESK | RFPGYDSESK | RFP | 2 | 593,28 |
| SLADELALVDVLEDK | SLADELALVDVLEDK | SLA | 2 | 815,433 1 
| STLTDSLVC(Carbamidomethyl)K | STLTDSLVC(Carbamidomethyl)K | STL | 2 | 562,287 | 
| TPAQFDADELR | TPAQFDADELR | TPA | 2 | 631,804 | 
| YAEAVTR | YAEAVTR | YAE | 2 | 405,211 | 

- At Data processing > Context sources and INSTRUMENT SAMPLE tab, add all the QC paramters you want to monitor. 

| Name | Abbreviated name | CV | 
| --------------- | --------------- | --------------- |  
| Median IT MS1| 	MS1 | 		QC:1000927	| 
| Median IT MS2	| MS2	| 	QC:1000928	| 
| Total number of uniquely identified proteins| 	# proteins	| 	QC:0000032	| 
| Total number of uniquely identified peptides| 	# peptides	| 	QC:0000031	| 
| MS2 Spectral count| 	MS2 spectral count	| 	QC:0000007	| 
| Total number of PSM	| # psm		| QC:0000029| 	
| Retention Time| 	Retention Time	| 	QC:1000894	| 
| Sum TIC	| Sum TIC| 		QC:0000048| 

- At Data processing > Parameters management, add all the parameters that you'll monitorize. For instance, mass accuracy, following this convention: https://github.com/proteomicsunitcrg/cv/blob/master/qc-cv.obo. "Is for" means if it's for a "sample-related parameter level" (like the Total Ion Current, for instance) or "peptide-related parmeter level" like the mass accuracy for a certain peptide. "Data processor" is a post-processing calculation after the data is inserted into the database by the pipeline. Choose "RETENTION-TIME" for computing the RT Drift, "LOG2" for peptide areas and NO_PROCESSOR for the rest. 

| Name |  CV | 
| --------------- | --------------- |  
| Peak area|	QC:1001844	|
|Mass accuracy|	QC:1000014	|
|Median IT	|QC:9000002	|
|Total numbers|	QC:9000001	|
|Retention time|	QC:1000894	|
|Total Ion Current|	QC:9000005|

And then: 

- At Instruments > Manage categories, add a Mass spectrometer (master category) and a Liquid chromatographer. 
- At Instruments > Controlled vocabulary management, add all the mass spectrometers and liquid cromatographs following this conventions: for MS https://github.com/HUPO-PSI/psi-ms-CV/blob/master/psi-ms.obo and for LC https://github.com/proteomicsunitcrg/cv/blob/master/lc-cv.obo. 
- At Instruments > Manage instrument charts and CHART tab, add all the charts you want to be shown for each instrument and sample type. 
- At Instruments > Manage default views, create all the default views for each sample type. These are the charts that are going to be available at each QC01, QC02 tab. 

## QCloud Pipeline Installation: 

Must be installed AFTER QCloud Website. 

1. `git clone https://github.com/proteomicsunitcrg/qcloud2-pipeline.git`, checkout "local" branch and `chmod -R 770` at the pipeline root folder. 
2. Set up Nextflow params.config file: 
```
params {
    qconfig          = "$baseDir/qcloud.config"
    zipfiles         = "/path/to/pipeline/incoming/*.zip"
    fasta_tab        = "$baseDir/fasta.tsv"
    db_host          = "localhost:8089"
    watch            = "YES"
    api_user         = "admin.mail@mail.com"
    api_pass         = "dumbpassword"
}
```
Where: 
- zipfiles: incoming folder where the RAW files (zipped) will be put to be processed by the pipeline. 
- db_host: QCloud Server URL and port. See previous QCloud Server installation section.
- watch: "YES" if you want the pipeline to be automatically started when a file is moved to `zipfiles` folder. 
- api_user, api_password: credentals to grant access to the pipeline for accessing the QCloud Server database. The password must be the same as the one configured in the Profile management at the QCloud website. 

3. Set up nextflow.config file: modify this file according to your HPC Cluster queues name/s and CPUs available. Regarding the memory, leave them as it is in the nextflow.config, i.e. a minimum of 10GB for all the processes except the big_mem with 30 GB.   

## QCloud Pipeline Usage: 

- Run the pipeline in background mode: `nextflow run -bg qcloud.nf > qcloud.log`. The first time you run this command Nextflow will automatically pull the last QCloud container version labeled as `biocorecrg/qcloud:2.1` (1.5GB aprox.) and the ThermoRawFileParser container `biocorecrg-thermorawparser-0.2.img` (0.5GB) that converts RAW files to mzML format.
- Once the pipeline is started and the QCloud container pulled, you can copy any RAW file coming from any supported mass spectrometer (see Administration > Instruments > Manage controlled vocabulary section in the QCloud local website installed in the previous section). 
- All RAW files must be in a specific format to be successfully processed by the QCloud Pipeline: 
    - All files must be zipped with the same name as the RAW file. 
    - Its name must follow the following convention: `filename_labsysid_QC0X_checksum.zip`, where: 
        - filename: any filename without blanks, for instance "20200514_LUMOS1".
        - labsysid: is the internal code of the labsystem where the RAW file is coming from (see QCloud Server installation section). 
        - QC0X: either if it's QC01 (BSA) or QC02 (HeLa). 
        - checksum: the md5sum of the RAW file (not the zipped one). 
        - For instance: `20200514_LUMOS1_d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e_QC01_c010cb81200806e9113919213772aaa9.zip`

## Global Final steps: 

- To check if the entire QLV is working fine, you should see after some minutes at the QCloud website homepage a list of all the zipped RAW files you moved at the incoming folder of the pipeline.
- Now you should add the charts you want to be shown for your lab systems. To this, visit the Manage instrument charts > Charts management at the QCloud local website. 
- Troubleshooting: check JAR and Nexftlow logs. We're working to extend this section.  
- Now there's a lot of website configuration that you can learn from our videotutorials: 
    - Getting started as a user: https://www.dropbox.com/s/e2mil82vuccvcox/getting-started-as-user.mp4
    - Getting started as a lab manager: https://www.dropbox.com/s/5xani1zi7guqez7/getting-started-as-a-lab-manager.mp4
    - Thresholds and guidesets: https://www.dropbox.com/s/tqn83u22m7fs1tw/threholds-and-guidesets.mp4

## Credits (specifically for the bioinformatics part of QCloud): 
- QCloud Website: Marc Serret, Dani Mancera and Roger Olivella. 
- QCloud Pipeline: Luca Cozzuto and Roger Olivella. 
- ThermoFileRawParser: Niels Hulstaert (https://github.com/compomics/ThermoRawFileParser#thermorawfileparser). 
- rawDiag: Christian Panse (https://github.com/fgcz/rawDiag). 

## Credits (for the entire QCloud project): 

Cristina Chiva, Eva Borràs, Guadalupe Espadas, Olga Pastor, Amanda Solé, Eduard Sabidó.
