class UsersController < ApplicationController
  include Pagy::Method

  PER_PAGE = 20

  allow_unauthenticated_access
  rate_limit to: 60, within: 1.minute, with: -> { head :too_many_requests }
  before_action :resume_session
  after_action { response.headers["X-Robots-Tag"] = "noindex, nofollow" }

  def index
    pagy, @users = pagy(:offset, User.with_shelf_summary, limit: PER_PAGE)
    @page = pagy.data_hash(data_keys: %i[count page last previous next from to series])
  end
end
