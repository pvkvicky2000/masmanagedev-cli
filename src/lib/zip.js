var log = require('./logger');
var fs = require('fs-extra');
var templates = require('./templates');
var dbcscripts = require('./dbcscripts');
var env = require('./env');
var path = require('path');
var fs = require('fs');
var util = require('util');
var shell = require('shelljs');
var log = require("./logger");
//arquive solution
var archiver = require('archiver');
var archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});
/** 
 * The uuid v4 will be used to replace the uuid property in order to generate the unique id for this PSI package. 
 * TODO: Replace the variable in the right place.
 */
const uuidv4 = require('uuid/v4');




var zip = module.exports = Object.create({});


zip.getUUID = function () {
    return uuidv4();
};

/**
 * Install and verify the variable from MBO.
 * @param {*} template Template's source folder.
 * @param {*} dir Target directory.
 * @param {*} templateArgs Template's arguments.
 */
zip.installTemplatePSI = function (template, dir, templateArgs) {
    dir = dir || env.addonDir() || '.';
    env.ensureDir(dir);

    if (!templateArgs.java_package_dir) {
        templateArgs.java_package_dir = path.join(...templateArgs.java_package.split('.'));
    }


    log.info("Install %s into %s", template, dir);
    var tdir = templates.resolveName(template);
    shell.ls("-R", tdir).forEach(function (f) {
        if (!fs.lstatSync(path.join(tdir, f)).isDirectory()) {
            zip.installTemplatePSIFile(path.resolve(tdir, f), dir, f, templateArgs);
        }
    });
};

/**
 * Install and verify the variable from MBO.
 * @param {*} template Template's source folder.
 * @param {*} dir Target directory.
 * @param {*} templateArgs Template's arguments.
 */
zip.installTemplateZIP = function (template, dir, templateArgs) {
    dir = dir || env.addonDir() || '.';
    env.ensureDir(dir);

    if (!templateArgs.java_package_dir) {
        templateArgs.java_package_dir = path.join(...templateArgs.java_package.split('.'));
    }


    log.info("Install %s into %s", template, dir);
    var tdir = templates.resolveName(template);
    shell.ls("-R", tdir).forEach(function (f) {
        if (!fs.lstatSync(path.join(tdir, f)).isDirectory()) {
            zip.installTemplateZIPFile(path.resolve(tdir, f), dir, f, templateArgs);
        }
    });
};

/**
 * Handle the PSI template files. 
 * @param {*} template Source folder of template files.
 * @param {*} outBaseDir Output folder name.
 * @param {*} filePath Full path of rendered files.
 * @param {*} templateArgs Template arguments.
 */
zip.installTemplatePSIFile = function (template, outBaseDir, filePath, templateArgs) {
    var destPath = templates.render(filePath, templateArgs);

    // handle dbc scripts
    var script = dbcscripts.script(path.basename(template));
    if (script) {
        var destScript = dbcscripts.nextScript(path.join(outBaseDir, path.dirname(destPath)), script.ext);
        destPath = path.join(path.dirname(destPath), destScript);
        log.info("Installing ZIP  folfer for zip: %s", destPath);
        templates.renderToFile(template, templateArgs, path.join(outBaseDir, destPath));
        return;
    } //Ending DBC installing process for zip

    log.info("PSI structure installing at: %s", destPath);
    templates.renderToFile(template, templateArgs, path.join(outBaseDir, destPath));
};

/**
 * Handle the ZIP template files. 
 * @param {*} template Source folder of template files.
 * @param {*} outBaseDir Output folder name.
 * @param {*} filePath Full path of rendered files.
 * @param {*} templateArgs Template arguments.
 */
zip.installTemplateZIPFile = function (template, outBaseDir, filePath, templateArgs) {

    return new Promise(function (resolve, reject) {
        var destPath = templates.render(filePath, templateArgs);
        log.info("ZIP structure installing at: %s", destPath);
        templates.renderToFile(template, templateArgs, path.join(outBaseDir, destPath));
        resolve(templates);
    }).catch(function (err) {
        reject(err);
    });
};


zip.pkgToDir = function (pkg) {
    pkg = pkg.replace(/\./g, '/');
    return pkg;
};
/**
 * Copy from target files
 * 
 */

zip.copyFileSync = function (source, target) {

    var targetFile = target;
    //if target is a directory a new file with the same name will be created
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }
    //target file will be read
    fs.writeFileSync(targetFile, fs.readFileSync(source));
};

/**
 * Checks if the directory exists
 */
zip.ensureDir = function (dir) {
    return fs.existsSync(dir);
}

/**
 * Needs create the FILE storage folder
 * @param {*} projectName 
 */
zip.createFILES = function (projectName) {
    var filesPath = './installer/' + projectName + '/FILES';
    if (!fs.existsSync(filesPath)) {
        fs.mkdirSync(filesPath);
    }
};
/**
 *  Copy folder recursively.
 * @param {*} source 
 * @param {*} target 
 */
zip.copyFolderRecursiveSync = function (source, target) {
    var files = [];

    //check if folder needs to be created or integrated
    var targetFolder = path.join(target, path.basename(source));
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }

    //copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            var curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                zip.copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                zip.copyFileSync(curSource, targetFolder);
            }
        });
    }
};

/**
 * Zip the content from FILES into a package
 */
zip.zipFolderContent = function (destDir, package_name) {

   return new Promise(function (resolve, reject) {
        var fileName = package_name;
        var fileOutput = fs.createWriteStream(fileName);

        fileOutput.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
            resolve();
        });
        archive.on('error', function (err) {
            reject(err);
        });

        archive.pipe(fileOutput);
        // add as many as you like
        archive.glob('**/*', {
            cwd: 'dist/',
            ignore: ['*.zip']
        }, {});
        archive.finalize(function (err, bytes) {
            if (err) {
                reject(err);
            }
            console.log('Package zip done:', base, bytes);
        }).catch(function (err) {
            reject(err);
        });
    });
};
