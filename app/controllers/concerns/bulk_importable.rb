module BulkImportable
  extend ActiveSupport::Concern

  private
    def show_confirmation(user_shelf_items)
      @user_shelf_items_attributes = bulk_user_shelf_items_attributes(user_shelf_items)
      @form = Forms::UserShelfItemBulkRegistrationForm.new(user: current_user, user_shelf_items_attributes: @user_shelf_items_attributes)
      @form.validate
      @status = "read"
      render :confirm
    end

    def register_user_shelf_items(user_shelf_items, status)
      @user_shelf_items_attributes = bulk_user_shelf_items_attributes(user_shelf_items)
      @status = status
      @form = Forms::UserShelfItemBulkRegistrationForm.new(user: current_user, user_shelf_items_attributes: @user_shelf_items_attributes.map { it.merge(status:) })
      saved = ActiveRecord::Base.transaction { @form.save }
      if saved
        flash[:bulk_import] = { "count" => @form.user_shelf_items.size, "status" => status }
        redirect_to url_for(action: :complete)
      else
        render :confirm, status: :unprocessable_content
      end
    end

    def show_completion
      @result = flash[:bulk_import]
      redirect_to root_path unless @result
    end

    def bulk_user_shelf_items_attributes(user_shelf_items)
      raise ActionController::BadRequest, "user_shelf_items must be a hash" unless user_shelf_items.is_a?(ActionController::Parameters)

      user_shelf_items.values.map { it.permit(:book_id, :isbn13, :title, :author, tags: []).to_h }
    end
end
