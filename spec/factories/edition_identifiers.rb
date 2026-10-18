FactoryBot.define do
  factory :edition_identifier do
    edition
    scheme { "isbn13" }
    sequence(:value) do |n|
      base = format("978%09d", n)
      check = (10 - base.chars.each_with_index.sum { |c, i| c.to_i * (i.even? ? 1 : 3) } % 10) % 10
      "#{base}#{check}"
    end
  end
end
