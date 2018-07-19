#!/bin/bash

set -euo pipefail
## ADD example how to use it

alt=""
ext="zip"

while getopts "ac:i:l:p:q:r:" opt; do
  case $opt in
    a) alt="&alt"
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

curl -X GET http://${webdavip}/index.php?input=${labsys}_${qcode}_${checksum}.${ext}${alt}

curl --user "webdav:${webdavpass}" -X GET http://${webdavip}/output/${labsys}_${qcode}_${checksum}.mzML.${ext} > ${labsys}_${qcode}_${checksum}.mzML.${ext}

curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/output/${labsys}_${qcode}_${checksum}.mzML.${ext}

curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}    
