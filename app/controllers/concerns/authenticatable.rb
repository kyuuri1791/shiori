module Authenticatable
  extend ActiveSupport::Concern

  SESSION_TOUCH_INTERVAL = 1.hour

  included do
    before_action :require_authentication
    helper_method :authenticated?, :current_user
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end

    def require_approval(**options)
      before_action :ensure_approved, **options
    end
  end

  private
    def current_user
      @current_user = resume_session unless defined?(@current_user)
      @current_user
    end

    def authenticated?
      current_user.present?
    end

    def require_authentication
      current_user || request_authentication
    end

    def ensure_approved
      request_approval unless current_user&.approved?
    end

    def request_approval
      redirect_to root_path
    end

    def resume_session
      if (user = user_from_session)
        session[:last_seen_at] = Time.current.to_i if session[:last_seen_at].to_i < SESSION_TOUCH_INTERVAL.ago.to_i
        user
      elsif session[:user_id]
        reset_session
        nil
      end
    end

    def user_from_session
      return if session[:user_id].blank? || session[:auth_token].blank?
      return if session[:last_seen_at].to_i < session_idle_timeout.ago.to_i

      user = User.find_by(id: session[:user_id])
      user if user && ActiveSupport::SecurityUtils.secure_compare(session[:auth_token], session_token_for(user))
    end

    def session_token_for(user)
      OpenSSL::HMAC.hexdigest("SHA256", Rails.application.secret_key_base, "session:#{user.id}:#{user.password_digest}")
    end

    def session_idle_timeout
      Rails.application.config.session_options.fetch(:expire_after)
    end

    def request_authentication
      session[:return_to_after_authenticating] = request.url if request.request_method.in?(%w[GET HEAD])
      redirect_to new_session_path
    end

    def start_new_session_for(user)
      return_to = session[:return_to_after_authenticating]
      reset_session
      session[:user_id] = user.id
      session[:auth_token] = session_token_for(user)
      session[:last_seen_at] = Time.current.to_i
      @current_user = user
      return_to
    end

    def terminate_session
      reset_session
      @current_user = nil
    end
end
