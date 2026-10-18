class User < ApplicationRecord
  has_secure_password
  has_many :books, dependent: :destroy
  has_many :ai_searches, dependent: :delete_all
  has_many :shelf_photo_scans, dependent: :delete_all

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  scope :with_shelf_summary, -> {
    select("users.id", "shelf.books_count", "shelf.last_added_at")
      .joins(<<~SQL.squish)
        CROSS JOIN LATERAL (
          SELECT count(*) AS books_count, max(books.created_at) AS last_added_at
          FROM books WHERE books.user_id = users.id AND books.discarded_at IS NULL
        ) shelf
      SQL
      .order(Arel.sql("shelf.last_added_at DESC NULLS LAST, users.id ASC"))
  }
end
