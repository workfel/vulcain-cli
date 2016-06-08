/// <binding Clean='clean' ProjectOpened='watch-ts' />
var os = require('os');
var Path = require('path');

var gulp = require("gulp"),
    ts = require("gulp-typescript"),
    merge = require('merge2'),
    fse = require('fs-extra'),
    insert = require('gulp-insert'),
    sourcemaps = require('gulp-sourcemaps'),
    concat = require("gulp-concat");

var rootDir = "file://" + __dirname;
process.on('uncaughtException', console.error.bind(console));

gulp.task('default', [ 'clean', 'compile-ts' ]);

// https://www.npmjs.com/package/gulp-typescript
gulp.task("compile-ts", function ()
{
    var tsProject = ts.createProject(
        './tsconfig.json',
        {
            sortOutput: true,
            typescript: require('typescript')    // must a project package dependency
        });

    var tsResult =
        gulp.src(['src/**/*.ts', 'typings/tsd.d.ts'], { base: 'src/' })
            .pipe(sourcemaps.init())
           // .pipe(insert.prepend('"use strict";'))
            .pipe(ts(tsProject));

    return merge([
            tsResult.dts
               // .pipe(concat('index.d.ts'))
                .pipe(gulp.dest('dist')),
            tsResult.js
                //       .pipe(concat('index.js'))
                .pipe(sourcemaps.write('.', {includeContent:false, sourceRoot: rootDir + "/src"}))
                .pipe(gulp.dest('dist'))
        ]
    );
});

gulp.task('clean', function(done) { fse.remove('dist', done);});
