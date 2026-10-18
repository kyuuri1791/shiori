require "rails_helper"

RSpec.describe "Api::UserShelfItemsBulk" do
  let!(:user) { create(:user, password: "password-for-test") }
  let!(:book) { create(:book, title: "火車") }

  before do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  it "まとめて登録する" do
    post api_user_shelf_items_bulk_path, params: { user_shelf_items: [ { book_id: book.id, status: "read" }, { title: "誰も知らない同人誌", tags: [ "同人誌" ] } ] }, as: :json

    expect(response).to have_http_status(:created)
    expect(user.user_shelf_items.pluck(:title)).to contain_exactly("火車", "誰も知らない同人誌")
  end

  it "1冊でも登録できなければ、1冊も登録しない" do
    post api_user_shelf_items_bulk_path, params: { user_shelf_items: [ { title: "火車" }, { title: "あ" * 501 } ] }, as: :json

    expect([ response.status, user.user_shelf_items.count ]).to eq [ 422, 0 ]
  end

  it "上限を超える冊数は受け付けない" do
    post api_user_shelf_items_bulk_path, params: { user_shelf_items: Array.new(Forms::UserShelfItemBulkRegistrationForm::MAX_BOOKS + 1) { |i| { title: "本 #{i}" } } }, as: :json

    expect([ response.status, user.user_shelf_items.count ]).to eq [ 422, 0 ]
  end

  it "同じ本が2回含まれていれば、1冊も登録しない" do
    post api_user_shelf_items_bulk_path, params: { user_shelf_items: [ { book_id: book.id }, { book_id: book.id } ] }, as: :json

    expect([ response.status, user.user_shelf_items.count ]).to eq [ 422, 0 ]
  end

  it "すでに本棚にある本が含まれていれば、理由を返して1冊も登録しない" do
    create(:user_shelf_item, user:, book:)

    post api_user_shelf_items_bulk_path, params: { user_shelf_items: [ { title: "コンビニ人間" }, { book_id: book.id } ] }, as: :json

    expect([ response.status, user.user_shelf_items.count ]).to eq [ 422, 1 ]
    expect(response.parsed_body["error"]).to include("2冊目").and include("すでに本棚にある本です")
  end
end
