require "rails_helper"

RSpec.describe "Api::ShelfPhotoScans" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:png) { Rack::Test::UploadedFile.new(StringIO.new("\x89PNG\r\n\x1A\nimage".b), "image/png", true, original_filename: "shelf.png") }
  let!(:svg) { Rack::Test::UploadedFile.new(StringIO.new("<svg></svg>"), "image/png", false, original_filename: "shelf.png") }

  before do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  it "写真を受け付けて、読み取りのジョブに回す" do
    expect { post api_shelf_photo_scans_path, params: { image: png } }.to have_enqueued_job(ShelfPhotoScanJob)
    expect(response).to have_http_status(:accepted)
  end

  it "中身が写真でないファイルは受け付けない" do
    post api_shelf_photo_scans_path, params: { image: svg }
    expect(response).to have_http_status(:unsupported_media_type)
  end

  it "他の人の読み取り結果は見られない" do
    other = create(:shelf_photo_scan)
    get api_shelf_photo_scan_path(other)
    expect(response).to have_http_status(:not_found)
  end
end
