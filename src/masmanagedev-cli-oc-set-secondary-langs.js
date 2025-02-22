#! /usr/bin/env node

/*
 * Copyright (c) 2021-present, Vijay krishna.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const cli = require("./lib/cli");
const log = require("./lib/logger");
const oc = require("./lib/oc");
const langList = require("./lib/manage_config/lang_list");
const langValues = require("./lib/manage_config/lang_values");

var schema = {
  _version: "0.0.1",
  _description: "Manage configuration - set secondary languages",
  properties: {
    lang: {
      required: true,
      description: "secondary languages",
      _cli: "lang",
      default: "EN",
      ask: function () {
        langList();
        return true;
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
  const langs = result.lang.trim().toUpperCase().split(",");

  if (!langs.every((lang) => langValues.check(lang))) {
    log.error(`Invalid language code.`);
    return;
  }

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
  if (!oc.updateSecondaryLangs(manageWorkSpace, langs)) {
    log.error(`Could not update the secondary languages: ${result.lang}`);
    return;
  }
}
