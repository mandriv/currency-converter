import gulp from 'gulp';
import sourcemaps from 'gulp-sourcemaps';
import watchify from 'watchify';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import connect from 'gulp-connect';
import concat from 'gulp-concat';
import sass from 'gulp-sass';
import del from 'del';
import babel from 'gulp-babel';
import htmlmin from 'gulp-htmlmin';
import uglify from 'gulp-uglify';
import critical from 'critical';
import autoprefixer from 'gulp-autoprefixer';
import csso from 'gulp-csso';

// Serve tasks - dev

const bundlerCfg = {
  entries: 'src/index.js',
  debug: true,
};
const bundler = watchify(browserify(bundlerCfg).transform(babelify));
const dirs = {
  tmp: 'tmp',
  dist: 'dist',
};

gulp.task('clean', () => (
  del(`${dirs.tmp}/**/*.*`)
));

gulp.task('connect', () => {
  connect.server({
    root: dirs.tmp,
    livereload: true,
    port: 3000,
  });
  connect.reload();
});

gulp.task('html', () => (
  gulp.src('./src/**/*.html')
    .pipe(gulp.dest(dirs.tmp))
    .pipe(connect.reload())
));

gulp.task('scripts', () => (
  bundler
    .bundle()
    .pipe(source('scripts.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(dirs.tmp))
    .pipe(connect.reload())
));

gulp.task('worker', () => {
  gulp.src('src/scripts/util/worker.js')
    .pipe(babel())
    .pipe(gulp.dest(dirs.tmp))
    .pipe(connect.reload());
  gulp.src('src/scripts/util/cache-polyfill.js')
    .pipe(gulp.dest(dirs.tmp))
    .pipe(connect.reload());
});

gulp.task('assets', () => {
  gulp.src('./assets/*.*', { base: './' })
    .pipe(gulp.dest(dirs.dist));
  gulp.src('src/sass/flag-icon/flags/**/*.*', { base: './src/sass/flag-icon' })
    .pipe(gulp.dest(dirs.tmp));
});

gulp.task('sass', () => (
  gulp.src('src/sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('styles.css'))
    .pipe(gulp.dest(dirs.tmp))
    .pipe(connect.reload())
));

gulp.task('watch', () => {
  gulp.watch(['src/**/*.html'], ['html']);
  gulp.watch(['src/**/*.js'], ['scripts']);
  gulp.watch(['src/scripts/util/worker.js', 'src/scripts/util/cache-polyfill.js'], ['worker']);
  gulp.watch(['src/**/*.scss'], ['sass']);
});

// Build task - gulp build

// 1. rm -rf ./dist
gulp.task('clean:build', () => (
  del([`${dirs.dist}/**`, `!${dirs.dist}`])
));

// 2. minify html
gulp.task('html:build', () => (
  gulp.src('./src/**/*.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      minifyURLs: true,
      removeComments: true,
      removeRedundantAttributes: true,
    }))
    .on('error', err => console.error(err))
    .pipe(gulp.dest(dirs.dist))
));

// 3. bundle and uglify js
gulp.task('scripts:build', () => (
  bundler
    .bundle()
    .pipe(source('scripts.js'))
    .pipe(buffer())
    .pipe(uglify())
    .on('error', err => console.error(err))
    .pipe(gulp.dest(dirs.dist))
));

// 4. copy and transpile worker files
gulp.task('worker:build', () => {
  gulp.src('src/scripts/util/worker.js')
    .pipe(babel())
    .pipe(uglify())
    .on('error', err => console.error(err))
    .pipe(gulp.dest(dirs.dist));
  gulp.src('src/scripts/util/cache-polyfill.js')
    .pipe(uglify())
    .pipe(gulp.dest(dirs.dist));
});

// 5. copy assets
gulp.task('assets:build', () => {
  gulp.src('src/sass/flag-icon/flags/**/*.*', { base: './src/sass/flag-icon' })
    .pipe(gulp.dest(dirs.dist));
  gulp.src('./assets/*.*', { base: './' })
    .pipe(gulp.dest(dirs.dist));
});

// 6. Compile sass to css
gulp.task('sass:build', () => (
  gulp.src('src/sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('styles.css'))
    .pipe(autoprefixer({
      browsers: '> 5%',
      grid: true,
    }))
    .pipe(csso({ sourceMap: false }))
    .on('error', err => console.error(err))
    .pipe(gulp.dest(dirs.dist))
    .pipe(connect.reload())
));

// 7. Inline critial styles
gulp.task('critical', () => {
  critical.generate({
    inline: true,
    base: 'dist/',
    src: 'index.html',
    dest: 'dist/index.html',
    css: ['dist/styles.css'],
    width: 1300,
    height: 900,
    minify: true,
    extract: true,
  });
});

gulp.task('test-build', () => {
  connect.server({
    root: dirs.dist,
    livereload: false,
    port: 3000,
  }).on('error', err => console.error(err));

  connect.reload();
});

// The good stuff
gulp.task('serve', ['clean', 'html', 'scripts', 'worker', 'assets', 'sass', 'connect', 'watch']);
gulp.task('build', ['clean:build', 'html:build', 'scripts:build', 'worker:build', 'assets:build', 'sass:build', 'critical']);
gulp.task('default', ['serve']);
