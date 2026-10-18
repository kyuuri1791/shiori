module Api
  class ApplicationController < ::ApplicationController
    before_action { request.format = :json }

    rescue_from ActiveRecord::RecordNotFound do
      render_error("見つかりませんでした", :not_found)
    end

    rescue_from ActionController::InvalidAuthenticityToken do
      render_error("ページを再読み込みしてからもう一度お試しください", :unprocessable_content)
    end

    rescue_from ActionController::ParameterMissing, ActionController::BadRequest do |error|
      render_error(error.message, :bad_request)
    end

    private
      def request_authentication
        render_error("ログインしてください", :unauthorized)
      end

      def request_approval
        render_error("AI の機能は、管理者の承認を受けると使えます", :forbidden)
      end

      def render_error(message, status)
        render json: { error: message }, status:
      end
  end
end
