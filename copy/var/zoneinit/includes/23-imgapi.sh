# Create authentication defaults
IMGAPI_ADMIN=${IMGAPI_ADMIN:-$(mdata-get imgapi_admin 2>/dev/null)} || \
	IMGAPI_ADMIN=$(od -An -N8 -x /dev/random | head -1 | tr -d ' ');
mdata-put imgapi_admin ${IMGAPI_ADMIN}

# Create authentication for users based on mdata
if mdata-get imgapi_users 1>/dev/null 2>&1; then
	for list in $(mdata-get imgapi_users); do
		u=$(echo ${line} | awk -F \: '{ print $1 }')
		p=$(echo ${line} | awk -F \: '{ print $2 }')

		USERS="\"${u}\": \"${p}\",\n${USERS}"
	done
fi

USERS="${USERS}\n\"admin\": \"${IMGAPI_ADMIN}\""

# Modify config file with hostname and users
host=$(hostname)
sed -e "s:@SERVER_NAME@:${host}:g" \
	-e "s:@AUTH_USERS@:${USERS}:g" \
	/opt/imgapi/etc/imgapi.config.tpl > \
	/opt/imgapi/etc/imgapi.config.json

# Enable imgapi
svcadm enable svc:/smartdc/site/imgapi
