class ShelvesController < ApplicationController
  include ShelfPagination

  allow_unauthenticated_access
  rate_limit to: 60, within: 1.minute, with: -> { head :too_many_requests }
  before_action :resume_session
  after_action { response.headers["X-Robots-Tag"] = "noindex, nofollow" }

  def show(id)
    owner = User.find(id)
    @props = shelf_page_for(owner.books).merge(viewer: viewer_props(mode: "readonly", owner:))
  end
end
