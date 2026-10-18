FactoryBot.define do
  factory :book do
    user
    sequence(:title) { "登録した本 #{it}" }
  end
end
