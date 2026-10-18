class User < ApplicationRecord
  has_secure_password
  has_many :user_shelf_items, dependent: :destroy
  has_many :ai_searches, dependent: :delete_all
  has_many :shelf_photo_scans, dependent: :delete_all

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  scope :with_shelf_summary, -> {
    left_joins(:user_shelf_items).group(:id)
      .select(:id, "count(user_shelf_items.id) AS user_shelf_items_count", "max(user_shelf_items.created_at) AS last_added_at")
      .order(Arel.sql("max(user_shelf_items.created_at) DESC NULLS LAST"), :id)
  }
end
