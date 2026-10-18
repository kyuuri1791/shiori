FactoryBot.define do
  factory :edition do
    sequence(:title) { "テスト書籍 #{it}" }
  end
end
