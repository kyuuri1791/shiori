module Admin
  class UsersController < ApplicationController
    include Pagy::Method

    PER_PAGE = 50

    def index(approval: nil)
      users = User.order(created_at: :desc, id: :desc)
      users = users.where(approved_at: nil) if approval == "pending"
      pagy, @users = pagy(:offset, users, limit: PER_PAGE)
      @page = pagy.data_hash(data_keys: %i[count page last previous next from to series])
      @approval = approval
    end
  end
end
