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
  this.testsuites     = {};

  var logFile             = null
    , exporter            = this
  ;

  if(this.filePath && this.templatePath){

    tester.casper.on('starting', function onStarting(name){
      exporter.addTestsuite(name);
    });

    tester.on('test.done', function onTestDone(){
      exporter.saveTestsuite();
    });

    tester.casper.on('step.adding', function onStepAdding(step){
      if(utils.isString(step)){
        exporter.addTestcase(step);
      }
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
    this.tester.casper.echo('Success added to ' + this.currentTestcase.name);
    this.currentTestcase.addTest(new Test(description, true, this));
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
    this.tester.casper.echo('Failure added to ' + currentTestcase.name);
    this.currentTestcase.addTest(new Test(description, false, this, message, type));
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
    var objCurrentTestsuite = {};
    objCurrentTestsuite[this.currentTestsuite.name] = this.currentTestsuite;
    utils.mergeObjects(this.testsuites, objCurrentTestsuite);
    this.tester.casper.echo('Testsuite saved');
  }
}

/**
 * When there is a casper.then this adds a new Testcase to the current Testsuite
 * @param {string} name - name of the testcase
 */
HTMLExporter.prototype.addTestcase = function addTestcase(name){
  "use strict";
  this.tester.casper.echo('Testsuite = ' + this.currentTestsuite.name);
  if(this.currentTestsuite){
    this.currentTestsuite.addTestcase(name, this.currentTestcase);
    this.currentTestcase = new Testcase(name, this);
    this.tester.casper.echo('Testcase ' + name + ' added');
  }else{
    this.tester.casper.echo('Testcase ' + name + ' not added');
  }
};

HTMLExporter.prototype.setCurrentTestsuite = function setTestsuite(name){
  if(this.testsuites[name].length > 0){
    this.currentTestsuite = this.testsuites[name];
  }
}

HTMLExporter.prototype.setCurrentTestcase = function setTestcase(name){
  if(this.currentTestsuite.testcases[name].length > 0){
    this.currentTestcase = this.currentTestsuite.testcases[name]
  }
}

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

  //if(this.testsuites.length > 0){
  for(testsuite in this.testsuites){
    logFile.getElementById("uitests").appendChild(this.testsuites[testsuite].print());
  }
    // this.testsuites.forEach(function(testsuite){
    //   logFile.getElementById("uitests").appendChild(testsuite.print());
    // });
  //}

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
  this.projectName = exporter.projectName;
  this.testcases = {};
  this.testcasesCount = 0;
  this.template = '<div class="span12"> \
                    <div class="row"> \
                      <h2 class="testsuite_header span12">[testsuite_name] <img class="test_pass" src="[testsuite_pass_image]" /></h2> \
                    </div> \
                    <div class="row"> \
                      <div class="testsuite_tests span12">[testsuite_tests]</div> \
                    </div> \
                  </div>';
  this.pass = true;
  this.exporter = exporter;
}

Testsuite.prototype.addTestcase = function addTestcase(name, testcase){

  if(testcase){
    var objCurrentTestcase = {};
    objCurrentTestcase[name] = testcase;
    utils.mergeObjects(this.testcases, objCurrentTestcase);
    this.testcasesCount ++;
  }

};

Testsuite.prototype.print = function print(){
  var testsuite_tests = ""
    , tmpMarkup = this.template
    , el = document.createElement("div");
  ;

  el.setAttribute("class", "testsuite row");
  el.setAttribute("id", this.projectName + "_"  + this.name);

  tmpMarkup = tmpMarkup.replace(/\[testsuites_name\]/gm, this.projectName);
  tmpMarkup = tmpMarkup.replace(/\[testsuite_name\]/gm, this.name);
  
  for(testcase in this.testcases){
    if(this.testcases[testcase]){
      this.pass = this.pass && this.testcases[testcase].pass;
      testsuite_tests += this.testcases[testcase].print();
    }
  }
  
  tmpMarkup = tmpMarkup.replace(/\[testsuite_tests\]/gm, testsuite_tests);

  tmpMarkup = tmpMarkup.replace(/\[testsuite_pass_image\]/gm, this.pass ? this.exporter.success : this.exporter.failure);

  el.innerHTML = tmpMarkup;

  return el;
};

function Testcase(name, exporter){
  "use strict";

  this.name = name;
  this.tests = [];
  this.pass = true;
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
  this.exporter = exporter;
}

Testcase.prototype.addTest = function addTest(test, exporter){
  this.tests.push(test);
  this.testCount ++;
};

Testcase.prototype.addScreenshot = function addScreenshot(screenshot){
  this.screenshots.push(screenshot);
};

Testcase.prototype.print = function print(){
  var testcase_tests = ""
    , tmpMarkup = this.template
  ;
  
  tmpMarkup = tmpMarkup.replace(/\[testcase_name\]/gm, this.name);
  
  this.tests.forEach(function(test){
    if(test){
      this.pass = this.pass && test.pass;

      testcase_tests += test.print();
    }
  });

  tmpMarkup = tmpMarkup.replace(/\[testcase_tests\]/gm, testcase_tests);
  tmpMarkup = tmpMarkup.replace(/\[testcase_screenshots\]/gm, "");

  
  tmpMarkup = tmpMarkup.replace(/\[testcase_pass_image\]/gm, this.pass ? this.exporter.success : this.exporter.failure);

  return tmpMarkup;
};

function Test(description, pass, exporter, message, type){
  "use strict";

  this.description = description;
  this.pass = pass;
  this.message = message;
  this.type = type;
  this.exporter = exporter;

  this.template = '<div class="test"><p class="test_description">[test_description]</p> <img class="test_pass" src="[test_pass_image]"></div>';
}

Test.prototype.print = function print(){
  var tmpMarkup = this.template
  ;

  tmpMarkup = tmpMarkup.replace(/\[test_description\]/gm, this.description);
  tmpMarkup = tmpMarkup.replace(/\[test_pass_image\]/gm, this.pass ? this.exporter.success : this.exporter.failure);

  return tmpMarkup;
};