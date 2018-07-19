#!/bin/bash

set -euo pipefail
## ADD example how to use it

alt=""
ext="raw"

while getopts "ac:i:l:p:q:r:" opt; do
  case $opt in
    a) alt="&alt"; ext="wiff"
    ;;
    c) checksum="$OPTARG"
    ;;
    i) webdavip="$OPTARG"
    ;;
    l) labsys="$OPTARG"
    ;;
    p) webdavpass="$OPTARG"
    ;;
    q) qcode="$OPTARG"
    ;;
    r) rawfile="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    ;;
  esac
done


curl --user "webdav:${webdavpass}" -T "${rawfile}" "http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}"

if [ "${ext}" == "wiff" ]; then
	curl --user "webdav:${webdavpass}" -T "${rawfile}.scan" "http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}.scan"
fi

curl -X GET http://${webdavip}/index.php?input=${labsys}_${qcode}_${checksum}.${ext}${alt}

curl --user "webdav:${webdavpass}" -X GET http://${webdavip}/output/${labsys}_${qcode}_${checksum}.mzML > ${labsys}_${qcode}_${checksum}.mzML

curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/output/${labsys}_${qcode}_${checksum}.mzML

curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}    
