module Api
  class UserShelfItemsController < ApplicationController
    include ShelfPaginatable

    def index
      render json: shelf_page
    end

    def create(user_shelf_item)
      created = current_user.user_shelf_items.new(user_shelf_item_attributes(user_shelf_item))
      if created.save
        render json: { user_shelf_item: created.as_card_json }, status: :created
      else
        render_error(created.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end

    def update(id, user_shelf_item)
      found = current_user.user_shelf_items.find(id)
      if found.update(user_shelf_item_attributes(user_shelf_item))
        render json: { user_shelf_item: found.as_card_json }
      else
        render_error(found.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end

    def destroy(id)
      found = current_user.user_shelf_items.find(id)
      found.discard!
      render json: { user_shelf_item: found.as_card_json }
    end

    private
      def user_shelf_item_attributes(user_shelf_item)
        permitted = user_shelf_item.permit(:title, :author, :status, :rating, :review, :book_id, :isbn13, tags: [], notes: [ :t, :text ], reading_dates: []).to_h
        permitted["notes"] = permitted["notes"].map { { "t" => it["t"].to_i, "text" => it["text"].to_s } } if permitted.key?("notes")
        permitted
      end
  end
end
