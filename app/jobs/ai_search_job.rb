class AiSearchJob < ApplicationJob
  queue_as :default
  discard_on ActiveRecord::RecordNotFound

  RESOLVE_TIMEOUT_MS = 3000

  def perform(ai_search_id)
    search = AiSearch.find(ai_search_id)
    return unless search.status_pending?

    attributes = interpret(search.query)
    editions = Edition.with_statement_timeout(RESOLVE_TIMEOUT_MS) { AiEditionResolver.new(attributes[:interpretation]).editions }
    search.update!(attributes.merge(status: :succeeded, edition_ids: editions.map(&:id), interpreter_version: BookQueryInterpreter::VERSION))
  rescue BookQueryInterpreter::Error, Anthropic::Errors::APIError, ActiveRecord::QueryCanceled => e
    Rails.logger.warn("[AiSearchJob] #{ai_search_id} failed: #{e.class}: #{e.message}")
    search&.update!(status: :failed, error_message: e.class.name.first(255))
  rescue StandardError => e
    search&.update!(status: :failed, error_message: e.class.name.first(255))
    Rails.error.report(e, context: { ai_search_id: })
  end

  private
    def interpret(query)
      if (reused = AiSearch.reusable_interpretation(query))
        return { interpretation: reused, input_tokens: 0, output_tokens: 0 }
      end

      result = BookQueryInterpreter.new.call(query)
      { interpretation: result.interpretation, input_tokens: result.input_tokens, output_tokens: result.output_tokens }
    end
end
