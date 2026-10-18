module Admin
  class ApprovalsController < ApplicationController
    def create
      user = User.find(params[:user_id])
      user.approve!
      redirect_back_or_to admin_users_path, notice: "#{user.email_address} に AI の機能を許可しました。"
    end

    def destroy
      user = User.find(params[:user_id])
      user.revoke_approval!
      redirect_back_or_to admin_users_path, notice: "#{user.email_address} の AI の機能を取り消しました。"
    end
  end
end
