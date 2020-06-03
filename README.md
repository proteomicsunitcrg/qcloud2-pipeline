# QCloud Local Version (QLV)

QCloud is a cloud-based system to support proteomics laboratories in daily quality assessment using a user-friendly interface, easy setup, automated data processing and archiving, and unbiased instrument evaluation. https://qcloud.crg.eu, paper: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0189209

With this tutorial you'll we able to install all the QCloud system in your local server and HPC Cluster. It has two main parts: 

1) QCloud Website, as it is in https://qcloud.crg.eu but with administrative permissions and intsalled in your local server. 
2) QCloud Pipeline, to be run in your preferred HPC Cluster.  

## Global System Requirements: 
- QCloud Website: 
    - Desktop PC or VM with Linux/Windows x64 platform. 
    - Java >= 1.8.  
    - mysql-server >= 14.14.
    
- QCloud Pipeline: 
    - HPC Cluster running CentOS 7 x64. Do not install it in a desktop PC.
    - Grant access to QCloud Website URL and port from the cluster's queue. For instance, http://your_server_ip:8090 (see QCloud Website Installation section). This is mandatory as it's the pipeline's way to send processed data to the local database through an internal API.   
    - Singularity container >= 2.6.1.
    - Nextflow >= 20.01.0.5264.
    - At least 3GB free disk space.  

## QCloud Website Installation: 

1. Create a MySQL QCloud user, for instance: 
```mysql 
CREATE USER 'qcloud_user'@'%' IDENTIFIED BY 'password_here';
GRANT ALL PRIVILEGES ON * . * TO 'qcloud_user'@'%';
FLUSH PRIVILEGES;
```
3. Download JAR file: https://www.dropbox.com/s/sf259uwyypjyzwb/QCloud2-1.0.19OUTSIDE.jar
4. Download and edit sample.yml configuration file: https://www.dropbox.com/s/al25r8kojf7b10z/sample.yml
- 4.1. Update with your database information and credentials:   
```yml
datasource:
    ## MYSQL
    url: jdbc:mysql://localhost:3306/database_name?useSSL=false
    username: "qcloud_user"
    password: "password_here"
    driver-class-name: com.mysql.jdbc.Driver
```
- 4.2. Update with your preferred smtp server for email sending (optional): 
```yml
  mail:
    default-encoding: UTF-8
    host: smtp_mail_host
    username: user_smtp
    password: password_smtp
```
- 4.3. Update with your email:
```yml
  email:
    address: your@mail.com
```
Note: at this present version, port 8089 is not yet configurable so don't change it. 

5. Run JAR file: 

```java
java -jar /path/to/QCloud2-1.0.19OUTSIDE.jar --spring.config.location=file:///path/to/sample.yml
``` 

6. Now [Flyway](https://flywaydb.org/) should automatically create and set up the MySQL database.
7. Once the server is up, open http://localhost:8089 in your browser (Firefox or Google Chrome) and log in with zeus@admin.eu | dumbpassword. This password can be changed in the Profile management website section. 
8. Now you must create a new labsystem (LC + mass spec). For this, go to Management > Instruments > Lab systems and create a new System Name, add a Mass spectrometer and Liquid chromatographer. If you don't find you specific LC or MS model, you can add it clicking on Administration > Instruments > Manage controlled vocabulary. Just search by name and enable it. 
9. Once you added a new lab system, you'll be able to see its name at the top-right corner of the QCloud website. If you click it, you'll see in the browser something like: 

`http://localhost:8089/application/view/instrument/d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e`

For the moment, just copy this code "d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e" because we'll use it later at the pipeline installation section. 

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
    api_user         = "zeus@admin.eu"
    api_pass         = "dumbpassword"
}
```
Where: 
- zipfiles: incoming folder where the RAW files (zipped) will be put to be processed by the pipeline. 
- db_host: QCloud Server URL and port. See previous QCloud Server installation section.
- watch: "YES" if you want the pipeline to be automatically started when a file is moved to `zipfiles` folder. 
- api_user, api_password: credentals to grant access to the pipeline for accessing the QCloud Server database. The password must be the same as the one configured in the Profile management at the QCloud website. 

3. Set up nextflow.config file: modify this file according to your HPC Cluster queues name/s and the memory and CPUs available. 

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

## License: 

 Copyright © 2020 by Center for Genomic Regulation. All rights reserved. 

#### Last update by @rolivella on 03/06/2020
