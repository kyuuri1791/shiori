module Api
  module Public
    class UserShelfItemsController < ApplicationController
      include ShelfPaginatable

      def index
        render json: shelf_page_for(User.find(params[:user_id]).user_shelf_items)
      end
    end
  end
end
