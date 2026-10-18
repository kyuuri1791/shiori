module Api
  module Public
    class BooksController < ApplicationController
      def search
        books = Book.suggest(params[:q].to_s.first(UserShelfItemQuery::MAX_TEXT_LENGTH), author: params[:author].to_s.first(UserShelfItemQuery::MAX_TEXT_LENGTH))
        render json: { books: books.map(&:as_card_json) }
      end
    end
  end
end
