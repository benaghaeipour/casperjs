/*global CasperError console exports phantom require*/

var utils = require('utils');
var fs = require('fs');

/**
 * Generates a value for 'classname' attribute of the JUnit XML report.
 *
 * Uses the (relative) file name of the current casper script without file
 * extension as classname.
 *
 * @param  String  classname
 * @return String
 */
// function generateClassName(classname) {
//     "use strict";
//     classname = classname.replace(phantom.casperPath, "").trim();
//     var script = classname || phantom.casperScript;
//     if (script.indexOf(fs.workingDirectory) === 0) {
//         script = script.substring(fs.workingDirectory.length + 1);
//     }
//     if (script.indexOf('/') === 0) {
//         script = script.substring(1, script.length);
//     }
//     if (~script.indexOf('.')) {
//         script = script.substring(0, script.lastIndexOf('.'));
//     }
//     return script || "unknown";
// }

function createBasicHTML(){
    "use strict";
    return '<html><head></head><body><section id="uitests"></section></body></html>';
}

/**
 * Creates a HTMLExporter instance
 *
 * @return HTMLExporter
 */
exports.create = function create(tester, params) {
    "use strict";
    return new HTMLExporter(tester, params);
};

/**
 * HTML exporter for test results.
 *
 */
function HTMLExporter(tester, params) {
    "use strict";

    var filepath     = params['filepath']      || undefined
      , templatePath = params['templatePath']  || undefined
      , cssPath      = params['cssPath']       || undefined
      , replaceId    = params['replaceId']     || "uitests"
      , useTable     = params['useTable']      || true
      , logFile      = null
      , exporter     = this
    ;

    if(filepath){
        this.filepath = filepath;

        tester.on('success', function onSuccess(success) {

            exporter.addSuccess(fs.absolute(success.file), success.message || success.standard);
        });

        tester.on('fail', function onFail(failure) {
            exporter.addFailure(
                fs.absolute(failure.file),
                failure.message  || failure.standard,
                failure.standard || "test failed",
                failure.type     || "unknown"
            );
        });

        tester.on('exporter.save', function exporterSave(){
            var template = null
              , cssAttrs = null
            ;

            if(templatePath){
                try {
                    template = fs.read(templatePath);
                    
                } catch (e){
                    tester.casper.echo(f('Unable to read from %s: %s', templatePath, e), 'ERROR', 80);
                }
            }else{
                template = createBasicHTML();
            }

            logFile = document.open("text/html");
            logFile.write(template);

            if(cssPath){
                cssAttrs = {
                      rel  : "stylesheet"
                    , type : "text/css"
                    , href : cssPath
                };

                logFile.getElementsByTagName("head")[0].appendChild(utils.node("link", cssAttrs));
            }

            if(exporter._tests){

                var testUl = utils.node("ul");

                for(var test in exporter._tests){
                    var testLi = utils.node('li');
                
                    testLi.innerHTML = exporter._tests[test].name + " " + exporter._tests[test].pass; 

                    testUl.appendChild(testLi);
                }

                logFile.getElementById(replaceId).appendChild(testUl);
            }else {
                var pTag = utils.node('p');
                pTag.innerHTML = "no tests";

                logFile.getElementById(replaceId).appendChild(pTag);
            }

            try {
                fs.write(filepath, logFile.documentElement.outerHTML, 'w');
                tester.casper.echo(f('Result log stored in %s', filepath), 'INFO', 80);
            } catch (e) {
                tester.casper.echo(f('Unable to write results to %s: %s', filepath, e), 'ERROR', 80);
            }
        });
    }

    this._tests = [];
}
exports.HTMLExporter = HTMLExporter;

/**
 * Adds a successful test result.
 *
 * @param  String  classname
 * @param  String  name
 */
HTMLExporter.prototype.addSuccess = function addSuccess(classname, name) {
    "use strict";
    this._tests.push({file: classname, name:name, pass:true});
};

/**
 * Adds a failed test result.
 *
 * @param  String  classname
 * @param  String  name
 * @param  String  message
 * @param  String  type
 */
HTMLExporter.prototype.addFailure = function addFailure(classname, name, message, type) {
    "use strict";
    this._tests.push({file: classname, name:name, message:message, type:type || "unknown", pass:false});
};
