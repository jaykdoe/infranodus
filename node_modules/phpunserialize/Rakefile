require 'jasmine-headless-webkit'
require 'jslint/tasks'

JSLint.config_path = ".jslint"

Jasmine::Headless::Task.new('jasmine:headless') do |t|
  t.colors = true
  t.keep_on_error = true
  t.jasmine_config = 'spec/support/jasmine.yml'
end

task :test => [ 'jslint', 'jasmine:headless' ]
task :default => :test
