module Api
  module Public
    class EditionsController < ApplicationController
      def search(q: "", author: "")
        editions = Edition.suggest(q.to_s.first(BookQuery::MAX_TEXT_LENGTH), author: author.to_s.first(BookQuery::MAX_TEXT_LENGTH))
        render json: { editions: editions.map(&:as_card_json) }
      end
    end
  end
end
