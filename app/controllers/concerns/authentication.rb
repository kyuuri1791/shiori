module Authentication
  extend ActiveSupport::Concern

  SESSION_TOUCH_INTERVAL = 1.hour

  included do
    before_action :require_authentication
    helper_method :authenticated?
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private
    def authenticated?
      resume_session
    end

    def require_authentication
      resume_session || request_authentication
    end

    def resume_session
      return Current.user if Current.user

      if (user = user_from_session)
        session[:last_seen_at] = Time.current.to_i if session[:last_seen_at].to_i < SESSION_TOUCH_INTERVAL.ago.to_i
        Current.user = user
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
      Current.user = user
      return_to
    end

    def terminate_session
      reset_session
      Current.user = nil
    end
end
