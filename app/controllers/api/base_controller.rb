module Api
  class BaseController < ApplicationController
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

      def render_error(message, status)
        render json: { error: message }, status:
      end
  end
end
