class BookIdentifier < ApplicationRecord
  belongs_to :book

  normalizes :scheme, with: ->(v) { v.to_s.strip }
  normalizes :value, with: ->(v) { v.to_s.strip }

  validates :scheme, :value, presence: true
  validates :value, uniqueness: { scope: :scheme }
  validate :isbn13_format, if: -> { scheme == "isbn13" }

  private
    def isbn13_format
      errors.add(:value, "がISBN-13として正しくありません") unless Isbn.parse(value)&.to_s == value
    end
end
