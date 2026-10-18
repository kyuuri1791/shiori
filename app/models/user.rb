class User < ApplicationRecord
  has_secure_password
  has_many :books, dependent: :destroy
  has_many :ai_searches, dependent: :delete_all
  has_many :shelf_photo_scans, dependent: :delete_all

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  scope :with_shelf_summary, -> {
    left_joins(:books).group(:id)
      .select(:id, "count(books.id) AS books_count", "max(books.created_at) AS last_added_at")
      .order(Arel.sql("max(books.created_at) DESC NULLS LAST"), :id)
  }
end
