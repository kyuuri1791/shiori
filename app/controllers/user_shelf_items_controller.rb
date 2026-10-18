class UserShelfItemsController < ApplicationController
  include ShelfPaginatable

  allow_unauthenticated_access only: :index

  def index
    @props =
      if authenticated?
        shelf_page.merge(viewer: viewer_props(mode: "owner", owner: current_user))
      else
        shelf_page_for(UserShelfItem.none).merge(viewer: viewer_props(mode: "guest"))
      end
  end
end
