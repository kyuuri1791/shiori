require "rails_helper"

RSpec.describe "Users" do
  let!(:active) { create(:user, email_address: "active@example.com") }
  let!(:quiet) { create(:user, email_address: "quiet@example.com") }

  before do
    create(:user_shelf_item, user: active, created_at: 1.day.ago)
    create(:user_shelf_item, user: active, created_at: 2.days.ago)
    create(:user_shelf_item, user: quiet, created_at: 10.days.ago)
    create(:user_shelf_item, user: quiet, created_at: 1.hour.ago).discard!
  end

  it "ログインしていなくても、本棚の一覧を最近登録した順に見られる" do
    get users_path

    expect(response).to have_http_status(:ok)
    expect(response.body.index("本棚 ##{active.id}")).to be < response.body.index("本棚 ##{quiet.id}")
  end

  it "削除した本は冊数に数えない" do
    get users_path

    expect(response.body).to include("2冊").and include("1冊")
  end

  it "メールアドレスは出さない" do
    get users_path

    expect(response.body).not_to include("active@example.com")
  end

  it "検索エンジンに載せない" do
    get users_path

    expect(response.headers["X-Robots-Tag"]).to eq "noindex, nofollow"
  end

  it "20件ずつページに分ける" do
    create_list(:user, 19)

    get users_path(page: 2)

    expect(response.body.scan("本棚 #").size).to eq 1
  end

  describe "本棚の公開ページ" do
    it "ログインしていなくても見られ、検索エンジンには載せない" do
      get user_path(active)

      expect([ response.status, response.headers["X-Robots-Tag"] ]).to eq [ 200, "noindex, nofollow" ]
    end

    it "公開の API で、その人の本の一覧を取れる" do
      get api_public_user_user_shelf_items_path(active), as: :json

      expect(response.parsed_body["user_shelf_items"].size).to eq 2
    end
  end
end
