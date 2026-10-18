class UserShelfItem < ApplicationRecord
  include SoftDeletable
  extend Enumerize

  enumerize :status, in: { want: 1, reading: 2, read: 3 }, default: :want, predicates: { prefix: true }

  belongs_to :user
  belongs_to :book, optional: true
  has_many :readings, -> { order(:finished_on) }, dependent: :delete_all

  normalizes :title, :author, with: ->(v) { v.to_s.strip }
  normalizes :isbn13, with: ->(v) { Isbn.parse(v)&.to_s }
  normalizes :tags, with: ->(tags) { Array(tags).map { it.to_s.strip.delete_prefix("#").delete_prefix("＃") }.reject(&:blank?).uniq }

  scope :tagged, ->(tag) { where("user_shelf_items.tags @> ARRAY[?]::varchar[]", tag) }
  scope :matching_text, ->(text) {
    where(<<~SQL.squish, like: "%#{sanitize_sql_like(text)}%")
      user_shelf_items.title ILIKE :like OR user_shelf_items.author ILIKE :like OR user_shelf_items.review ILIKE :like OR user_shelf_items.isbn13 ILIKE :like
      OR array_to_string(user_shelf_items.tags, ' ') ILIKE :like OR user_shelf_items.notes::text ILIKE :like
    SQL
  }

  before_validation :copy_from_book
  validates :title, presence: true, length: { maximum: 500 }
  validate :not_on_shelf_yet
  validates :author, length: { maximum: 500 }
  validates :rating, inclusion: { in: 0..5 }
  validate :notes_shape
  validate :reading_dates_format
  after_save :sync_readings

  def reading_dates=(values)
    @invalid_reading_dates = false
    @pending_reading_dates = Array(values).map { Date.iso8601(it.to_s) }
  rescue Date::Error
    @invalid_reading_dates = true
  end

  def reading_dates
    readings.map { it.finished_on.iso8601 }
  end

  def as_card_json
    {
      id:, book_id:, isbn13:, title:, author:, status:, rating:, tags:, review:, notes:, reading_dates:,
      book: book&.as_card_json,
      discarded: discarded?,
      created_at: (created_at.to_f * 1000).to_i
    }
  end

  private
    def copy_from_book
      if book
        self.title = book.title if title.blank?
        self.author = book.author_line if author.blank?
        self.isbn13 ||= book.isbn13
      elsif title.blank? && isbn13.present?
        self.title = "ISBN #{isbn13}"
      end
    end

    def sync_readings
      if @pending_reading_dates
        readings.delete_all
        @pending_reading_dates.sort.each { readings.create!(finished_on: it) }
        @pending_reading_dates = nil
      elsif saved_change_to_status? && status_read? && readings.none?
        readings.create!(finished_on: Date.current)
      else
        return
      end
      readings.reset
      update_column(:last_read_on, readings.maximum(:finished_on))
    end

    def not_on_shelf_yet
      return unless user && (book_id || isbn13)

      others = user.user_shelf_items.where.not(id:)
      duplicated = (book_id && others.exists?(book_id:)) || (isbn13 && others.exists?(isbn13:))
      errors.add(:base, "すでに本棚にある本です") if duplicated
    end

    def notes_shape
      ok = notes.is_a?(Array) && notes.all? { it.is_a?(Hash) && it["text"].is_a?(String) && it["t"].is_a?(Integer) }
      errors.add(:notes, "の形式が正しくありません") unless ok
    end

    def reading_dates_format
      errors.add(:reading_dates, "の日付が正しくありません") if @invalid_reading_dates
    end
end
