module BulkImportable
  extend ActiveSupport::Concern

  private
    def show_confirmation(books)
      @books_attributes = bulk_books_attributes(books)
      @form = Forms::BookBulkRegistrationForm.new(user: current_user, books_attributes: @books_attributes)
      @form.validate
      @status = "read"
      render :confirm
    end

    def register_books(books, status)
      @books_attributes = bulk_books_attributes(books)
      @status = status
      @form = Forms::BookBulkRegistrationForm.new(user: current_user, books_attributes: @books_attributes.map { it.merge(status:) })
      saved = ActiveRecord::Base.transaction { @form.save }
      if saved
        flash[:bulk_import] = { "count" => @form.books.size, "status" => status }
        redirect_to url_for(action: :complete)
      else
        render :confirm, status: :unprocessable_content
      end
    end

    def show_completion
      @result = flash[:bulk_import]
      redirect_to root_path unless @result
    end

    def bulk_books_attributes(books)
      raise ActionController::BadRequest, "books must be a hash" unless books.is_a?(ActionController::Parameters)

      books.values.map { it.permit(:edition_id, :isbn13, :title, :author, tags: []).to_h }
    end
end
