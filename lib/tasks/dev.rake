namespace :dev do
  desc "Reset users and bookshelves, then seed (keeps the master data)"
  task reset: :environment do
    abort "dev:reset is for development only" unless Rails.env.development?
    ActiveRecord::Base.connection.execute("TRUNCATE readings, books, sessions, users RESTART IDENTITY CASCADE")
    Rake::Task["db:seed"].invoke
  end
end
