# QCloud local version


- Project name: Your project’s name is the first thing people will see upon scrolling down to your README, and is included upon creation of your README file.

- Description: A description of your project follows. A good description is clear, short, and to the point. Describe the importance of your project, and what it does.

- Table of Contents: Optionally, include a table of contents in order to allow other people to quickly navigate especially long or detailed READMEs.

- Installation: Installation is the next section in an effective README. Tell other users how to install your project locally. Optionally, include a gif to make the process even more clear for other people.

- Usage: The next section is usage, in which you instruct other people on how to use your project after they’ve installed it. This would also be a good place to include screenshots of your project in action.

- Contributing: Larger projects often have sections on contributing to their project, in which contribution instructions are outlined. Sometimes, this is a separate file. If you have specific contribution preferences, explain them so that other developers know how to best contribute to your work. To learn more about how to help others contribute, check out the guide for setting guidelines for repository contributors.

- Credits: Include a section for credits in order to highlight and link to the authors of your project.

- License: Finally, include a section for the license of your project. For more information on choosing a license, check out GitHub’s licensing guide!




[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Nextflow version](https://img.shields.io/badge/nextflow-%E2%89%A50.31.0-brightgreen.svg)](https://www.nextflow.io/)
[![Docker Build Status](https://img.shields.io/docker/automated/biocorecrg/qcloud.svg)](https://cloud.docker.com/u/biocorecrg/repository/docker/biocorecrg/qcloud/builds)

How to install QCloud server and pipeline intented for Bionformaticians: 

## Steps to install QCloud server: 
1. Install `mysql-server`
2. Create a user: 
```mysql 
CREATE USER 'qcloud_user'@'%' IDENTIFIED BY 'password_here';
GRANT ALL PRIVILEGES ON * . * TO 'qcloud_user'@'%';
FLUSH PRIVILEGES;
```
3. Download JAR file: https://www.dropbox.com/s/sf259uwyypjyzwb/QCloud2-1.0.19OUTSIDE.jar
4. Download and edit the sample.yml configuration file: https://www.dropbox.com/s/al25r8kojf7b10z/sample.yml
    4.1. Update with your database information and credentials:   
```yml
datasource:
    ## MYSQL
    url: jdbc:mysql://localhost:3306/database_name?useSSL=false
    username: "qcloud_user"
    password: "password_here"
    driver-class-name: com.mysql.jdbc.Driver
```
    4.2. Update with your preferred smtp server for email sending: 
```yml
  mail:
    default-encoding: UTF-8
    host: smtp_mail_host
    username: user_smtp
    password: password_smtp
```
    4.3. Update with your email:
```yml
  email:
    address: your@mail.com
```
Note: at this present version the port 8089 is not yet configurable so don't change it. 

5. Execute JAR file: 

```java
java -jar /path/to/QCloud2-1.0.19OUTSIDE.jar --spring.config.location=file:///path/to/sample.yml
``` 

6. Now [Flyway](https://flywaydb.org/) should automatically migrate and set up the database.
7. Once the server is up, open http://localhost:8089 in your browser and log in with zeus@admin.eu | dumbpass.
8. Create a new node, set up users and roles, and add at least one of your mass spectrometers.
7. Now you should install the QCloud pipeline. 


## Steps to install QCloud pipeline: 

* Install java.
* Install singularity-container.
* Install Nextflow.
* Git clone pipeline: free space 1 GB. 
* Configure Nextflow: params.config and nextflow.config.
* Run pipeline: nextflow run qcloud.nf -bg. This will pull all the Singularity images (around 2GB). Also chmod -R 770 and change max. mem.
* Put file in incoming folder with the correct notation (labsysid from QCloud server).
