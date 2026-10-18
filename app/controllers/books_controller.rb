class BooksController < ApplicationController
  include ShelfPagination

  allow_unauthenticated_access only: :index

  def index
    @props =
      if authenticated?
        shelf_page.merge(viewer: viewer_props(mode: "owner", owner: Current.user))
      else
        shelf_page_for(Book.none).merge(viewer: viewer_props(mode: "guest"))
      end
  end
end
