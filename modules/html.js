/*global CasperError console exports phantom require*/

var utils = require('utils');
var fs = require('fs');

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

  this.projectName    = params['name']         || undefined;
  this.filePath       = params['filePath']     || undefined;
  this.templatePath   = params['templatePath'] || undefined;
  this.cssPaths       = params['cssPaths']     || undefined;
  this.jsPaths        = params['jsPaths']      || undefined;
  this.success        = params['success']      || undefined;
  this.failure        = params['failure']      || undefined;
  this.tester         = tester;
  this.testsuites     = [];

  var logFile             = null
    , exporter            = this
  ;

  if(this.filePath && this.templatePath){

    tester.casper.on('starting', function onStarting(name){
      exporter.addTestsuite(name, exporter);
    });

    tester.on('test.done', function onTestDone(){
      exporter.saveTestsuite();
    });

    tester.casper.on('step.adding', function onStepAdding(step){
      exporter.addTestcase(step);
    });

    tester.on('success', function onSuccess(success) {
      exporter.addSuccess(fs.absolute(success.file), success.message || success.standard);
    });

    tester.on('fail', function onFail(failure) {
      exporter.addFailure(fs.absolute(failure.file), failure.message || failure.standard, failure.standard || "test failed", failure.type || "unknown");
    });

    tester.on('exporter.save', function exporterSave(){
      exporter.save();
    });
  }
}
exports.HTMLExporter = HTMLExporter;

/**
 * Adds a successful test result.
 *
 * @param  String  classname
 * @param  String  name
 */
HTMLExporter.prototype.addSuccess = function addSuccess(description, pass) {
  "use strict";
  if(this.currentTestcase){
    this.currentTestcase.addTest(new Test(description, true));
  }
};

/**
 * Adds a failed test result.
 *
 * @param  String  classname
 * @param  String  name
 * @param  String  message
 * @param  String  type
 */
HTMLExporter.prototype.addFailure = function addFailure(description, pass, message, type) {
  "use strict";
  if(this.currentTestcase){
    this.currentTestcase.addTest(new Test(description, false, message, type));
  }
};

/**
 * When a there is a casper.start this adds a new testsuite
 * @param {string} name - name of the testsuite
 */
HTMLExporter.prototype.addTestsuite = function addTestsuite(name){
  "use strict";
  this.tester.casper.echo('Testsuite ' + name + ' added');
  this.currentTestsuite = new Testsuite(name, this);
};

/**
 * When a call to casper.test.done this will add the current testsuite to the array of testsuites
 * @return {[type]} [description]
 */
HTMLExporter.prototype.saveTestsuite = function saveTestsuite(){
  "use strict";
  if(this.currentTestsuite != null){
    //var testsuite = utils.clone(this.currentTestsuite);
    this.testsuites.push(this.currentTestsuite);
    //this.currentTestsuite = null;
    this.tester.casper.echo('Testsuite ' + name + ' saved');
  }
};

/**
 * When there is a casper.then this adds a new Testcase to the current Testsuite
 * @param {string} name - name of the testcase
 */
HTMLExporter.prototype.addTestcase = function addTestcase(name){
  "use strict";
  this.tester.casper.echo('Testsuite = ' + this.currentTestsuite.name);
  if(this.currentTestsuite){
    this.currentTestcase = new Testcase(name);
    this.currentTestsuite.addTestcase(this.currentTestcase);
    this.tester.casper.echo('Testcase ' + name + ' added');
  }else{
    this.tester.casper.echo('Testcase ' + name + ' added');
  }
};


HTMLExporter.prototype.save = function save(){
  "use strict";

  var template
    , logFile
    , that = this
  ;

  if(this.templatePath){
    try {
      template = fs.read(this.templatePath);
    } catch (e) {
      this.tester.casper.echo(f('Unable to read from %s: %s', this.templatePath, e), 'ERROR', 80);
    }
  }

  logFile = document.open("text/html");
  logFile.write(template);

  // Add any css files into head
  if(this.cssPaths){
    this.cssPaths.forEach(function(css){
      cssAttrs = {
          rel  : "stylesheet"
        , type : "text/css"
        , href : css
      };

      logFile.getElementsByTagName("head")[0].appendChild(utils.node("link", cssAttrs));
    });
  }

  if(this.testsuites.length > 0){
    this.testsuites.forEach(function(testsuite){
      logFile.getElementById("uitests").appendChild(testsuite.print());
    });
  }

  // Add any javascript files at the end of body
  if(this.jsPaths){
    this.jsPaths.forEach(function(js){
      jsAttrs = {
          type : "text/javascript"
        , href : js
      };

      logFile.getElementsByTagName("body")[0].appendChild(utils.node("script", jsAttrs));
    });
  }

  try {
      fs.write(this.filePath, logFile.documentElement.outerHTML, 'w');
      this.tester.casper.echo(f('Result log stored in %s', this.filePath), 'INFO', 80);
  } catch (e) {
      this.tester.casper.echo(f('Unable to write results to %s: %s', this.filePath, e), 'ERROR', 80);
  }
};

function Testsuite(name, exporter){
  "use strict";

  this.name = name;
  this.projectName = exporter.testsuitesName;
  this.testcases = [];
  this.testcasesCount = 0;
  this.template = '<div id="[testsuites_name]_[testsuite_name]" class="testsuite row"> \
                    <div class="span12"> \
                      <div class="row"> \
                        <h2 class="testsuite_header span12">[testsuite_name] <img class="test_pass" src="[testsuite_pass_image]" /></h2> \
                      </div> \
                      <div class="row"> \
                        <div class="testsuite_tests span12"></div> \
                      </div> \
                    </div> \
                  </div>';
  this.pass = false;
  this.exporter = exporter;
}

Testsuite.prototype.addTestcase = function addTestcase(testcase){
  this.testcases.push(testcase);
  this.testcasesCount ++;
};

Testsuite.prototype.print = function print(){
  var testcases
    //, template = document.open("text/html")
    , tmpMarkup = this.template
    , el = document.createElement("div");
  ;

  tmpMarkup.replace(/[testsuites_name]/, this.projectName);
  tmpMarkup.replace(/[testsuite_name]/, this.name);
  tmpMarkup.replace(/[testsuite_pass_image]/, this.pass ? this.exporter.success : this.exporter.failure);

  el.innerText = tmpMarkup;

  //template.write(tmpMarkup);

  // this.testcases.forEach(function(testcase){
  //   testcases.print();
  // });
  
  return el;
};

function Testcase(name){
  "use strict";

  this.name = name;
  this.tests = [];
  this.pass = false;
  this.testCount = 0;
  this.screenshots = [];
  this.template = '<div class="testcase row"> \
                    <div class="span12"> \
                      <div class="row"> \
                        <h3 class="testcase_header span12">[testcase_name] <img class="test_pass" src="[testcase_pass_image]" /></h3> \
                      </div> \
                      <div class="row"> \
                        <div class="testcase_tests span12">[testcase_tests]</div> \
                      </div> \
                      <div class="row"> \
                        <div class="testcase_screenshots span12">[testcase_screenshots]</div> \
                      </div> \
                    </div> \
                  </div>';

  this.screenshotsLinkTemplate = '<span class="screenshots_link">Show Images</span>';
  this.screenshotTemplate      = '<div class="test_screenshot"><img class="screenshot" src="[screenshot]" /> <p class="screenshot_caption">[screenshot_caption]</p></div>';
}

Testcase.prototype.addTest = function addTest(test){
  this.tests.push(test);
  this.testCount ++;
};

Testcase.prototype.addScreenshot = function addScreenshot(screenshot){

  this.screenshots.push(screenshot);
};

Testcase.prototype.print = function print(){
  var template = document.open("text/html");
  template.write(this.template);
};

function Test(description, pass, message, type){
  "use strict";

  this.description = description;
  this.pass = pass;
  this.message = message;
  this.type = type;

  this.template = '<div class="test"><p class="test_description">[test_description]</p> <img class="test_pass" src="[test_pass_image]"></div>';

  function print(){
    var template = document.open("text/html")
      , tmp = this.template.replace();


    template.write(this.template);
  }
}