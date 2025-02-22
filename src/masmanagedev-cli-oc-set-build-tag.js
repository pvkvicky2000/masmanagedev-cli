#! /usr/bin/env node

/*
 * Copyright (c) 2021-present, Vijay krishna.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const cli = require("./lib/cli");
const log = require("./lib/logger");
const oc = require("./lib/oc");

var schema = {
  _version: "0.0.1",
  _description: "Manage configuration - set build tag",
  properties: {
    tag: {
      required: true,
      description: "build tag",
      _cli: "tag",
      default: "latest",
      pattern: /^[a-zA-Z_\-0-9.]+$/,
      message: 'Must only contain lowercase and uppercase letters, digits, underscores, periods and dashes',
      conform: function (v) {
        return v.length < 129;
      },
    },
    instance: {
      required: true,
      description: "Maximo Application Suite instance name.",
      _cli: "instance",
    },
    workspace: {
      required: true,
      description: "Maximo Manage Workspace name.",
      _cli: "workspace",
    },
  },
};

cli.process(schema, process.argv, deploy);

function deploy(result) {
  if (!oc.exists()) {
    log.error(`Could not find oc cli, is OpenShift installed? Aborting...`);
    return;
  }

  if (!oc.loggedIn()) {
    log.error(
      `Need to login to OpenShift. Use ''oc login <openshift URL> -u <openshift admin username> -p <openshift admin password>' Aborting...`
    );
    return;
  }

  const namespace = `mas-${result.instance.trim()}-manage`;

  if (!oc.setNamespace(namespace)) {
    log.error(`Manage namespece ${namespace} does not exist. Aborting...`);
    return;
  }

  const manageWorkSpace = `${result.instance.trim()}-${result.workspace.trim()}`;
  // Update the deployment config
  if (!oc.updateBuildTag(manageWorkSpace, result.tag.trim())) {
    log.error(`Could not update the build tag: ${result.tag.trim()}`);
    return;
  }
}
