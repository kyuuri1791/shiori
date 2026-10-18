require "rails_helper"

RSpec.describe "Admin::Users" do
  let!(:admin) { create(:user, :admin, password: "password-for-test") }
  let!(:member) { create(:user, email_address: "member@example.com", password: "password-for-test") }
  let!(:approved) { create(:user, :approved, email_address: "approved@example.com") }

  def sign_in(user)
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }
  end

  context "管理者のとき" do
    before { sign_in(admin) }

    it "ユーザーの一覧を見られ、未承認だけに絞り込める" do
      get admin_users_path
      expect(response.body).to include("member@example.com").and include("approved@example.com")

      get admin_users_path(approval: "pending")
      expect(response.body).to include("member@example.com")
      expect(response.body).not_to include("approved@example.com")
    end

    it "承認するボタンは、送る前に確認を求める" do
      get admin_users_path

      expect(response.body).to include('data-confirm="member@example.com を承認します。よろしいですか？"')
    end

    it "AI の機能を承認し、取り消せる" do
      post admin_user_approval_path(member)
      expect(member.reload).to be_approved

      delete admin_user_approval_path(member)
      expect(member.reload).not_to be_approved
    end
  end

  context "管理者でないとき" do
    before { sign_in(member) }

    it "管理画面は見つからない扱いにし、承認もできない" do
      get admin_users_path
      expect(response).to have_http_status(:not_found)

      post admin_user_approval_path(member)
      expect(response).to have_http_status(:not_found)
      expect(member.reload).not_to be_approved
    end
  end

  it "ログインしていなければログイン画面に移る" do
    get admin_root_path

    expect(response).to redirect_to(new_session_path)
  end
end
