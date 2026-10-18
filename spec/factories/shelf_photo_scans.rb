FactoryBot.define do
  factory :shelf_photo_scan do
    user
    image { "\x89PNG\r\n\x1A\n".b + "image".b }
    content_type { "image/png" }
  end
end
