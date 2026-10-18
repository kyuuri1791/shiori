namespace :db do
  desc "Enable PostgreSQL extensions that db/Schemafile depends on"
  task extensions: :environment do
    ActiveRecord::Base.connection.enable_extension("pg_trgm")
  end
end
