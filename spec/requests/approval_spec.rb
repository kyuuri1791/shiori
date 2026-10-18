require "rails_helper"

RSpec.describe "承認" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:png) { Rack::Test::UploadedFile.new(StringIO.new("\x89PNG\r\n\x1A\nimage".b), "image/png", true, original_filename: "shelf.png") }

  before do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  context "承認されていないとき" do
    it "AI 検索と写真の読み取りは使えない" do
      expect { post api_ai_searches_path, params: { q: "このすばの最新刊" } }.not_to have_enqueued_job
      expect(response).to have_http_status(:forbidden)

      expect { post api_shelf_photo_scans_path, params: { image: png } }.not_to have_enqueued_job
      expect(response).to have_http_status(:forbidden)
    end

    it "まとめて登録のページは開けず、本棚に戻る" do
      get new_bulk_imports_photo_path
      expect(response).to redirect_to(root_path)

      get new_bulk_imports_series_path
      expect(response).to redirect_to(root_path)
    end

    it "AI を使わない機能は使える" do
      post api_user_shelf_items_path, params: { user_shelf_item: { title: "手で登録した本" } }, as: :json
      expect(response).to have_http_status(:created)
    end
  end

  context "承認されたとき" do
    before { user.approve! }

    it "AI 検索を使える" do
      expect { post api_ai_searches_path, params: { q: "このすばの最新刊" } }.to have_enqueued_job(AiSearchJob)
      expect(response).to have_http_status(:accepted)
    end
  end
end
