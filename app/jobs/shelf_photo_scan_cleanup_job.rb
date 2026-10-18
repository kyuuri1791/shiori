class ShelfPhotoScanCleanupJob < ApplicationJob
  queue_as :default

  def perform
    ShelfPhotoScan.stale_images.where(status: :pending).update_all(status: ShelfPhotoScan.status.find_value(:failed).value, error_message: "expired", image: nil, updated_at: Time.current)
    ShelfPhotoScan.stale_images.update_all(image: nil, updated_at: Time.current)
    ShelfPhotoScan.expired.in_batches(of: 1000).delete_all
  end
end
