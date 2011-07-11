require 'yaml'
require 'fileutils'
require 'uglifier'

namespace :build do
  
  task :all do
    
    sources  = []
    minified = []
    
    outputs  = [compile_core, compile_forms, compile_edit].each do |paths|
      sources << File.read(paths.first).to_s
      minified << File.read(paths.last).to_s
    end

    File.open("#{build_path}/motr-#{variables['@VERSION']}.js", 'w') do |file|
      file.write( sources.join("\n\n") )
    end
    
    File.open("#{build_path}/motr-#{variables['@VERSION']}.min.js", 'w') do |file|
      file.write( minified.join("\n\n") )
    end
    
  end
  
end

def variables
  { "@YEAR"        => Date.today.year.to_s,
    "@VERSION"     => "0.0.1",
    "@TIMESTAMP"   => Date.today.strftime("%B %d, %Y")
  }
end

def root_path
  @root_path ||= File.expand_path('../src', __FILE__)
end

def build_path
  @build_path ||= File.expand_path('../build', __FILE__)
end

def copyright
  @copyright ||= File.read("#{@root_path}/copyright.txt").to_s
end

def compile_forms
  write_stream(".forms-", merge_files(Dir["#{root_path}/forms/*.js"]), "Forms", "Form validation and HTML5 compatability.")
end

def compile_core
  stream = File.read("#{root_path}/core.js").to_s
  write_stream(".core-", stream, "Core", "motr core functionality")
end

def compile_edit
  files = ['xhtml.js','rangy.js','edit.js','commands.js'].inject([]) do |array, path|
    array << "#{root_path}/edit/#{path}"
    array
  end
  write_stream(".edit-", merge_files(files), "Edit", "Text editing using contenteditable")  
end

def filename(file, version, minified = false)
  min = minified ? '.min' : ''
  "#{build_path}/motr#{file}#{version}#{min}.js"
end

def merge_files(files)
  stream = []
  files.each do |file|
    stream << File.read(file).to_s.strip
  end
  stream.join("\n\n").strip
end

def write_stream(file, stream, name, desc)
  
  mangles  = variables.merge("@PACKAGE" => name, "@DESCRIPTION" => desc)
  append   = copyright.dup.gsub(/(@[A-Z]+)/i){ |match| mangles[match] }    
  stream   = stream.gsub(/(@[A-Z]+)/i){ |match| mangles[match] }
  version  = mangles['@VERSION']
  minified = Uglifier.compile(stream, :max_line_length => 500, :squeeze => true, :copyright => false)
  
  File.open(filename(file, version), 'w') do |file|
    file.puts(append)
    file.puts("\n\n")
    file.puts(stream)
  end
  
  File.open(filename(file, version, true), 'w') do |file|
    file.puts(append)
    file.puts("\n\n")
    file.puts(minified)
  end
  
  [filename(file, version), filename(file, version, true)]
end