module Api
  class BooksController < BaseController
    include ShelfPagination

    MAX_OPS = 100

    def index
      render json: shelf_page
    end

    def batch(ops)
      raise ActionController::BadRequest, "ops must be an array" unless ops.is_a?(Array) && ops.all?(ActionController::Parameters)
      return render_error("一度に操作できるのは#{MAX_OPS}件までです", :content_too_large) if ops.size > MAX_OPS

      books = Book.transaction { ops.map { apply(it) } }
      render json: { books: books.map(&:as_card_json) }
    rescue ActiveRecord::RecordInvalid => e
      render_error(e.record.errors.full_messages.to_sentence, :unprocessable_content)
    rescue ActiveRecord::RecordNotUnique
      render_error("すでに本棚にある本です", :conflict)
    end

    private
      def apply(op)
        case op[:op]
        when "create"  then Current.user.books.create!(book_attributes(op[:attributes]))
        when "update"  then Current.user.books.find(op[:id]).tap { it.update!(book_attributes(op[:attributes])) }
        when "destroy" then Current.user.books.find(op[:id]).tap(&:discard!)
        else raise ActionController::BadRequest, "unknown op: #{op[:op]}"
        end
      end

      def book_attributes(attributes)
        (attributes || ActionController::Parameters.new)
          .permit(:title, :author, :status, :rating, :review, :edition_id, :isbn13, tags: [], notes: [ :t, :text ], reading_dates: [])
          .to_h
          .tap { |h| h["notes"] = h["notes"].map { { "t" => it["t"].to_i, "text" => it["text"].to_s } } if h.key?("notes") }
      end
  end
end
