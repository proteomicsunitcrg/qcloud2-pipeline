Webserver scripts and configuration

This is going to be run in a XAMPP Windows server

Links and references

* XAMPP: https://www.apachefriends.org
* WebDAV, for data upload: http://sabre.io/
* Lumen, for basic REST API framework: https://lumen.laravel.com/

### Install dependencies

    composer install


* Configuration with Apache (for Windows): https://www.howtoforge.com/tutorial/install-laravel-on-ubuntu-for-apache/

### XAMPP Apache excerpt configuration

    DocumentRoot "C:/www/webserver/public"
    <Directory "C:/www/webserver/public">

        DirectoryIndex index.php

        Options Indexes FollowSymLinks Includes ExecCGI

        AllowOverride All

        Require all granted
    </Directory>

    # Adding webdav information

    DavLockDB "C:\xampp\apache\var\DavLockDB"

    Alias /input "C:\www\input"
    Alias /output "C:\www\output"
    Alias /error "C:\www\error"

    <Directory "C:\www\input">
        Dav On

        AuthType Basic
        AuthName WebDAV
        AuthUserFile	"C:\xampp\apache\conf\htpasswd\webdav"
        Require valid-user

        <LimitExcept GET PUT POST COPY MKCOL PROPFIND OPTIONS DELETE>
            Deny from all
        </LimitExcept>

    </Directory>

    <Directory "C:\www\output">
        Dav On

        AuthType Basic
        AuthName WebDAV
        AuthUserFile	"C:\xampp\apache\conf\htpasswd\webdav"
        Require valid-user

        <LimitExcept GET PROPFIND OPTIONS DELETE>
            Deny from all
        </LimitExcept>

    </Directory>

    <Directory "C:\www\error">

        AuthType Basic
        AuthName WebDAV
        AuthUserFile	"C:\xampp\apache\conf\htpasswd\webdav"
        Require valid-user

    </Directory>

### Steps

* Upload file to WebDav instance in a specific folder.
* If OK, make GET query passing as parameter input file path.
* If everything OK, webserver will generate file in another WebDAV folder.
* Return should be a JSON string with information where to retrieve output file.


        curl --user 'webdav:xxx' -T '/home/toniher/remote-work/bio/Qcloud/test_data2/180528_QC01.zip' 'http://192.168.101.125/input/180528_QC01.zip'
        curl -X GET http://192.168.101.125/index.php?input=180528_QC01.zip
        curl --user 'webdav:xxx' -X GET http://192.168.101.125/output/180528_QC01.mzML.zip > 180528_QC01.mzML.zip
        curl --user 'webdav:xxx' -X DELETE http://192.168.101.125/output/180528_QC01.mzML.zip
        curl --user 'webdav:xxx' -X DELETE http://192.168.101.125/input/180528_QC01.zip


#### JSON output

* Return must be 0

        {
          "input": "180528_QC01.raw",
          "opts": "--32 --mzML --zlib --filter \"peakPicking true 1-\"",
          "return": 0,
          "output": "180528_QC01.mzML"
        }

* Error returns:
    * 400 -> File not found
    * -1 -> No input parameter
    * 1 -> Error with program

#### Piping into workflow

curl -X GET http://192.168.101.125/index.php?input=180528_QC01.raw | jq '.return'

* Reference: https://medium.com/how-tos-for-coders/https-medium-com-how-tos-for-coders-parse-json-data-using-jq-and-curl-from-command-line-5aa8a05cd79b

