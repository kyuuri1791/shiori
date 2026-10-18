require "rails_helper"

RSpec.describe "Sessions" do
  let!(:user) { create(:user, password: "password-for-test") }

  it "正しいメールアドレスとパスワードでログインできる" do
    post session_path, params: { email_address: user.email_address, password: "password-for-test" }

    expect(response).to redirect_to(root_url)
  end

  it "パスワードが違えばログインできない" do
    post session_path, params: { email_address: user.email_address, password: "wrong" }

    expect(response).to redirect_to(new_session_path)
  end

  it "入力がなくてもエラーにならず、ログイン画面に戻る" do
    post session_path

    expect(response).to redirect_to(new_session_path)
  end
end
