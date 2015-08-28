var expect = require('chai').expect;
var should = require('chai').should();

var gulpi = require("../index");
var gulp = require("gulp");

describe('Gulpi', function() {

    it('registers gulp task', function(){
        var taskName = "Task 1";
        var taskFunction = function(){
            return taskName;
        };

        gulpi.task(taskName, taskFunction);

        var task = gulp.registry().get(taskName);
        should.exist(task);

    });

    it('runs a sync task', function(){
        var res = gulpi.run(function(){
            return 10;
        });

        expect(res.value()).to.equal(10);

    });

    //todo: make good tests
});