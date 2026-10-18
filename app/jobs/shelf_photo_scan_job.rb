class ShelfPhotoScanJob < ApplicationJob
  queue_as :default
  discard_on ActiveRecord::RecordNotFound

  def perform(scan_id)
    scan = ShelfPhotoScan.find(scan_id)
    return unless scan.status_pending? && scan.image

    result = ShelfPhotoReader.new.call(scan.image, scan.content_type)
    scan.update!(status: :succeeded, books: result.books, image: nil, input_tokens: result.input_tokens, output_tokens: result.output_tokens)
  rescue ShelfPhotoReader::Error, Anthropic::Errors::APIError => e
    Rails.logger.warn("[ShelfPhotoScanJob] #{scan_id} failed: #{e.class}: #{e.message}")
    scan&.update!(status: :failed, image: nil, error_message: e.class.name.first(255))
  rescue StandardError => e
    scan&.update!(status: :failed, image: nil, error_message: e.class.name.first(255))
    Rails.error.report(e, context: { shelf_photo_scan_id: scan_id })
  end
end
