module Admin
  class ApplicationController < ::ApplicationController
    before_action :require_admin
    after_action { response.headers["X-Robots-Tag"] = "noindex, nofollow" }

    private
      def require_admin
        raise ActionController::RoutingError, "Not Found" unless current_user.admin?
      end
  end
end
