(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
'use strict';

angular.module('dsapi', [ 'ngRoute', 'dsapi.services', 'dsapi.directives', 'dsapi.bootstrap', 'dsapi.filters' ])
  .config(['$locationProvider', '$routeProvider', function($location, $routeProvider) {
    $location.hashPrefix('!');

    $routeProvider.when('/home', { templateUrl: 'views/home.html', controller: HomeCtrl });
    $routeProvider.when('/configure/search/:query', { templateUrl: 'views/configure.html', controller: HomeCtrl });
    $routeProvider.when('/configure', { templateUrl: 'views/configure.html', controller: HomeCtrl });
    $routeProvider.when('/configure/:uuid', { templateUrl: 'views/builder/index.html', controller: BuilderCtrl });
    $routeProvider.when('/about', { templateUrl: 'views/about.html', controller: HomeCtrl });

    $routeProvider.otherwise({redirectTo: '/home'});
  }]);

'use strict';

function HomeCtrl($scope, $routeParams, $location, dsapiDatasets) {
  $scope.datasets = null;
  $scope.latest = null;

  if ($routeParams.query) {
    $scope.query = $routeParams.query;
  }

  dsapiDatasets.then(function(instance) {
    $scope.datasets = instance.all();
    $scope.latest = instance.latest();
  });

  $scope.editManifest = function(uuid) {
    $location.path('/configure/' + uuid);
  };
}

HomeCtrl.$inject = [ '$scope', '$routeParams', '$location', 'dsapiDatasets' ];

function BuilderCtrl($scope, $routeParams, dsapiDatasets) {
  $scope.dataset = null;
  $scope.form = { // all form field will flow in here
    'settings': {},
    'nics': [],
    'disks': [],
    'filesystems': [],
    'metadata': [],
    '_selected_metadata': null
  };
  $scope.temp; // temporary data flows in here

  function clearObject(object) {
    for (prop in object) {
      if (object.hasOwnProperty(prop)) {
        delete object[prop];
      }
    }

    return object;
  }

  function loadBuilderDefaults(options) {
    for (k in options) {
      $scope.form.settings[k] = options[k];
    }
  }

  $scope.addNic = function() {
    clearObject($scope.temp);

    $scope.temp = {
      nic_tag: 'admin'
    };

    if ($scope.isKVM()) {
      $scope.temp.model = ($scope.dataset.nic_driver ? $scope.dataset.nic_driver : $scope.valid_nic_models[0]);
    }
  }

  $scope.editNic = function(data) {
    var nic = {};

    angular.copy(data, nic);
    nic._target = data;

    $scope.temp = nic;
  };

  $scope.saveNic = function(data) {
    var nic = {};

    angular.copy(data, nic);

    if (nic.primary === true) {
      var i, len;

      for (i = 0, len = $scope.form.nics.length; i < len; i++) {
        $scope.form.nics[i].primary = false;
      }
    }

    if (Object.keys(nic).length > 0 && nic.nic_tag && nic.ip) {
      if (data._target) {
        delete nic._target;

        angular.copy(nic, data._target);
      } else {
        $scope.form.nics.push(nic);
      }
    }

    clearObject($scope.temp);
  };

  $scope.removeNic = function(data) {
    var index = $scope.form.nics.indexOf(data);

    if (index >= 0) {
      $scope.form.nics.splice(index, 1);
    }
  };

  $scope.addFilesystem = function() {
    clearObject($scope.temp);

    $scope.temp = {
      type: $scope.valid_filesystem_types[0]
    };
  };

  $scope.editFilesystem = function(data) {
    var fs = {};

    angular.copy(data, fs);
    fs._target = data;

    $scope.temp = fs;
  };

  $scope.saveFilesystem = function(data) {
    var fs = {};

    angular.copy(data, fs);

    if (Object.keys(fs).length > 0 && fs.type && fs.source && fs.target) {
      if (data._target) {
        delete fs._target;

        angular.copy(fs, data._target);
      } else {
        $scope.form.filesystems.push(fs);
      }
    }

    clearObject($scope.temp);
  }

  $scope.removeFilesystem = function(data) {
    var index = $scope.form.filesystems.indexOf(data);

    if (index >= 0) {
      $scope.form.filesystems.splice(index, 1);
    }
  };

  $scope.addDisk = function() {
    clearObject($scope.temp);

    $scope.temp = {
      model: ($scope.dataset.disk_driver ? $scope.dataset.disk_driver : $scope.valid_disk_models[0]),
      compression: $scope.valid_disk_compressions[0].type
    };
  };

  $scope.editDisk = function(data) {
    var disk = {};

    angular.copy(data, disk);
    disk._target = data;

    $scope.temp = disk;
  };

  $scope.saveDisk = function(data) {
    var disk = {};

    angular.copy(data, disk);

    if (Object.keys(disk).length > 0 && disk.model && disk.size) {
      if (data._target) {
        delete disk._target;

        angular.copy(disk, data._target);
      } else {
        $scope.form.disks.push(disk);
      }
    }

    clearObject($scope.temp);
  }

  $scope.removeDisk = function(data) {
    var index = $scope.form.disks.indexOf(data);

    if (index >= 0) {
      $scope.form.disks.splice(index, 1);
    }
  };

  $scope.addMetadata = function(data) {
    var md = {};

    clearObject($scope.temp);

    if (!data) {
      data = {
        name: '',
        type: 'custom',
        value: '',
        description: 'custom key'
      };
    } else {
      if (data.type === 'password') {
        data.initWithRandom(24);
      }
    }

    angular.copy(data, md);

    $scope.temp = md;
  };

  $scope.editMetadata = function(data) {
    var md = {};

    angular.copy(data, md);
    md._target = data;

    $scope.temp = md;
  };

  $scope.saveMetadata = function(data) {
    var metadata = {};

    angular.copy(data, metadata);

    if (Object.keys(metadata).length > 0 && metadata.name && metadata.value) {
      if (metadata.type === 'custom') {
        metadata.title = metadata.name;
      }

      if (data._target) {
        delete metadata._target;

        angular.copy(metadata, data._target);
      } else {
        $scope.form.metadata.push(metadata);
      }
    }

    clearObject($scope.temp);
    $scope.form._selected_metadata = null;
  }

  $scope.removeMetadata = function(data) {
    var index = $scope.form.metadata.indexOf(data);

    if (index >= 0) {
      $scope.form.metadata.splice(index, 1);
    }
  };

  $scope.json = {};
  $scope.json_pretty = '';

  $scope.generateJson = function() {
    var generator = $scope.dataset.getGenerator();

    generator.setOptions($scope.form.settings);

    generator.setNics($scope.form.nics);
    generator.setFilesystems($scope.form.filesystems);
    generator.setDisks($scope.form.disks);
    generator.setMetadata($scope.form.metadata);

    $scope.json = generator.generate();

    $scope.changeOutput('json');
  };

  $scope.changeOutput = function(type) {
    if (type === 'shell') {
      $scope.json_pretty = [
        'vmadm create << EOF',
        JSON.stringify($scope.json, null, 2),
        'EOF'
      ].join("\n");
    } else {
      $scope.json_pretty = [
        JSON.stringify($scope.json, null, 2)
      ].join("\n");
    }
  }

  $scope.isJoyent = function() {
    return $scope.dataset &&
      ($scope.dataset.getBrand() === 'joyent' ||
        $scope.dataset.getBrand() === 'joyent-minimal');
  };

  $scope.isKVM = function() {
    return $scope.dataset && $scope.dataset.getBrand() === 'kvm';
  };

  $scope.isLX = function() {
    return $scope.dataset && $scope.dataset.getBrand() === 'lx';
  };

  dsapiDatasets.then(function(instance) {
    $scope.dataset = instance.by_uuid($routeParams.uuid);

    if ($scope.dataset.manifest.builder_info) {
      loadBuilderDefaults($scope.dataset.manifest.builder_info);
    }
  });

  $scope.valid_filesystem_types = ['lofs'];
  $scope.valid_disk_models = ['virtio', 'ide', 'scsi'];
  $scope.valid_disk_compressions = [
    { type: 'off' },
    { type: 'on' },
    { type: 'lzjb' },
    { type: 'gzip' },
    { type: 'zle' },
    { type: 'gzip-1', group: 'gzip' },
    { type: 'gzip-2', group: 'gzip' },
    { type: 'gzip-3', group: 'gzip' },
    { type: 'gzip-4', group: 'gzip' },
    { type: 'gzip-5', group: 'gzip' },
    { type: 'gzip-6', group: 'gzip' },
    { type: 'gzip-7', group: 'gzip' },
    { type: 'gzip-8', group: 'gzip' },
    { type: 'gzip-9', group: 'gzip' }
  ];
  $scope.valid_nic_models = ['virtio', 'e1000', 'rtl8139'];
  $scope.valid_cpu_types = ['qemu64', 'host'];
}

BuilderCtrl.$inject = [ '$scope', '$routeParams', 'dsapiDatasets' ];

'use strict';

angular.module('dsapi.directives', [])
  .directive('dateFromNow', function() {
    return function(scope, element, attrs) {
      scope.$watch(attrs.dateFromNow, function(value) {
        if (value && value > 0) {
          element.text(moment(value).fromNow());
        }
      });
    }
  });

/**
 * bootstrap directives
 */
angular.module('dsapi.bootstrap', [])
  .directive('navBarTop', function() {
    return {
      restrict: 'EC',
      transclude: true,
      scope: {
        'title': '@'
      },
      template:
        '<div class="navbar navbar-fixed-top">' +
          '<div class="navbar-inner">' +
            '<div class="container">' +
              '<a class="brand" href="#!/">{{title}}</a>' +
              '<ul class="nav" ng-transclude></ul>' +
            '</div>' +
          '</div>' +
        '</div>',
      replace: true
    };
  })

  .directive('navBarPills', function() {
    return {
      restrict: 'EC',
      transclude: true,
      template:
        '<ul class="nav nav-pills pull-right" ng-transclude>' +
        '</ul>',
      replace: true
    };
  })

  .directive('navLocation', ['$location', function($location) {
    var match = function(href, url) {
      var _slash = href.indexOf('/');

      if (_slash > 0) {
        href = href.substring(_slash, href.length - _slash + 1);
      }

      var href_a = href.split('/');
      var url_a = url.split('/');
      var i;

      for (i in href_a) {
        if (href_a[i] !== url_a[i]) {
          return false;
        }
      }

      return true;
    }

    return {
      restrict: 'EC',
      transclude: true,
      scope: {
        'href': '@'
      },
      link: function (scope) {
        scope.location = function (href) {
          return match(href.substr(1), $location.url());
        };
      },
      template:
        '<li ng-class="{active: location(href)}">' +
          '<a href="{{href}}" ng-transclude></a>' +
        '</li>',
      replace: true
    };
  }]);

'use strict';

angular.module('dsapi.filters', [])
  .filter('shorten', function() {
    return function(text, max_length) {
      max_length = max_length || 0xffffffff;

      if (text.length > max_length) {
        text = text.substring(0, max_length) + '...';
      }

      return text;
    };
  })
  .filter('searchDatasets', function() {
    var searchableKeys = [
      'name',
      'version',
      'os',
      'description'
    ];

    var filterableKeys = [
      'uuid',
      'name',
      'version',
      'os'
    ];

    var matchManifest = function(manifest, query) {
      if (!query) {
        return true;
      }

      var k, i, parts, len, kv;

      parts = query.toLowerCase().split(/\s+/);

      for (i = 0, len = parts.length; i < len; i++) {
        var match = false;

        kv = parts[i].match(/^(\w+):(.+)$/);

        if (kv && filterableKeys.indexOf(kv[1]) >= 0) {
          if (manifest[kv[1]].toLowerCase().indexOf(kv[2].toLowerCase()) === 0) {
            match = true;
          }
        } else {
          for (k in searchableKeys) {
            if (manifest[searchableKeys[k]].toLowerCase().search(parts[i]) >= 0) {
              match = true;
            }
          }
        }

        if (!match) {
          return false;
        }
      }

      return true;
    }

    return function(datasets, query) {
      var i;
      var matched = [];

      if (!query) {
        return datasets;
      }

      for (i in datasets) {
        if (matchManifest(datasets[i], query)) {
          matched.push(datasets[i]);
        }
      }

      return matched;
    }
  });

'use strict';

function MetadataOption(options) {
  this.group = options.group || '';

  this.name = options.name || '';
  this.title = options.title || this.name;
  this.description = options.description || '';

  this.type = options.type || 'text';

  this.value = options.value || '';

  this.initWithRandom = function(length) {
    length = length || 8;

    function randomString(length) {
      var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
      var result = '';

      while (result.length < length) {
        result += chars.substr(Math.floor(Math.random() * chars.length), 1);
      }

      return result;
    }

    this.value = randomString(length);
  };
}

function Dataset(data) {
  this.manifest = data;
  this.metadata = [];

  var _generator = null;

  this.getGenerator = function() {
    if (_generator === null) {
      _generator = new DatasetJsonGenerator(this);
    }

    return _generator;
  };

  this.getCreator = function() {
    if (data.provider) {
      return data.provider;
    }

    switch(data.creator_name) {
      case 'sdc':
      case 'jpc':
        return 'joyent';
      default:
        return 'community';
    }
  };

  this.getBrand = function() {
    if (data.type === 'lx-dataset') {
      return 'lx';
    }

    if (data.os !== 'smartos') {
      return 'kvm';
    }

    return 'joyent';
  };

  this.getDownloadSize = function() {
    var niceBytes = function (bytes) {
      if (bytes == 0) return 'n/a';
      var sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'],
      i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) + sizes[i];
    };

    var download_size = 0;

    for (var i = 0; i < data.files.length; i++) {
      download_size += data.files[i].size;
    }

    return niceBytes(download_size);
  };

  var i, proxy_attrs = [
    'name',
    'version',
    'os',
    'description',
    'homepage',
    'uuid',
    'published_at',
    'stats_info'
  ];

  for (i in proxy_attrs) {
    this[proxy_attrs[i]] = this.manifest[proxy_attrs[i]];
  }

  /* parse date data */
  this.published_at = Date.parse(this.published_at);

  /* determine usable metadata and populate metadata list */
  this.metadata.push(new MetadataOption({
    'name': 'user-script',
    'title': 'User-Script',
    'description': 'bash script to be run at first boot used to provision even more stuff automatically',
    'type': 'text'
  }));

  this.metadata.push(new MetadataOption({
    'name': 'user-data',
    'title': 'User-Data',
    'description': 'data that can be used by the user-script',
    'type': 'text'
  }));

  if (this.getBrand() === 'kvm') {
    if (this.manifest.hasOwnProperty('requirements') && this.manifest.requirements &&
        this.manifest.requirements.hasOwnProperty('ssh_key') && this.manifest.requirements.ssh_key) {
      this.metadata.push(new MetadataOption({
        'group': 'password',
        'title': 'SSH-PubKey',
        'name': 'root_authorized_keys',
        'type': 'text',
        'description': 'sets authorized_keys for the root user'
      }));
    }
  } else {
    if (this.manifest.users) {
      for (i in this.manifest.users) {
        var user = this.manifest.users[i];

        this.metadata.push(new MetadataOption({
          'group': 'password',
          'title': user.name,
          'name': user.name + '_pw',
          'type': 'password',
          'description': 'sets the password for the user'
        }));
      }
    } else {
      if ([ 'smartos', 'smartos64',
            'base', 'base64'].indexOf(this.manifest.name) >= 0
          || this.manifest.os === 'smartos') {
        this.metadata.push(new MetadataOption({
          'group': 'password',
          'title': 'root',
          'name': 'root_pw',
          'type': 'password',
          'description': 'sets the password for the user'
        }));

        this.metadata.push(new MetadataOption({
          'group': 'password',
          'title': 'admin',
          'name': 'admin_pw',
          'type': 'password',
          'description': 'sets the password for the user'
        }));
      }
    }
  }

  if (this.manifest.hasOwnProperty('metadata_info')) {
    var options;

    for (i in this.manifest.metadata_info) {
      options = this.manifest.metadata_info[i];

      if (!options.hasOwnProperty('group')) {
        options['group'] = 'custom';
      }

      this.metadata.push(new MetadataOption(options));
    }
  }
}

function DatasetList() {
  var content = [];
  var latest = [];

  function updateLatest() {
    var i, known = {};

    latest.length = 0;

    for (i in content) {
      var creator = content[i].getCreator();
      var key = [content[i].name, creator].join(':');

      if (!known[key]) {
        known[key] = true;

        latest.push(content[i]);
      }
    }
  }

  this.clear = function() {
    content.length = 0;
    latest.length = 0;
  }

  this.count = function() {
    return content.length;
  }

  this.push = function(ds, batch) {
    if (ds.constructor !== Dataset) {
      ds = new Dataset(ds);
    }

    content.push(ds);

    if (batch) {
      updateLatest();
    }
  }

  this.pushMany = function(list) {
    var i, len;
    for (i = 0, len = list.length; i < len; i++) {
      this.push(list[i], true);
    }

    updateLatest();
  }

  this.all = function() {
    return content;
  }

  this.get = function(index) {
    if (index >= 0 && index < content.length) {
      return content[index];
    }

    return null;
  }

  this.get_by_uuid = function(uuid) {
    var i, len, result = null;

    for (i = 0, len = content.length; i < len; i++) {
      if (content[i].uuid === uuid) {
        result = content[i];
      }
    }

    return result;
  }

  this.latest = function() {
    return latest;
  }

  this.clear();
}

function DatasetJsonGenerator(dataset) {
  var _dataset = dataset;

  var _options = {};
  var _nics = [];
  var _filesystems = [];
  var _disks = [];
  var _metadata = [];

  var brand = _dataset.getBrand();

  /**
   * normalize stuff a bit if we're consuming a api/datasets backend
   */
  if (_dataset.manifest.hasOwnProperty('options')) {
    _dataset.manifest['cpu_type'] = _dataset.manifest['options']['cpu_type'];
    _dataset.manifest['disk_driver'] = _dataset.manifest['options']['disk_driver'];
    _dataset.manifest['nic_driver'] = _dataset.manifest['options']['nic_driver'];
    _dataset.manifest['image_size'] = _dataset.manifest['options']['image_size'];
  }

  /**
   * type: boolean|integer|string|array
   */
  var _json_option_rules = {
    'image_uuid': [
      'string',
      function() {
        return _dataset.uuid;
      },
      [ 'joyent', 'lx' ]
    ],
    'autoboot': [
      'boolean',
      true,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'alias': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'hostname': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'delegate_dataset': [
      'boolean',
      null,
      [ 'joyent' ]
    ],
    'dns_domain': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'resolvers': [
      'array',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'max_physical_memory': [
      'integer',
      function() {
        if (_dataset.getBrand() === 'kvm') {
          return null;
        }

        return 256;
      },
      [ 'joyent', 'lx' ]
    ],
    'max_swap': [
      'integer',
      function() {
        var result;

        if (_dataset.getBrand() === 'kvm') {
          result = getOptionValue('ram');
        } else {
          result = getOptionValue('max_physical_memory');
        }

        return result;
      },
      [ 'joyent', 'lx' ]
    ],
    'tmpfs': [
      'integer',
      null,
      [ 'joyent' ]
    ],
    'ram': [
      'integer',
      1024,
      [ 'kvm' ]
    ],
    'quota': [
      'integer',
      null,
      [ 'joyent', 'lx' ]
    ],
    'cpu_cap': [
      'integer',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'cpu_shares': [
      'integer',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'max_lwps': [
      'integer',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'cpu_type': [
      'string',
      'qemu64',
      [ 'kvm' ]
    ],
    'vcpus': [
      'integer',
      null,
      [ 'kvm' ]
    ]
  };

  var _json_nic_rules = {
    'nic_tag': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'mac': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'ip': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'netmask': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'gateway': [
      'string',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'model': [
      'string',
      null,
      [ 'kvm' ]
    ],
    'vlan_id': [
      'integer',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'primary': [
      'boolean',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'allow_ip_spoofing': [
      'boolean',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'allow_mac_spoofing': [
      'boolean',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ],
    'allow_restricted_traffic': [
      'boolean',
      null,
      [ 'kvm', 'joyent', 'lx' ]
    ]
  };

  var _json_disk_rules = {
    'boot': [
      'boolean',
      false,
      [ 'kvm' ]
    ],
    'image_uuid': [
      'string',
      null,
      [ 'kvm' ]
    ],
    'size': [
      'integer',
      null,
      [ 'kvm' ]
    ],
    'image_size': [
      'integer',
      null,
      [ 'kvm' ]
    ],
    'model': [
      'string',
      null,
      [ 'kvm' ]
    ],
    'compression': [
      'string',
      null,
      [ 'kvm' ]
    ]
  };

  var _json_filesystem_rules = {
    'type': [
      'string',
      'lofs',
      [ 'joyent' ]
    ],
    'source': [
      'string',
      null,
      [ 'joyent' ]
    ],
    'target': [
      'string',
      null,
      [ 'joyent' ]
    ]
  };

  function getOptionValue(name) {
    return getPropertyValue(_options, _json_option_rules, name);
  }

  function getPropertyValue(object, rules, name) {
    var value = null;

    if (object.hasOwnProperty(name)) {
      value = object[name];

      if (typeof(value) === 'string' && value.length === 0) {
        value = null;
      }
    }

    if (rules[name]) {
      var field_info = rules[name];

      if (value === null) {
        if (field_info[1] !== null) {
          if (typeof(field_info[1]) === 'function') {
            value = field_info[1](object, rules);
          } else {
            value = field_info[1];
          }
        }
      } else {
        switch (field_info[0]) {
          case 'boolean':
            value = !!value;
          break;
          case 'integer':
            value = parseInt(value);
            if (!value) {
              value = 0;
            }
          break;
          case 'array':
            value = value.toString().split(/[\s,]+/);
            if (!value) {
              value = null;
            }
          break;
          default:
            value = value.toString();
        }
      }
    }

    return value;
  }

  this.setOption = function(name, value) {
    _options[name] = value;

    return this;
  };

  this.setOptions = function(obj) {
    var prop;

    for (prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        this.setOption(prop, obj[prop]);
      }
    }

    return this;
  };

  this.setNics = function(nics) {
    var i;

    _nics.length = 0;

    for (i in nics) {
      _nics.push(nics[i]);
    }
  };

  this.setFilesystems = function(filesystems) {
    var i;

    _filesystems.length = 0;

    for (i in filesystems) {
      _filesystems.push(filesystems[i]);
    }
  };

  this.setDisks = function(disks) {
    var i;

    _disks.length = 0;

    // add system disk from dataset for kvm
    if (brand === 'kvm') {
      if (_dataset.manifest.image_size && _dataset.manifest.disk_driver) {
        _disks.push({
          'boot': true,
          'model': _dataset.manifest.disk_driver,
          'image_size': _dataset.manifest.image_size,
          'image_uuid': _dataset.uuid
        });
      }
    }

    for (i in disks) {
      _disks.push(disks[i]);
    }
  };

  this.setMetadata = function(metadata) {
    var i;

    _metadata.length = 0;

    for (i in metadata) {
      _metadata.push(metadata[i]);
    }
  };

  this.generate = function() {
    var json = {};
    var name, i, len;

    json['brand'] = brand;

    // add simple options
    for (name in _json_option_rules) {
      var field_info = _json_option_rules[name];

      if (field_info[2].indexOf(brand) >= 0) {
        var value = getOptionValue(name);

        if (value !== null) {
          json[name] = value;
        }
      }
    }

    // add nics
    if (_nics.length > 0) {
      json.nics = [];

      for (i = 0, len = _nics.length; i < len; i++) {
        var item = {};

        for (name in _json_nic_rules) {
          var field_info = _json_nic_rules[name];

          if (field_info[2].indexOf(brand) >= 0) {
            var value = getPropertyValue(_nics[i], _json_nic_rules, name);

            if (value !== null) {
              item[name] = value;
            }
          }
        }

        json.nics.push(item);
      }
    }

    // add disks
    if (_disks.length > 0) {
      json.disks = [];

      for (i = 0, len = _disks.length; i < len; i++) {
        var item = {};

        for (name in _json_disk_rules) {
          var field_info = _json_disk_rules[name];

          if (field_info[2].indexOf(brand) >= 0) {
            var value = getPropertyValue(_disks[i], _json_disk_rules, name);

            if (value !== null) {
              item[name] = value;
            }
          }
        }

        json.disks.push(item);
      }
    }

    // add filesystems
    if (_filesystems.length > 0) {
      json.filesystems = [];

      for (i = 0, len = _filesystems.length; i < len; i++) {
        var item = {};

        for (name in _json_filesystem_rules) {
          var field_info = _json_filesystem_rules[name];

          if (field_info[2].indexOf(brand) >= 0) {
            var value = getPropertyValue(_filesystems[i], _json_filesystem_rules, name);

            if (value !== null) {
              item[name] = value;
            }
          }
        }

        json.filesystems.push(item);
      }
    }

    // add metadata
    if (_metadata.length > 0) {
      json.customer_metadata = {};
      json.internal_metadata = {};

      for (i = 0, len = _metadata.length; i < len; i++) {
        if (_metadata[i].name.match(/_pw$/)) {
          json.internal_metadata[_metadata[i].name] = _metadata[i].value;
        }

        json.customer_metadata[_metadata[i].name] = _metadata[i].value;
      }
    }

    return json;
  };
}

;'use strict';

angular.module('dsapi.services', [], ['$provide', function($provide) {
  $provide.factory('dsapiDatasets', ['$http', '$q', function($http, $q) {
    var datasets = new DatasetList();
    var deferred = $q.defer();
    var service = {
      count: function() {
        return datasets.count();
      },
      all: function() {
        return datasets.all();
      },
      latest: function() {
        return datasets.latest();
      },
      get: function(index) {
        return datasets.get(index);
      },
      by_uuid: function(uuid) {
        return datasets.get_by_uuid(uuid);
      }
    };

    /* initialize datasets list */
    $http.get('/images')
      .success(function(data) {
        datasets.pushMany(data);

        /* resolve service instance */
        deferred.resolve(service);
      })
      .error(function(data, status, headers, config) {
        if (status == 404) {
          $http.get('/images')
          .success(function(data) {
            datasets.pushMany(data);

            /* resolve service instance */
            deferred.resolve(service);
          });
        } else {
          /* reject service instance */
          deferred.reject('Error loading datasets list.');
        }
      });

    return deferred.promise;
  }]);
}]);


//# sourceMappingURL=app.js.map