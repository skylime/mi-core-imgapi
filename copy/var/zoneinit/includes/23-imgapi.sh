#!/usr/bin/env bash

# Create authentication defaults
IMGAPI_ADMIN=${IMGAPI_ADMIN:-$(mdata-get imgapi_admin 2>/dev/null)} || \
	IMGAPI_ADMIN=$(od -An -N8 -x /dev/random | head -1 | tr -d ' ');
mdata-put imgapi_admin "${IMGAPI_ADMIN}"
IMGAPI_ADMIN_HASH=$(/usr/lib/cryptpass "${IMGAPI_ADMIN}")

# Create new etc folder
mkdir -p /data/imgapi/etc

# Provide minimal config if it does not exists

cat > /data/imgapi/etc/imgapi.config.json <<EOF
{
    "serverName": "$(hostname)",
    "mode": "public",
    "channels": [
        {"name": "dev", "description": "all development builds", "default": true},
        {"name": "release", "description": "release gold bits"}
    ],
    "authType": "none"
}
EOF

# Create auth file for web server
echo "admin:${IMGAPI_ADMIN_HASH}" > /data/imgapi/etc/auth
if IMGAPI_USERS=$(mdata-get imgapi_users 1>/dev/null 2>&1); then
	echo "${IMGAPI_USERS}" >> /data/imgapi/etc/auth
fi

# Enable imgapi
svcadm enable svc:/smartdc/site/imgapi
