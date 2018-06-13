"use strict";
//  Licensed under the Apache License. See footer for details.
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var URL = __importStar(require("url"));
var _ = __importStar(require("underscore"));
var ports = __importStar(require("./ports"));
var yaml = __importStar(require("js-yaml"));
function throwError(message) {
    var msg = "cfenv: " + message;
    console.log("error: " + message);
    throw new Error(msg);
}
function getAppEnv(options) {
    return new AppEnv(options);
}
exports.getAppEnv = getAppEnv;
var AppEnv = /** @class */ (function () {
    function AppEnv(options) {
        this.isLocal = false;
        try {
            JSON.parse(process.env.VCAP_APPLICATION || "");
        }
        catch (err) {
            this.isLocal = true;
        }
        options = options || {};
        if (this.isLocal) {
            this.getVcapFromFile(options);
        }
        this.app = getApp(this, options);
        this.services = getServices(this, options);
        this.name = getName(this, options);
        this.port = getPort(this);
        this.bind = getBind(this);
        this.urls = getURLs(this, options);
        this.url = this.urls[0];
    }
    AppEnv.prototype.getVcapFromFile = function (options) {
        if (options.vcapFile === undefined) {
            return;
        }
        var contents;
        try {
            contents = fs.readFileSync(options.vcapFile, 'utf8');
        }
        catch (err) {
            console.log("error reading vcapFile '" + options.vcapFile + "': " + err + "; ignoring");
            return;
        }
        var vcap;
        try {
            vcap = JSON.parse(contents);
        }
        catch (err) {
            console.log("error parsing vcapFile '" + options.vcapFile + "': " + err + "; ignoring");
            return;
        }
        options.vcap = vcap;
    };
    AppEnv.prototype.getServices = function () {
        var result = {};
        for (var serviceName in this.services) {
            var services = this.services[serviceName];
            services.forEach(function (service) {
                result[service.name] = service;
            });
        }
        return result;
    };
    AppEnv.prototype.getService = function (spec) {
        var matches;
        var name;
        if (_.isRegExp(spec)) {
            matches = function (name) {
                return name.match(spec);
            };
        }
        else {
            matches = function (name) {
                return name === "" + spec;
            };
        }
        var services = this.getServices();
        for (name in services) {
            var service = services[name];
            if (matches(name)) {
                return service;
            }
        }
        return null;
    };
    AppEnv.prototype.getServiceURL = function (spec, replacements) {
        var url;
        if (replacements == null) {
            replacements = {};
        }
        var service = this.getService(spec);
        var credentials = service != null ? service.credentials : void 0;
        if (credentials == null) {
            return "";
        }
        replacements = _.clone(replacements);
        if (replacements.url) {
            url = credentials[replacements.url];
        }
        else {
            url = credentials.url || credentials.uri;
        }
        if (url == null) {
            return "";
        }
        delete replacements.url;
        if (_.isEmpty(replacements)) {
            return url;
        }
        var purl = URL.parse(url);
        for (var key in replacements) {
            var value = replacements[key];
            switch (key) {
                case "auth":
                    var userid = value[0];
                    var password = value[1];
                    purl.auth = credentials[userid] + ":" + credentials[password];
                    break;
                case "hash":
                    purl.hash = credentials[key];
                    break;
                case "host":
                    purl.host = credentials[key];
                    break;
                case "hostname":
                    purl.hostname = credentials[key];
                    break;
                case "href":
                    purl.href = credentials[key];
                    break;
                case "path":
                    purl.path = credentials[key];
                    break;
                case "pathname":
                    purl.pathname = credentials[key];
                    break;
                case "protocol":
                    purl.protocol = credentials[key];
                    break;
                case "search":
                    purl.search = credentials[key];
                    break;
            }
        }
        return URL.format(purl);
    };
    AppEnv.prototype.getServiceCreds = function (spec) {
        var service = this.getService(spec);
        if (service) {
            return service.credentials || {};
        }
        return null;
    };
    return AppEnv;
}());
exports.AppEnv = AppEnv;
function getApp(appEnv, options) {
    var appStr = process.env.VCAP_APPLICATION;
    if (appStr) {
        try {
            var envValue = JSON.parse(appStr);
            if (!appEnv.isLocal) {
                return envValue;
            }
            if (options.vcap && options.vcap.application) {
                return options.vcap.application;
            }
            return envValue;
        }
        catch (err) {
            throwError("env var VCAP_APPLICATION is not JSON: " + appStr);
        }
    }
    return { name: "ignoreme", host: "localhost", uris: ["localhost"] };
}
exports.getApp = getApp;
function getServices(appEnv, options) {
    var servicesStr = process.env.VCAP_SERVICES;
    if (servicesStr) {
        try {
            var envValue = JSON.parse(servicesStr);
            if (!appEnv.isLocal) {
                return envValue;
            }
            if (options.vcap && options.vcap.services) {
                return options.vcap.services;
            }
            return envValue;
        }
        catch (err) {
            throwError("env var VCAP_SERVICES is not JSON: " + servicesStr);
        }
    }
    return {};
}
exports.getServices = getServices;
function getPort(appEnv) {
    var portString = process.env.PORT || process.env.CF_INSTANCE_PORT || process.env.VCAP_APP_PORT;
    if (!portString) {
        if (!appEnv.name) {
            return 3000;
        }
        portString = "" + ports.getPort(appEnv.name);
    }
    var port = parseInt(portString, 10);
    if (isNaN(port)) {
        throwError("invalid PORT value: " + portString);
    }
    return port;
}
exports.getPort = getPort;
function getName(appEnv, options) {
    if (options.name) {
        return options.name;
    }
    var name = appEnv.app ? appEnv.app.name : "";
    if (name) {
        return name;
    }
    if (fs.existsSync("manifest.yml")) {
        var yString = fs.readFileSync("manifest.yml", "utf8");
        var manifest = yaml.safeLoad(yString, { filename: "manifest.yml" });
        if (manifest.applications) {
            var app = manifest.applications[0];
            if (app.name) {
                return app.name;
            }
        }
    }
    if (fs.existsSync("package.json")) {
        var pString = fs.readFileSync("package.json", "utf8");
        try {
            var pObject = JSON.parse(pString);
            return pObject.name;
        }
        catch (_a) { }
    }
    return "";
}
exports.getName = getName;
function getBind(appEnv) {
    if (appEnv.app) {
        return appEnv.app.host || "localhost";
    }
    return "localhost";
}
exports.getBind = getBind;
function getURLs(appEnv, options) {
    var uris = [];
    if (appEnv.app) {
        uris = appEnv.app.uris;
    }
    if (appEnv.isLocal) {
        uris = ["localhost:" + appEnv.port];
    }
    if (uris.length == 0) {
        uris = ["localhost"];
    }
    var protocol = options.protocol;
    if (!protocol) {
        if (appEnv.isLocal) {
            protocol = "http:";
        }
        else {
            protocol = "https:";
        }
    }
    return uris.map(function (uri) {
        return protocol + "//" + uri;
    });
}
exports.getURLs = getURLs;
//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2014
// Copyright Patrick Mueller 2015, 2017
// Copyright Patrick Mueller, Dr Nic Williams, 2018
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------
