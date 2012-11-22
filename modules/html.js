/*global CasperError console exports phantom require*/

var utils = require('utils');
var fs = require('fs');

function createBasicHTML(){
    "use strict";
    return '<html><head></head><body><section id="uitests"></section></body></html>';
}

function createElement(tag, classes){
    "use strict"
    var element = utils.node(tag);
    if(classes){
        classes.forEach(function(className){
            elemt.className += className + " ";
        });
    }
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

    var filepath            = params['filepath']            || undefined
      , templatePath        = params['templatePath']        || undefined
      , cssPaths            = params['cssPaths']            || undefined
      , jsPaths             = params['jsPaths']             || undefined
      , containerId         = params['containerId']         || "uitests"
      , useTable            = params['useTable']            || true
      , testsuiteTemplate   = params['testsuiteTemplate']   || undefined
      , testsuiteId         = params['testsuiteId']         || undefined
      , testcaseTemplate    = params['testcaseTemplate']    || undefined
      , images              = params['images']              || undefined
      , logFile             = null
      , exporter            = this
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
              , jsAttrs = null
              , tempEl
            ;

            if(templatePath){
                try {
                    template = fs.read(templatePath);
                } catch (e) {
                    tester.casper.echo(f('Unable to read from %s: %s', templatePath, e), 'ERROR', 80);
                }
            }else{
                template = createBasicHTML();
            }

            logFile = document.open("text/html");
            logFile.write(template);

            // Add any css files 
            if(cssPaths){
                cssPaths.forEach(function(css){
                    cssAttrs = {
                          rel  : "stylesheet"
                        , type : "text/css"
                        , href : css
                    };

                    logFile.getElementsByTagName("head")[0].appendChild(utils.node("link", cssAttrs));
                });
            }

            //First add the testsuite template
            if(testsuiteTemplate){
                tempEl = document.createElement('div');
                tempEl.innerHTML = testsuiteTemplate;

                logFile.getElementById(containerId).appendChild(tempEl.firstChild);
            } else {
                testsuiteId = containerId;
            }

            // Do something with the _tests array
            if(exporter._tests){
                if(testcaseTemplate && images && images.tick && images.cross){
                    for(var test in exporter._tests){
                        tempEl = document.createElement('div');
                        tempEl.innerHTML = utils.format(testcaseTemplate, exporter._tests[test].name, exporter._tests[test].pass ? images.tick.src : images.cross.src);

                        logFile.getElementById(testsuiteId).appendChild(tempEl.firstChild);
                    }
                }else{
                    var testUl = utils.node("ul");

                    for(var test in exporter._tests){
                        var testLi = utils.node('li');
                    
                        testLi.innerHTML = exporter._tests[test].name + " ..." + exporter._tests[test].pass ? "passed" : "failed"; 

                        testUl.appendChild(testLi);
                    }

                    logFile.getElementById(testsuiteId).appendChild(testUl);
                }
            }else {

                var pTag = utils.node('p');
                pTag.innerHTML = "no tests";

                logFile.getElementById(testsuiteId).appendChild(pTag);
            }

            // Add any javascript files
            if(jsPaths){
                jsPaths.forEach(function(js){
                    jsAttrs = {
                          type : "text/javascript"
                        , href : js
                    };

                    logFile.getElementsByTagName("body")[0].appendChild(utils.node("script", jsAttrs));
                });
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
