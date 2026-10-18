class RegistrationsController < ApplicationController
  allow_unauthenticated_access
  rate_limit to: 5, within: 1.hour, only: :create, with: -> { redirect_to new_registration_path, alert: "しばらく待ってからもう一度お試しください。" }
  before_action -> { redirect_to root_path }, if: :authenticated?

  def new
    @user = User.new
  end

  def create
    @user = User.new(email_address: params[:email_address].to_s, password: params[:password].to_s, password_confirmation: params[:password_confirmation].to_s)
    if @user.save
      start_new_session_for(@user)
      redirect_to root_path
    else
      render :new, status: :unprocessable_content
    end
  end
end
