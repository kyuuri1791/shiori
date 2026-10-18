module Api
  class ShelfPhotoScansController < ApplicationController
    require_approval

    rate_limit to: 3, within: 1.minute, only: :create, with: -> { render_error("写真の読み取りが多すぎます。少し待ってからもう一度お試しください", :too_many_requests) }

    def create
      image = params[:image]
      if current_user.shelf_photo_scans.where(created_at: Time.current.all_day).count >= ShelfPhotoScan::DAILY_LIMIT_PER_USER
        return render_error("今日の写真の読み取りの上限（#{ShelfPhotoScan::DAILY_LIMIT_PER_USER}回）に達しました", :too_many_requests)
      end

      return render_error("写真を選んでください", :bad_request) unless image.respond_to?(:read)
      return render_error("写真は#{ShelfPhotoScan::MAX_IMAGE_BYTES / 1.megabyte}MBまでです", :content_too_large) if image.size > ShelfPhotoScan::MAX_IMAGE_BYTES

      bytes = image.read
      content_type = ShelfPhotoScan.detect_content_type(bytes)
      return render_error("JPEG・PNG・WebP の写真を選んでください", :unsupported_media_type) unless content_type

      scan = current_user.shelf_photo_scans.create!(image: bytes, content_type:)
      ShelfPhotoScanJob.perform_later(scan.id)
      render json: scan_json(scan), status: :accepted
    end

    def show
      render json: scan_json(current_user.shelf_photo_scans.find(params[:id]))
    end

    private
      def scan_json(scan)
        {
          id: scan.id,
          status: scan.status,
          books: scan.status_succeeded? ? scan.books : [],
          error: scan.status_failed? ? "写真を読み取れませんでした" : nil
        }
      end
  end
end
