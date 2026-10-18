module Api
  class BooksBulkController < ApplicationController
    def create(books)
      raise ActionController::BadRequest, "books must be an array" unless books.is_a?(Array) && books.all?(ActionController::Parameters)

      form = Forms::BookBulkRegistrationForm.new(
        user: current_user,
        books_attributes: books.map { it.permit(:title, :author, :status, :edition_id, :isbn13, tags: []) }
      )
      saved = ActiveRecord::Base.transaction { form.save }
      if saved
        render json: { books: form.books.map(&:as_card_json) }, status: :created
      else
        render_error(form.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end
  end
end
