require "rails_helper"

RSpec.describe "Api::BooksBulk" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:edition) { create(:edition, title: "火車") }

  before do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  it "まとめて登録する" do
    post api_books_bulk_path, params: { books: [ { edition_id: edition.id, status: "read" }, { title: "誰も知らない同人誌", tags: [ "同人誌" ] } ] }, as: :json

    expect(response).to have_http_status(:created)
    expect(user.books.pluck(:title)).to contain_exactly("火車", "誰も知らない同人誌")
  end

  it "1冊でも登録できなければ、1冊も登録しない" do
    post api_books_bulk_path, params: { books: [ { title: "火車" }, { title: "あ" * 501 } ] }, as: :json

    expect([ response.status, user.books.count ]).to eq [ 422, 0 ]
  end

  it "上限を超える冊数は受け付けない" do
    post api_books_bulk_path, params: { books: Array.new(Forms::BookBulkRegistrationForm::MAX_BOOKS + 1) { |i| { title: "本 #{i}" } } }, as: :json

    expect([ response.status, user.books.count ]).to eq [ 422, 0 ]
  end

  it "同じ本が2回含まれていれば、1冊も登録しない" do
    post api_books_bulk_path, params: { books: [ { edition_id: edition.id }, { edition_id: edition.id } ] }, as: :json

    expect([ response.status, user.books.count ]).to eq [ 422, 0 ]
  end

  it "すでに本棚にある本が含まれていれば、理由を返して1冊も登録しない" do
    create(:book, user:, edition:)

    post api_books_bulk_path, params: { books: [ { title: "コンビニ人間" }, { edition_id: edition.id } ] }, as: :json

    expect([ response.status, user.books.count ]).to eq [ 422, 1 ]
    expect(response.parsed_body["error"]).to include("2冊目").and include("すでに本棚にある本です")
  end
end
