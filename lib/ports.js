"use strict";
// Rewritten as TypeScript https://github.com/hoodiehq-archive/node-ports/blob/master/index.js
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Manage a registry of unique port assignments for
// an operating system. Store user-defined meta-data
// with each port.
// The registry lives in ~/.ports
// Note that this module currently doesn’t check whether
// a port is actually available. That’s TBD.
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var ports_file = getPortsFile();
var base_port = 6000;
function getPort(name, data) {
    data = data || {};
    var map = read_json(ports_file);
    var max_port = base_port;
    for (var port_m in map) {
        var port_n = parseInt(port_m, 10);
        if (port_n > max_port) {
            max_port = port_n;
        }
        var name_m = map[port_n].name;
        if (name_m == name) {
            return port_n;
        }
    }
    // if we got here, max_port is the highest registered port
    var new_port = max_port + 1;
    data.name = name;
    map[new_port] = data;
    write_json(ports_file, map);
    return new_port;
}
exports.getPort = getPort;
;
function read_json(filename, default_value) {
    try {
        return JSON.parse(fs.readFileSync(filename, "utf-8"));
    }
    catch (e) {
        return default_value || {};
    }
}
;
function write_json(filename, value) {
    fs.writeFileSync(filename + ".tmp", JSON.stringify(value));
    fs.renameSync(filename + ".tmp", filename);
}
;
function getPortsFile() {
    if (process.env.PORTSHOME !== undefined) {
        var homedir = "PORTSHOME";
    }
    else {
        var homedir = "HOME";
        if (process.platform === "win32") {
            homedir = "USERPROFILE";
        }
    }
    return path.join(process.env[homedir] || "~", ".ports.json");
}
;
