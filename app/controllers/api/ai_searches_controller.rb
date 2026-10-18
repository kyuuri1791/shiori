module Api
  class AiSearchesController < BaseController
    rate_limit to: 10, within: 1.minute, only: :create, with: -> { render_error("AI検索が多すぎます。少し待ってからもう一度お試しください", :too_many_requests) }

    def create(q)
      if Current.user.ai_searches.where(created_at: Time.current.all_day).count >= AiSearch::DAILY_LIMIT_PER_USER
        return render_error("今日のAI検索の上限（#{AiSearch::DAILY_LIMIT_PER_USER}回）に達しました。キーワードで探してください", :too_many_requests)
      end

      search = Current.user.ai_searches.create!(query: q.to_s)
      AiSearchJob.perform_later(search.id)
      render json: search_json(search), status: :accepted
    rescue ActiveRecord::RecordInvalid => e
      render_error(e.record.errors.full_messages.to_sentence, :unprocessable_content)
    end

    def show(id)
      render json: search_json(Current.user.ai_searches.find(id))
    end

    private
      def search_json(search)
        editions = search.status_succeeded? ? search.editions : []
        owned = Current.user.books.where(edition_id: editions.map(&:id)).pluck(:edition_id).to_set
        {
          id: search.id,
          status: search.status,
          query: search.query,
          interpretation: search.interpretation,
          editions: editions.map { it.as_card_json.merge(owned: owned.include?(it.id)) },
          error: search.status_failed? ? "AI検索がうまくいきませんでした" : nil
        }
      end
  end
end
