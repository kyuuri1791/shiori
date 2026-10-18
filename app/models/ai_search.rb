class AiSearch < ApplicationRecord
  extend Enumerize

  MAX_QUERY_LENGTH = 100
  DAILY_LIMIT_PER_USER = 100
  INTERPRETATION_REUSE_PERIOD = 1.day
  RETENTION_PERIOD = 30.days

  enumerize :status, in: { pending: 1, succeeded: 2, failed: 3 }, default: :pending, predicates: { prefix: true }

  belongs_to :user

  normalizes :query, with: ->(v) { v.to_s.unicode_normalize(:nfkc).squish }

  validates :query, presence: true, length: { maximum: MAX_QUERY_LENGTH }

  scope :expired, -> { where(created_at: ...RETENTION_PERIOD.ago) }

  def self.reusable_interpretation(query)
    where(status: :succeeded, query:, interpreter_version: BookQueryInterpreter::VERSION, created_at: INTERPRETATION_REUSE_PERIOD.ago..)
      .where.not(interpretation: nil)
      .order(created_at: :desc)
      .pick(:interpretation)
  end

  def editions
    Edition.preload(:identifiers).where(id: edition_ids).index_by(&:id).values_at(*edition_ids).compact
  end
end
