module BulkImports
  class PhotosController < ApplicationController
    include BulkImportable

    require_approval

    def new
    end

    def confirm(user_shelf_items)
      show_confirmation(user_shelf_items)
    end

    def create(user_shelf_items, status)
      register_user_shelf_items(user_shelf_items, status)
    end

    def complete
      show_completion
    end
  end
end
