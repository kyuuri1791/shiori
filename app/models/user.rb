class User < ApplicationRecord
  PASSWORD_MIN_LENGTH = 8

  has_secure_password
  has_many :user_shelf_items, dependent: :destroy
  has_many :ai_searches, dependent: :delete_all
  has_many :shelf_photo_scans, dependent: :delete_all

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :email_address, presence: true, uniqueness: true, length: { maximum: 255 }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: PASSWORD_MIN_LENGTH }, allow_nil: true

  scope :with_shelf_summary, -> {
    left_joins(:user_shelf_items).group(:id)
      .select(:id, "count(user_shelf_items.id) AS user_shelf_items_count", "max(user_shelf_items.created_at) AS last_added_at")
      .order(Arel.sql("max(user_shelf_items.created_at) DESC NULLS LAST"), :id)
  }

  def approved?
    approved_at.present?
  end

  def approve!
    update!(approved_at: Time.current) unless approved?
  end

  def revoke_approval!
    update!(approved_at: nil)
  end
end
