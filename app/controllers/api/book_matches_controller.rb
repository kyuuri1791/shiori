module Api
  class BookMatchesController < ApplicationController
    rate_limit to: 60, within: 1.minute, with: -> { render_error("照合が多すぎます。少し待ってからもう一度お試しください", :too_many_requests) }

    def create
      items = params.require(:items)
      raise ActionController::BadRequest, "items must be an array" unless items.is_a?(Array) && items.all?(ActionController::Parameters)
      return render_error("一度に照合できるのは#{BookMatcher::MAX_ITEMS}件までです", :unprocessable_content) if items.size > BookMatcher::MAX_ITEMS

      items = items.map { BookMatcher.item(**it.permit(:title, :author, :isbn, :volume).to_h.symbolize_keys) }
      matches = BookMatcher.new(current_user.user_shelf_items).call(items)
      render json: {
        matches: matches.map do |match|
          { isbn13: match.isbn13, candidates: match.candidates.map { it.as_card_json.merge(owned: match.owned_book_ids.include?(it.id), close: match.close_book_ids.include?(it.id)) } }
        end
      }
    end
  end
end
