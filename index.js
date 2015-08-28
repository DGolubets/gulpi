var Promise = require('bluebird');
var stream = require('stream');
var domain = require("domain");
var colors = require('colors');
var gulp = require('gulp');

/**
 * Tasks registry.
 * Keys are task names.
 */
var tasks = {};

/**
 * Defines a named task.
 * @param taskName
 * @param taskFunction
 */
exports.task = function (taskName, taskFunction){
    if(typeof taskName === "function"){
        taskFunction = taskName;
        taskName = taskFunction.name;
    }

    // register task for calling by name
    tasks[taskName] = taskFunction;

    // register gulp task for running from gulp-cli
    gulp.task(taskName, toGulpTask(taskFunction));
};

/**
 * Runs a task.
 * @param task Either a task name or a function
 * @param options Options to pass to the task
 * @returns Promise[TaskResult]
 */
exports.run = function (task, options){

    var taskName;
    var taskFunction;

    if(typeof task === "string"){
        taskName = task;
        taskFunction = tasks[taskName];
    }
    else if(typeof task === "function") {
        taskFunction = task;
        taskName = taskFunction.name || "<anonymous>";
    }
    else {
        throw "Not supported";
    }

    console.log('Starting \'' + colors.cyan(taskName) + '\'...');

    var startTime = process.hrtime();
    function timeStr(){
        var diff = process.hrtime(startTime);
        var nanos= diff[0] * 1e9 + diff[1];
        return (nanos / 1e6) + ' ms';
    }

    var promise = execute(taskFunction, options);

    promise.then(
        function(){
            console.log('Finished \'' + colors.cyan(taskName) + '\' after ' + colors.magenta(timeStr()));
        },
        function(){
            console.log('\'' + colors.cyan(taskName) + '\' ' + colors.red('errored after ') + colors.magenta(timeStr()));
        });

    return promise;
};

/**
 * Executes task function.
 * @param task
 * @param options
 * @returns Promise
 */
function execute(task, options){
    return new Promise(function(resolve, reject){
        // create a domain to catch all unhandled async errors, e.g. in streams
        var d = domain.create();

        d.on('error', function (err) {
            reject(err);
        });

        d.run(function(){
            // now we check for supported function formats

            if (task.length == 2) {
                // a node style async function: function(options, callback){...}
                task(options, function (err, res) {
                    if (err)
                        reject(err);
                    else
                        resolve(res);
                });
            }
            else {
                // then execute it and check result type
                var result = task(options);

                if (result instanceof Promise) {
                    // a promise based async function
                    result.then(resolve, reject);
                }
                else if (result instanceof stream.Stream) {
                    // a stream based async function
                    result.on("end", resolve);
                    result.on("error", reject);
                }
                else {
                    // a synchronous function
                    resolve(result);
                }
            }
        });
    });
}

/**
 * Converts Gulpi task function to Gulp task function.
 * Main difference is in additional 'options' argument which Gulpi functions take.
 * When run by gulp, options should be just skipped, i.e. set to null.
 * @param taskFunction
 */
function toGulpTask(taskFunction){
    var gulpFunction;

    if (taskFunction.length == 2) {
        // a node style async function: function(options, callback){...}
        gulpFunction = function(callback){
            return taskFunction(null, callback);
        };
    }
    else {
        gulpFunction = function(){
            var result = taskFunction();
            if (result instanceof Promise || result instanceof stream.Stream) {
                // Gulp can handle both streams and promises
                return result;
            }
            else {
                // synchronous functions don't work in Gulp 4
                // so let it look like a promise
                return Promise.resolve(result);
            }
        };
    }

    return gulpFunction;
}