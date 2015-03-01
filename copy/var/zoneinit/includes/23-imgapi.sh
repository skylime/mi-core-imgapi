# Modify config file with hostname
host=$(hostname)
sed "s:@SERVER_NAME@:${host}:g" /opt/imgapi/etc/imgapi.config.tpl > \
	/opt/imgapi/etc/imgapi.config.json

# Enable imgapi
svcadm enable svc:/smartdc/site/imgapi
