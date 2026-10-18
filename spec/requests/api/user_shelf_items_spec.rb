require "rails_helper"

RSpec.describe "Api::UserShelfItems" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:user_shelf_item) { create(:user_shelf_item, user:, title: "火車") }

  before do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  describe "登録" do
    it "本を1冊登録する" do
      post api_user_shelf_items_path, params: { user_shelf_item: { title: "コンビニ人間", author: "村田沙耶香", status: "read" } }, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("user_shelf_item", "title")).to eq "コンビニ人間"
    end

    it "書名が長すぎれば理由を返す" do
      post api_user_shelf_items_path, params: { user_shelf_item: { title: "あ" * 501 } }, as: :json

      expect([ response.status, response.parsed_body["error"] ]).to eq [ 422, "タイトルは500文字以内で入力してください" ]
    end

    it "すでに本棚にある本は登録しない" do
      book = create(:book, title: "コンビニ人間")
      create(:user_shelf_item, user:, book:)

      post api_user_shelf_items_path, params: { user_shelf_item: { book_id: book.id } }, as: :json

      expect([ response.status, response.parsed_body["error"] ]).to eq [ 422, "すでに本棚にある本です" ]
    end

    it "削除した本と同じ本は、もう一度登録できる" do
      book = create(:book, title: "コンビニ人間")
      create(:user_shelf_item, user:, book:).discard!

      post api_user_shelf_items_path, params: { user_shelf_item: { book_id: book.id } }, as: :json

      expect(response).to have_http_status(:created)
    end
  end

  describe "更新" do
    it "自分の本を更新する" do
      patch api_user_shelf_item_path(user_shelf_item), params: { user_shelf_item: { rating: 5 } }, as: :json

      expect([ response.status, response.parsed_body.dig("user_shelf_item", "rating") ]).to eq [ 200, 5 ]
    end

    it "他の人の本は更新できない" do
      other = create(:user_shelf_item)

      patch api_user_shelf_item_path(other), params: { user_shelf_item: { rating: 5 } }, as: :json

      expect(response).to have_http_status(:not_found)
    end

    it "削除した本は更新できない" do
      user_shelf_item.discard!

      patch api_user_shelf_item_path(user_shelf_item), params: { user_shelf_item: { rating: 5 } }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "削除" do
    it "アプリからは見えなくなるが、監査のために行は残る" do
      delete api_user_shelf_item_path(user_shelf_item), as: :json

      expect(response).to have_http_status(:ok)
      expect(UserShelfItem.exists?(user_shelf_item.id)).to be false
      expect(UserShelfItem.with_discarded.find(user_shelf_item.id).discarded_at).to be_present
    end

    it "削除した本は一覧に出ない" do
      user_shelf_item.discard!

      get api_user_shelf_items_path, as: :json

      expect(response.parsed_body["user_shelf_items"]).to be_empty
    end
  end
end
