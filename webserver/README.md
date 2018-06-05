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

    DocumentRoot "C:/www"
    <Directory "C:/www">
        #
        # Possible values for the Options directive are "None", "All",
        # or any combination of:
        #   Indexes Includes FollowSymLinks SymLinksifOwnerMatch ExecCGI MultiViews
        #
        # Note that "MultiViews" must be named *explicitly* --- "Options All"
        # doesn't give it to you.
        #
        # The Options directive is both complicated and important.  Please see
        # http://httpd.apache.org/docs/2.4/mod/core.html#options
        # for more information.
        #
        Options Indexes FollowSymLinks Includes ExecCGI

        #
        # AllowOverride controls what directives may be placed in .htaccess files.
        # It can be "All", "None", or any combination of the keywords:
        #   AllowOverride FileInfo AuthConfig Limit
        #
        AllowOverride All

        #
        # Controls who can get stuff from this server.
        #
        Require all granted
    </Directory>

    # Adding webdav information

    DavLockDB "C:\xampp\apache\var\DavLockDB"

    Alias /input "C:\www\input"
    Alias /output "C:\www\output"

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

### Steps

* Upload file to WebDav instance in a specific folder.
* If OK, make GET query passing as parameter input file path.
* If everything OK, webserver will generate file in another WebDAV folder.
* Return should be a JSON string with information where to retrieve output file.


        curl --user 'webdav:xxx' -T '/home/toniher/remote-work/bio/Qcloud/test_data2/180528_QC01.raw' 'http://192.168.101.125/input/180528_QC01.raw'
        curl -X GET http://192.168.101.125/index.php?input=180528_QC01.raw
        curl --user 'webdav:xxx' -X GET http://192.168.101.125/output/180528_QC01.mzML > 180528_QC01.mzML
        curl --user 'webdav:xxx' -X DELETE http://192.168.101.125/output/180528_QC01.mzML
        curl --user 'webdav:xxx' -X DELETE http://192.168.101.125/input/180528_QC01.raw


#### JSON output

* Return must be 1

        {
          "input": "180528_QC01.raw",
          "return": 1,
          "output": "180528_QC01.mzML"
        }

#### Piping into workflow

curl -X GET http://192.168.101.125/index.php?input=180528_QC01.raw | jq '.return'

* Reference: https://medium.com/how-tos-for-coders/https-medium-com-how-tos-for-coders-parse-json-data-using-jq-and-curl-from-command-line-5aa8a05cd79b

