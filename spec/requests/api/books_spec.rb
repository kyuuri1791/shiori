require "rails_helper"

RSpec.describe "Api::Books" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:book) { create(:book, user:, title: "火車") }

  before do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  describe "登録" do
    it "本を1冊登録する" do
      post api_books_path, params: { book: { title: "コンビニ人間", author: "村田沙耶香", status: "read" } }, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("book", "title")).to eq "コンビニ人間"
    end

    it "書名が長すぎれば理由を返す" do
      post api_books_path, params: { book: { title: "あ" * 501 } }, as: :json

      expect([ response.status, response.parsed_body["error"] ]).to eq [ 422, "タイトルは500文字以内で入力してください" ]
    end

    it "すでに本棚にある本は登録しない" do
      edition = create(:edition, title: "コンビニ人間")
      create(:book, user:, edition:)

      post api_books_path, params: { book: { edition_id: edition.id } }, as: :json

      expect([ response.status, response.parsed_body["error"] ]).to eq [ 422, "すでに本棚にある本です" ]
    end

    it "削除した本と同じ本は、もう一度登録できる" do
      edition = create(:edition, title: "コンビニ人間")
      create(:book, user:, edition:).discard!

      post api_books_path, params: { book: { edition_id: edition.id } }, as: :json

      expect(response).to have_http_status(:created)
    end
  end

  describe "更新" do
    it "自分の本を更新する" do
      patch api_book_path(book), params: { book: { rating: 5 } }, as: :json

      expect([ response.status, response.parsed_body.dig("book", "rating") ]).to eq [ 200, 5 ]
    end

    it "他の人の本は更新できない" do
      other = create(:book)

      patch api_book_path(other), params: { book: { rating: 5 } }, as: :json

      expect(response).to have_http_status(:not_found)
    end

    it "削除した本は更新できない" do
      book.discard!

      patch api_book_path(book), params: { book: { rating: 5 } }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "削除" do
    it "アプリからは見えなくなるが、監査のために行は残る" do
      delete api_book_path(book), as: :json

      expect(response).to have_http_status(:ok)
      expect(Book.exists?(book.id)).to be false
      expect(Book.with_discarded.find(book.id).discarded_at).to be_present
    end

    it "削除した本は一覧に出ない" do
      book.discard!

      get api_books_path, as: :json

      expect(response.parsed_body["books"]).to be_empty
    end
  end
end
