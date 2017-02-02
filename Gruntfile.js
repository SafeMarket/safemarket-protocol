const glob = require('glob-fs')()
const solc = require('solc')

module.exports = function gruntfile(grunt) {
  grunt.loadNpmTasks('grunt-solc')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-mocha-test')
  grunt.loadNpmTasks('grunt-contrib-clean')

  grunt.initConfig({
    watch: {
      contracts: {
        files: ['contracts/*'],
        tasks: ['build', 'mochaTest']
      },
      tests: {
        files: ['test/*'],
        tasks: ['mochaTest']
      }
    },
    clean: {
      generated: ['generated/*']
    },
    solc: {
      default: {
        options: {
          files: ['contracts/*'],
          solc: solc,
          output: 'generated/contracts.json',
          doOptimize: true
        }
      }
    },
    mochaTest: {
      test: {
        src: ['test/**/*.js']
      },
      options: {
        bail: true,
        noFail: true,
        timeout: 10000,
        require: './modules/chai'
      }
    }
  })

  grunt.registerTask('build', [
    'clean',
    'solc'
  ])

  grunt.registerTask('init', [
    'build',
    'mochaTest',
    'watch'
  ])
}
