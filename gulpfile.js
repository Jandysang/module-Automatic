//严格模式
//去掉脚本验证的代码，后续维护
"use static";

var gulp = require("gulp");
var gulpLoadPlugins = require("gulp-load-plugins");
var del = require("del");
var browserSync = require("browser-sync");
var fs = require("fs");
var argv = require('yargs').argv;
/*var webpack = require('gulp-webpack');*/
var named = require('vinyl-named');
/*var rename = require("gulp-rename");*/


var $ = gulpLoadPlugins();
var reload = browserSync.reload;



function syncReadFile(filePath) {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return undefined;
    }
    return undefined;
}

var version = syncReadFile("VERSION.txt");
var config = syncReadFile("config.json");
var develop = syncReadFile("DEVELOP.txt");



function trim(str) { //清楚空格、回车、分行、制表符
    var pattern = new RegExp("\\s*|\t|\r|\n", "gi");
    return str.replace(pattern, "");
}

config = config ? JSON.parse(config) : config;
develop = develop && develop.length ? trim(develop) : develop
develop = develop && develop.length ? develop : develop;

function getFileArr(_develop, _type) { //获取需要编辑的文件（主要是scss和js文件）
    var arr = [];
    _type = _type === "js" || _type === "scss" ? _type : "js"; //默认js
    if (_develop === undefined) _develop = develop;
    if (_develop) {
        for (var i = 0; i < config.projectList.length; i++) {
            if (config.projectList[i] == _develop)
                arr.push("app/js/" + _develop + "/" + _develop + "." + _type);
        }
    }
    if (!arr.length) {
        for (var i = 0; i < config.projectList.length; i++) {
            arr.push("app/js/" + config.projectList[i] + "/" + config.projectList[i] + "." + _type);
        }
    }
    return arr;
}


function _compileJS(_develop) {
    return gulp.src(getFileArr(_develop, "js"))
        .pipe($.plumber())
        .pipe(named())
        .pipe($.webpack())
        .pipe(gulp.dest("build_artifacts/build/" + config.deployProjectDirName + "/" + version))
        .pipe(gulp.dest("dist/js"))
        .pipe(gulp.dest(".temp/js"));
}

gulp.task("compileJS", function() {
    return _compileJS.call(this, argv.develop);
});
gulp.task("buildJS", ["clean", 'compileJS'], function() {
    return gulp.src(".temp/js/*.js")
        .pipe($.plumber())
        .pipe($.babel())
        .pipe($.uglify())
        .pipe($.sourcemaps.init())
        
        .pipe($.sourcemaps.write('.'))
        .pipe($.rename(function(path) {
            if (path.extname != ".map") {
                path.extname = ".min.js";
            }
        }))
        .pipe(gulp.dest("build_artifacts/build/" + config.deployProjectDirName + "/" + version))
        .pipe(gulp.dest("dist/js"));

})




function _compileCSS(_develop){
    
}




gulp.task("clean", del.bind(null, ["build_artifacts", "dist", '.temp']));



gulp.task('build', ["html", "images"], function() {
    return gulp.src("dist/**/*").pipe($.size({ title: "build", gzip: true }));
});

gulp.task("images", function() {
    return gulp.src("app/images/**/*")
        .pipe($.if($.if.isFile, $.cache($.imagemin({
                progressive: true,
                interlaced: true,
                svgoPlugins: [{ cleanupIDs: false }]
            }))
            .on('error', function(err) {
                console.log(err);
                this.end();
            })))
        .pipe(gulp.dest('dist/images'));
});

gulp.task("html", ["styles", "scripts"], function() {
    return gulp.src("app/pages/*.html")
        .pipe($.useref({ searchPath: ['.tmp', 'app', '.'] }))
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', $.cssnano()))
        .pipe($.if('*.scss', $.sass.sync({
            outputStyle: 'expanded',
            precision: 10,
            includePaths: ['.']
        }).on('error', $.sass.logError)))
        .pipe($.if('*.html', $.htmlmin({ collapseWhitespace: true })))
        .pipe(gulp.dest('dist'));
});


gulp.task('styles', function() {
    return gulp.src('app/scss/**/*.scss')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sass.sync({
            outputStyle: 'expanded',
            precision: 10,
            includePaths: ['.']
        }).on('error', $.sass.logError))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('dist/styles'))
        .pipe(gulp.dest('app/css'))
        .pipe(reload({ stream: true }));
});



gulp.task('scripts', function() {
    return gulp.src('app/js/**/*.js')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.babel())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('dist/scripts'))
        .pipe(reload({ stream: true }));
});


gulp.task("serve", ["styles", 'scripts'], function() {
    browserSync({
        notify: false,
        port: 9000,
        ui: false,
        server: {
            baseDir: ['dist']
        }
    });
    gulp.watch('app/scss/**/*.scss', ['styles']);
    gulp.watch('app/js/**/*.js', ['scripts']);
    gulp.watch([
        'app/pages/*.html',
        'app/js/**/*.js',
        'app/scss/**/*.scss',
        'app/images/**/*'
    ]).on('change', reload);
});
