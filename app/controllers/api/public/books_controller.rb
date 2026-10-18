module Api
  module Public
    class BooksController < ApplicationController
      include ShelfPaginatable

      def index(user_id)
        render json: shelf_page_for(User.find(user_id).books)
      end
    end
  end
end
