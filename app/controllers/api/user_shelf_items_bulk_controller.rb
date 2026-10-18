module Api
  class UserShelfItemsBulkController < ApplicationController
    def create(user_shelf_items)
      raise ActionController::BadRequest, "user_shelf_items must be an array" unless user_shelf_items.is_a?(Array) && user_shelf_items.all?(ActionController::Parameters)

      form = Forms::UserShelfItemBulkRegistrationForm.new(
        user: current_user,
        user_shelf_items_attributes: user_shelf_items.map { it.permit(:title, :author, :status, :book_id, :isbn13, tags: []) }
      )
      saved = ActiveRecord::Base.transaction { form.save }
      if saved
        render json: { user_shelf_items: form.user_shelf_items.map(&:as_card_json) }, status: :created
      else
        render_error(form.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end
  end
end
