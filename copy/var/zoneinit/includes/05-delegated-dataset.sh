#!/bin/bash
UUID=$(mdata-get sdc:uuid)
DDS=zones/${UUID}/data

if zfs list ${DDS} 1>/dev/null 2>&1; then
	zfs create ${DDS}/imgapi || true

	zfs set mountpoint=/var/db/imgapi ${DDS}/imgapi
fi
