require "rails_helper"

RSpec.describe "Registrations" do
  it "メールアドレスとパスワードで登録すると、ログインした状態で本棚に移る" do
    expect {
      post registration_path, params: { email_address: "New@Example.com", password: "long-enough", password_confirmation: "long-enough" }
    }.to change(User, :count).by(1)

    expect(response).to redirect_to(root_path)
    follow_redirect!
    expect(response.body).to include("&quot;signed_in&quot;:true").and include("&quot;approved&quot;:false")
    expect(User.last).to have_attributes(email_address: "new@example.com", admin: false, approved_at: nil)
  end

  it "パスワードが短いと登録できない" do
    expect {
      post registration_path, params: { email_address: "new@example.com", password: "short", password_confirmation: "short" }
    }.not_to change(User, :count)

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.body).to include("パスワードは8文字以上で入力してください")
  end

  it "登録済みのメールアドレスでは登録できない" do
    create(:user, email_address: "taken@example.com")

    post registration_path, params: { email_address: "taken@example.com", password: "long-enough", password_confirmation: "long-enough" }

    expect(response).to have_http_status(:unprocessable_content)
  end

  it "入力がなくてもエラーにならず、登録画面に戻る" do
    post registration_path

    expect(response).to have_http_status(:unprocessable_content)
  end
end
