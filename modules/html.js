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

  var testsuitesName      = params['name']                || undefined
    , filePath            = params['filePath']            || undefined
    , templatePath        = params['templatePath']        || undefined
    , cssPaths            = params['cssPaths']            || undefined
    , jsPaths             = params['jsPaths']             || undefined
    , success             = params['success']             || undefined
    , failure             = params['failure']             || undefined
    , logFile             = null
    , testsuites          = []
    , currentTestsuite    = {}
    , currentTestcase     = {}
    , exporter            = this
  ;

  if(filePath && templatePath){
    this.filePath = filePath;
    this.templatePath = templatePath

    tester.on('starting', function onStarting(name){
      exporter.addTestsuite(name);
    });

    tester.on('test.done', function onTestDone(){
      exporter.saveTestsuite();
    });

    tester.on('step.adding', function onStepAdding(step){
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

  this.currentTestcase.addTest(new Test(description, true));
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

  this.currentTestcase.addTest(new Test(description, false, message, type));
};

/**
 * When a there is a casper.start this adds a new testsuite
 * @param {string} name - name of the testsuite
 */
HTMLExporter.prototype.addTestsuite = function addTestsuite(name){
  "use strict";

  this.currentTestsuite = new Testsuite(name);
};

/**
 * When a call to casper.test.done this will add the current testsuite to the array of testsuites
 * @return {[type]} [description]
 */
HTMLExporter.prototype.saveTestsuite = function saveTestsuite(){
  "use strict";

  var testsuite = utils.clone(this.currentTestsuite);
  this.testsuites.push(testsuite);
  this.currentTestsuite = null;
};

/**
 * When there is a casper.then this adds a new Testcase to the current Testsuite
 * @param {string} name - name of the testcase
 */
HTMLExporter.prototype.addTestcase = function addTestcase(name){
  "use strict";

  this.currentTestcase = new Testcase(name);
  this.currentTestsuite.testcases.push(this.currentTestcase);
};


HTMLExporter.prototype.save = function save(){
  "use strict";

  var template
    , logFile
  ;

  if(this.templatePath){
    try {
      template = fs.read(this.templatePath);
    } catch (e) {
      tester.casper.echo(f('Unable to read from %s: %s', this.templatePath, e), 'ERROR', 80);
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

  this.testsuites.forEach(function(testsuite){
    logFile.getElementsById("uitests").appendChild(testsuite.print());
  });

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



};

function Testsuite(name){
  "use strict";

  this.name = name;
  this.testcases = [];
  this.testcasesCount = 0;
  this.template = '<div id="[testsuite_name]_[testsuite_name]" class="testsuite row">
                    <div class="span12">
                      <div class="row">
                        <h2 class="testsuite_header span12">[testsuite_name] <img class="test_pass" src="[testsuite_pass_image]" /></h2>
                      </div>
                      <div class="row">
                        <div class="testsuite_tests span12"></div>
                      </div>
                    </div>
                  </div>';

  function addTestcase(testcase){
    this.testcases.push(testcase);
    this.testcasesCount ++;
  }

  function print(){
    var testcases
      , template = document.open("text/html");
      
    template.write(this.template);

    template.replace(/[testsuites_name]/, this.testsuitesName);
    template.replace(/[testsuite_name]/, this.testsuiteName);


    this.testcases.forEach(function(testcase){
      testcases.print();
    });


    return template;
  }
}

function Testcase(name){
  "use strict";

  this.name = name;
  this.tests = [];
  this.pass = false;
  this.testCount = 0;
  this.screenshots = [];
  this.template = '<div class="testcase row">
                    <div class="span12">
                      <div class="row">
                        <h3 class="testcase_header span12">[testcase_name] <img class="test_pass" src="[testcase_pass_image]" /></h3>
                      </div>
                      <div class="row">
                        <div class="testcase_tests span12">[testcase_tests]</div>
                      </div>
                      <div class="row">
                        <div class="testcase_screenshots span12">[testcase_screenshots]</div>
                      </div>
                    </div>
                  </div>';

  this.screenshotsLinkTemplate = '<span class="screenshots_link">Show Images</span>';
  this.screenshotTemplate      = '<div class="test_screenshot"><img class="screenshot" src="[screenshot]" /> <p class="screenshot_caption">[screenshot_caption]</p></div>';

  function addTest(test){
    this.tests.push(test);
    this.testCount ++;
  }

  function addScreenshot(screenshot){
    this.screenshots.push(screenshot);
  }

  function print(){
    var template = document.open("text/html");
    template.write(this.template);
  }
}

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