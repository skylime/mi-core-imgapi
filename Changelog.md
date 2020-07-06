# Changelog

## 20.1.0

### New

* Upgrade to 2020Q1 of core-base including imgapi upgrade to the latest version

  Remove unused python and nodejs dependency, because notejs is build-in of the
  imgapi. Also fix upload permissions for users to the API. Include the default
  location of the delegate dataset used by the API.

## 16.4.0

### New

* Update to 16.4.x and support Let&#x27;s Encrypt. [Thomas Merkel]
* Update to HTTPs. [Thomas Merkel]
* Update license file to 2017. [Thomas Merkel]
* Remove UI from the repo and download it during build. [Thomas Merkel]
* Switch to new imgapi version and multiarch release. [Thomas Merkel]

  Install the new Joyent IMGAPI based on the last git release. No release build tag was created by Joyent, so create our own release which are downloadable from our server.

* Update to new imgapi version for development. [Thomas Merkel]

### Fix

* Add nodejs and py27-bcrypt as requirements. [Thomas Merkel]
* Fix path for imgapi.config.json file, new location is /data/imgapi/etc - which is a symlink now. [Thomas Merkel]
* New version requires authType none by default for the standalone edition to support basic auth. [Thomas Merkel]
* Remove &quot;m&quot; (MB) from proxy_max_temp_file_size because its no longer supported. [Thomas Merkel]
* Switch bcrypt-hash script from nodejs to python because of missing requirements. [Thomas Merkel]
