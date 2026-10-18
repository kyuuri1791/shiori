FactoryBot.define do
  factory :book do
    sequence(:title) { "テスト書籍 #{it}" }
  end
end
