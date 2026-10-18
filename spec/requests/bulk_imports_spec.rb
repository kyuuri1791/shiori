require "rails_helper"

RSpec.describe "BulkImports" do
  let!(:user) { create(:user, password: "password-for-test") }

  context "ログインしているとき" do
    before do
      post session_path, params: { email_address: user.email_address, password: "password-for-test" }
    end

    it "写真・シリーズのページを開ける" do
      [ new_bulk_imports_photo_path, new_bulk_imports_series_path ].each do |path|
        get path
        expect(response).to have_http_status(:ok)
      end
    end
  end

  describe "確認・登録・完了" do
    let!(:edition) { create(:edition, title: "火車", authors: [ "宮部みゆき" ], publisher: "新潮社", published_on: "1998-02") }
    let!(:books) { { "0" => { edition_id: edition.id }, "1" => { title: "誰も知らない同人誌", tags: [ "同人誌" ] } } }

    before do
      post session_path, params: { email_address: user.email_address, password: "password-for-test" }
    end

    it "確認画面に、選んだ本を出す" do
      post confirm_bulk_imports_photos_path, params: { books: }

      expect(response.body).to include("火車").and include("宮部みゆき · 新潮社 · 1998").and include("誰も知らない同人誌").and include("2冊を登録する")
    end

    it "すでに本棚にある本が含まれていれば、確認画面で理由を出して登録できないようにする" do
      create(:book, user:, edition:)

      post confirm_bulk_imports_photos_path, params: { books: }

      expect(response.body).to include("すでに本棚にある本です")
      expect(response.body).to match(/<button[^>]*disabled[^>]*>2冊を登録する/)
    end

    it "登録したら完了画面に移り、完了画面では冊数と状態を出す" do
      post bulk_imports_series_index_path, params: { status: "want", books: }

      expect(response).to redirect_to(complete_bulk_imports_series_index_path)
      expect(user.books.pluck(:title, :status)).to contain_exactly([ "火車", "want" ], [ "誰も知らない同人誌", "want" ])

      follow_redirect!
      expect(response.body).to include("2冊を「読みたい」で登録しました")
    end

    it "完了画面を直接開いたら、本棚に移る" do
      get complete_bulk_imports_photos_path

      expect(response).to redirect_to(root_path)
    end
  end

  context "ログインしていないとき" do
    it "ログイン画面に移る" do
      get new_bulk_imports_photo_path

      expect(response).to redirect_to(new_session_path)
    end
  end
end
