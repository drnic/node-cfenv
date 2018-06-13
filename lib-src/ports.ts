// Rewritten as TypeScript https://github.com/hoodiehq-archive/node-ports/blob/master/index.js

// Manage a registry of unique port assignments for
// an operating system. Store user-defined meta-data
// with each port.

// The registry lives in ~/.ports

// Note that this module currently doesn’t check whether
// a port is actually available. That’s TBD.

import * as fs from "fs";
import * as path from "path";

var ports_file = getPortsFile();
var base_port = 6000;

export function getPort(name: string, data?: any) : number {

  data = data || {};
  var map = read_json(ports_file);
  var max_port = module.exports.base_port;

  for (var port_m in map) {
    let port_n = parseInt(port_m, 10);

    if(port_n > max_port) {
      max_port = port_n;
    }

    var name_m = map[port_n].name;
    if(name_m == name) {
      return port_n;
    }
  }

  // if we got here, max_port is the highest registered port
  var new_port = max_port + 1;
  data.name = name;
  map[new_port] = data;

  write_json(module.exports.ports_file, map);
  return new_port;
};

function read_json(filename: string, default_value?: any) : any {
  try {
    return JSON.parse(fs.readFileSync(filename, "utf-8"));
  } catch(e) {
    return default_value || {};
  }
};

function write_json(filename: string, value: any) {
  fs.writeFileSync(filename + ".tmp", JSON.stringify(value));
  fs.renameSync(filename + ".tmp", filename);
};

function getPortsFile() : string {
  if (process.env.PORTSHOME !== undefined) {
      var homedir = "PORTSHOME";
  } else {
      var homedir = "HOME";
      if(process.platform === "win32") {
        homedir = "USERPROFILE";
      }
  }
  return path.join(process.env[homedir] || "~",".ports.json");
};
