require "rails_helper"

RSpec.describe "Api::Books" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:book) { create(:book, user:, title: "火車") }

  before do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  describe "削除" do
    it "アプリからは見えなくなるが、監査のために行は残る" do
      post batch_api_books_path, params: { ops: [ { op: "destroy", id: book.id } ] }, as: :json

      expect(response).to have_http_status(:ok)
      expect(Book.exists?(book.id)).to be false
      expect(Book.with_discarded.find(book.id).discarded_at).to be_present
    end

    it "削除した本は一覧に出ない" do
      book.discard!

      get api_books_path, as: :json

      expect(response.parsed_body["books"]).to be_empty
    end

    it "削除した本は更新できない" do
      book.discard!

      post batch_api_books_path, params: { ops: [ { op: "update", id: book.id, attributes: { rating: 5 } } ] }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  it "ユーザーが削除済みの本を戻す操作は受け付けない" do
    book.discard!

    post batch_api_books_path, params: { ops: [ { op: "restore", id: book.id } ] }, as: :json

    expect([ response.status, Book.exists?(book.id) ]).to eq [ 400, false ]
  end
end
