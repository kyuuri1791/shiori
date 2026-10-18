module Api
  module Public
    class UserShelfItemsController < ApplicationController
      include ShelfPaginatable

      def index(user_id)
        render json: shelf_page_for(User.find(user_id).user_shelf_items)
      end
    end
  end
end
