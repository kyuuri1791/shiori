module Api
  class UserShelfItemsController < ApplicationController
    include ShelfPaginatable

    def index
      render json: shelf_page
    end

    def create
      created = current_user.user_shelf_items.new(user_shelf_item_attributes)
      if created.save
        render json: { user_shelf_item: created.as_card_json }, status: :created
      else
        render_error(created.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end

    def update
      found = current_user.user_shelf_items.find(params[:id])
      if found.update(user_shelf_item_attributes)
        render json: { user_shelf_item: found.as_card_json }
      else
        render_error(found.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end

    def destroy
      found = current_user.user_shelf_items.find(params[:id])
      found.discard!
      render json: { user_shelf_item: found.as_card_json }
    end

    private
      def user_shelf_item_attributes
        permitted = params.require(:user_shelf_item).permit(:title, :author, :status, :rating, :review, :book_id, :isbn13, tags: [], notes: [ :t, :text ], reading_dates: []).to_h
        permitted["notes"] = permitted["notes"].map { { "t" => it["t"].to_i, "text" => it["text"].to_s } } if permitted.key?("notes")
        permitted
      end
  end
end
