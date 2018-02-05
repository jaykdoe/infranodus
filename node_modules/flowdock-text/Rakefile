require 'rubygems'
require 'yaml'
require 'json'

namespace :test do
  desc "Prepare JS conformance test suite"
  task :prepare do
    test_files = ['autolink', 'extract', 'validate']
    r = {}

    f = File.open(File.join(File.dirname(__FILE__), "test", "conformance.js"), "w")
    f.write("var cases = {};")

    test_files.each do |test_file|
      path = File.join(File.dirname(__FILE__), "test", "conformance_tests", test_file + ".yml")
      yml = YAML.load_file(path)
      f.write("cases.#{test_file} = #{yml['tests'].to_json};")
    end
    f.write("if (typeof module != 'undefined' && module.exports){module.exports = cases;}");
    f.close
  end

  desc "Run test suite"
  task :run do
    exec('open test/mocha.html')
  end
  desc "Run test suite with node"
  task :run_node do
    exec('node_modules/.bin/mocha run-tests.js')
  end
end

desc "Run test suite"
task :test => ['test:prepare', 'test:run']

desc "Run test suite with node"
task :test_node => ['test:prepare', 'test:run_node']
