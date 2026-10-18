FactoryBot.define do
  factory :user do
    sequence(:email_address) { "user#{it}@example.com" }
    password { "password-for-test" }

    trait :approved do
      approved_at { Time.current }
    end

    trait :admin do
      admin { true }
    end
  end
end
