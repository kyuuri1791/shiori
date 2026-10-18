module Api
  module Public
    class ShelvesController < BaseController
      include ShelfPagination

      def show(id)
        render json: shelf_page_for(User.find(id).books)
      end
    end
  end
end
