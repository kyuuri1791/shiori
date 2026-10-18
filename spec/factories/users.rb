FactoryBot.define do
  factory :user do
    sequence(:email_address) { "user#{it}@example.com" }
    password { "password-for-test" }
  end
end
