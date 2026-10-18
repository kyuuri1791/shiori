require "rails_helper"

RSpec.describe ShelfPhotoScanCleanupJob do
  subject(:perform) { described_class.perform_now }

  let!(:fresh) { create(:shelf_photo_scan) }
  let!(:abandoned) { create(:shelf_photo_scan, created_at: 2.hours.ago) }
  let!(:expired) { create(:shelf_photo_scan, created_at: 31.days.ago) }

  it "1時間より前の写真を消し、処理中のまま残ったものは失敗にする" do
    perform
    expect([ fresh.reload.image.present?, abandoned.reload.image, abandoned.status ]).to eq [ true, nil, "failed" ]
  end

  it "保存期間を過ぎた記録を消す" do
    perform
    expect(ShelfPhotoScan.exists?(expired.id)).to be false
  end
end
