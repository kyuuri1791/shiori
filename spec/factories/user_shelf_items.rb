FactoryBot.define do
  factory :user_shelf_item do
    user
    sequence(:title) { "登録した本 #{it}" }
  end
end
