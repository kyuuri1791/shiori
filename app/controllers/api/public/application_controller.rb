module Api
  module Public
    class ApplicationController < Api::ApplicationController
      REQUESTS_PER_MINUTE = 30

      allow_unauthenticated_access
      rate_limit to: REQUESTS_PER_MINUTE, within: 1.minute, with: -> { render_error("アクセスが多すぎます。少し待ってからもう一度お試しください", :too_many_requests) }
    end
  end
end
