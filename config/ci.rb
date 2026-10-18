CI.run do
  step "DB: Test reset", "env RAILS_ENV=test bin/rails db:drop:primary db:create:primary db:extensions"
  step "DB: Test schema", "bundle exec ridgepole -c config/database.yml -E test -s primary -f db/Schemafile --apply"
  step "DB: Test queue schema", "env RAILS_ENV=test bin/rails db:schema:load:queue"

  step "Style: Ruby", "bin/rubocop"
  step "Types: TypeScript", "pnpm typecheck"

  step "Security: Gem audit", "bin/bundler-audit"
  step "Security: Brakeman code analysis", "bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error"

  step "Tests: RSpec", "env RAILS_ENV=test bundle exec rspec"
end
