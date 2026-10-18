require "rails_helper"

RSpec.describe "ジョブの実行状況" do
  let!(:member) { create(:user, password: "password-for-test") }

  it "管理者でなければ見つからない扱いにする" do
    post session_path, params: { email_address: member.email_address, password: "password-for-test" }

    get "/admin/jobs"

    expect(response).to have_http_status(:not_found)
  end

  it "ログインしていなければログイン画面に移る" do
    get "/admin/jobs"

    expect(response).to redirect_to("/session/new")
  end
end
