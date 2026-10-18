class ShelfPhotoScan < ApplicationRecord
  extend Enumerize

  MAX_IMAGE_BYTES = 5.megabytes
  DAILY_LIMIT_PER_USER = 30
  IMAGE_RETENTION = 1.hour
  RETENTION_PERIOD = 30.days
  SIGNATURES = {
    "image/jpeg" => ->(bytes) { bytes.start_with?("\xFF\xD8\xFF".b) },
    "image/png" => ->(bytes) { bytes.start_with?("\x89PNG\r\n\x1A\n".b) },
    "image/webp" => ->(bytes) { bytes.start_with?("RIFF".b) && bytes.byteslice(8, 4) == "WEBP".b }
  }.freeze

  enumerize :status, in: { pending: 1, succeeded: 2, failed: 3 }, default: :pending, predicates: { prefix: true }

  belongs_to :user

  validates :image, presence: true, on: :create
  validates :content_type, inclusion: { in: SIGNATURES.keys }, on: :create
  validate :image_size, on: :create

  scope :stale_images, -> { where.not(image: nil).where(created_at: ...IMAGE_RETENTION.ago) }
  scope :expired, -> { where(created_at: ...RETENTION_PERIOD.ago) }

  def self.detect_content_type(bytes)
    head = bytes.to_s.byteslice(0, 16).to_s.b
    SIGNATURES.find { |_, matches| matches.call(head) }&.first
  end

  private
    def image_size
      errors.add(:image, "は#{MAX_IMAGE_BYTES / 1.megabyte}MBまでです") if image.to_s.bytesize > MAX_IMAGE_BYTES
    end
end
