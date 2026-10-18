class UsersController < ApplicationController
  include ShelfPaginatable

  PER_PAGE = 20

  allow_unauthenticated_access
  rate_limit to: 60, within: 1.minute, with: -> { head :too_many_requests }
  after_action { response.headers["X-Robots-Tag"] = "noindex, nofollow" }

  def index
    pagy, @users = pagy(:offset, User.with_shelf_summary, limit: PER_PAGE)
    @page = pagy.data_hash(data_keys: %i[count page last previous next from to series])
  end

  def show(id)
    owner = User.find(id)
    @props = shelf_page_for(owner.user_shelf_items).merge(viewer: viewer_props(mode: "readonly", owner:))
  end
end
