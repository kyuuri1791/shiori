class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ new create ]
  rate_limit to: 10, within: 3.minutes, only: :create, with: -> { redirect_to new_session_path, alert: "しばらく待ってからもう一度お試しください。" }

  def new
  end

  def create(email_address: "", password: "")
    if user = User.authenticate_by(email_address: email_address.to_s, password: password.to_s)
      return_to = start_new_session_for(user)
      redirect_to return_to || root_url
    else
      redirect_to new_session_path, alert: "メールアドレスかパスワードが違います。"
    end
  end

  def destroy
    terminate_session
    redirect_to new_session_path, status: :see_other
  end
end
