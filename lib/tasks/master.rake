namespace :master do
  desc "Harvest every book from openBD into tmp/openbd (resumable, about 1 request per second)"
  task harvest: :environment do
    result = OpenBdHarvester.new(dir: Rails.root.join("tmp/openbd")).run
    puts "#{result[:count]} books -> #{result[:path]} (sha256 #{result[:sha256]})"
  end

  desc "Load the pinned master dataset (config/master_data.yml), or another file: master:load[path]"
  task :load, [ :path ] => :environment do |_, args|
    loader = args[:path] ? MasterLoader.new(path: args[:path]) : MasterLoader.from_config
    loader.run
  end
end
