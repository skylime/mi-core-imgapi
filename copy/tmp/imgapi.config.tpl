{
    "serverName": "@SERVER_NAME@",
    "mode": "public",
    "channels": [
        {"name": "dev", "description": "all development builds", "default": true},
        {"name": "release", "description": "release gold bits"}
    ],
    "storage": {
        "local": {
            "baseDir": "/var/db/imgapi"
        }
    },
    "database": {
        "type": "local",
        "dir": "/var/db/imgapi/manifests"
    },
    "auth": {
        "type": "basic",
        "users": {
           @AUTH_USERS@
        }
    }
}
