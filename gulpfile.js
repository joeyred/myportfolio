var gulp        = require('gulp');
var $           = require('gulp-load-plugins')({
  rename: {
    'gulp-merge-media-queries': 'mmq'
  }
});
var	browserSync = require('browser-sync').create();
var	sequence    = require('run-sequence');
var	del         = require('del');
var yargs       = require('yargs');

// Project Config
var DEPLOY = !!(yargs.argv.production);

var COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

var PATH = {
  // Source Files
  src: {
    imgs: '_src/imgs',
    scss: [
      '_src/scss',
      '_src/scss/components'
    ],
    js: '_src/js/*.js',
  },
  // Files ready for Jekyll build
  dist: {
    imgs: './assets/imgs',
    fonts: './assets/fonts',
    icons: './assets/icons',
    css: './css',
    js: './js'
  }
}

/* browserSync */
gulp.task('browserSync', function() {
	return browserSync.init({
    server: '_site',
    port:   8000,
    notify: false, // boolean value, Toggle notifications of bsync activity
    open:   false // toggle auotmatic opening of webpage upong bsync starting
    });
});

/* Clean */
gulp.task('clean', function() {
  return del(['./assets', './css', './js' ]);
});

/* Images */
gulp.task('images', function() {
  return gulp.src(PATH.src.imgs + '/**/*')
  .pipe($.if(DEPLOY, $.imagemin({
    optimizationLevel: 7,
		progressive: true,
		interlaced: true,
		multipass: true
  })))
  .pipe(gulp.dest(PATH.dist.imgs));
});

/* Compile SCSS */
gulp.task('scss', function() {
	return gulp.src(PATH.src.scss[0] + '/main.scss')
		.pipe($.sourcemaps.init())
		.pipe($.sass({
			includePaths: PATH.src.scss
		})
			.on('error', $.sass.logError)
		)
		.pipe($.mmq({
			log: true
		}))
		.pipe($.autoprefixer({
			browsers: COMPATIBILITY
		}))
    .pipe($.if(DEPLOY, $.cssnano()))
		.pipe($.sourcemaps.write('./'))
		.pipe(gulp.dest(PATH.dist.css))
		.pipe(browserSync.stream({ // Inject Styles
			match: '**/*.css' // Force source map exclusion *This fixes reloading issue on each file change*
		}));
});

/* Concatinate Main JS Files */
gulp.task('scripts', function() {
	return gulp.src(PATH.src.js)
	.pipe($.sourcemaps.init())
	.pipe($.concat('main.js'))
  .pipe($.if(DEPLOY, $.uglify()))
	.pipe($.sourcemaps.write('./'))
	.pipe(gulp.dest(PATH.dist.js));
});

/**
 * Jekyll Task
 */
// Credit to Benoît Boucart for this task. https://aaronlasseigne.com/2016/02/03/using-gulp-with-jekyll/
gulp.task('jekyll', function (gulpCallBack){
    var spawn = require('child_process').spawn;
    // After build: cleanup HTML
    var jekyll = spawn('jekyll', ['build'], {stdio: 'inherit'});

    jekyll.on('exit', function(code) {
        gulpCallBack(code === 0 ? null : 'ERROR: Jekyll process exited with code: '+code);
    });
});

/**
 * Reloading Tasks
 */

// BrowserSync
gulp.task('browserSyncReload', function(done) {
  browserSync.reload();
  done();
});
// SCSS
gulp.task('scssReload', function(cb) {
  sequence(
    'scss',
    'jekyll',
    cb
  );
});

// JavaScript
gulp.task('scriptsReload', function(cb) {
  sequence(
    'scripts',
    'jekyll',
    'browserSyncReload',
    cb
  );
});

// Images
gulp.task('imageReload', function(cb) {
  sequence(
    'images',
    'jekyll',
    'browserSyncReload',
    cb
  );
});

// Jekyll
gulp.task('jekyllReload', function(cb) {
  sequence(
    'jekyll',
    'browserSyncReload',
    cb
  );
});

/**
 * Watch Task
 */
gulp.task('watch', function() {
  // Watch SCSS
  gulp.watch(PATH.src.scss + '/**/*.scss', ['scss']);
  // Watch JS
  gulp.watch(PATH.src.js + '/**/*.js', ['scriptsReload']);
  // Watch HTML
  gulp.watch(['_includes/*', '_layouts/*', '_posts/*'], ['jekyllReload']);
  // Watch Images
  gulp.watch(PATH.src.imgs + '/**/*', ['imagesReload']);

});

gulp.task('default', function(cb) {
  sequence(
    'clean',
    ['scss', 'scripts', 'images'],
    'jekyll',
    'browserSync',
    'watch',
    cb
  );
});
