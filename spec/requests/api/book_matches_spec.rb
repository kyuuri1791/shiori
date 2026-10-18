require "rails_helper"

RSpec.describe "Api::BookMatches" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:kasha) { create(:book, title: "火車", authors: [ "宮部みゆき" ]) }

  context "ログインしているとき" do
    before do
      post session_path, params: { email_address: user.email_address, password: "password-for-test" }
    end

    it "行ごとに候補を返す" do
      post api_book_matches_path, params: { items: [ { title: "火車", author: "宮部みゆき" }, { title: "誰も知らない同人誌" } ] }, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["matches"].map { |m| m["candidates"].map { it["title"] } }).to eq [ [ "火車" ], [] ]
    end

    it "items がなければ 400 を返す" do
      post api_book_matches_path, params: {}, as: :json

      expect(response).to have_http_status(:bad_request)
    end

    it "上限を超える件数は受け付けない" do
      post api_book_matches_path, params: { items: Array.new(BookMatcher::MAX_ITEMS + 1) { { title: "火車" } } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  context "ログインしていないとき" do
    it "401 を返す" do
      post api_book_matches_path, params: { items: [ { title: "火車" } ] }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
