module Api
  module Public
    class EditionsController < BaseController
      def search(q: "", author: "")
        editions = Edition.suggest(q.to_s.first(BookQuery::MAX_TEXT_LENGTH), author: author.to_s.first(BookQuery::MAX_TEXT_LENGTH))
        render json: { editions: editions.map(&:as_card_json) }
      rescue ActiveRecord::QueryCanceled
        render_error("検索に時間がかかりすぎました。もう少し詳しく入力してください", :service_unavailable)
      end
    end
  end
end
