Webserver scripts and configuration

This is going to be run in a XAMPP Windows server

Links and references

* XAMPP: https://www.apachefriends.org
* WebDAV, for data upload: http://sabre.io/
* Lumen, for basic REST API framework: https://lumen.laravel.com/

### Install dependencies

    composer install


* Configuration with Apache (for Windows): https://www.howtoforge.com/tutorial/install-laravel-on-ubuntu-for-apache/

### Steps

* Upload file to WebDav instance in a specific folder.
* If OK, make GET query passing as parameter input file path.
* If everything OK, webserver will generate file in another WebDAV folder.
* Return should be a JSON string with information where to retrieve output file.

curl -T '/path/to/local/myfile.txt' 'http://webdav/input/'
curl -X GET http://webdav/index.php?input=myfile.txt
curl -X GET http://webdav/output/myfile.txt

optional: curl -X DELETE http://webdav/output/myfile.txt

* Extras: minimal authorization to be added...

