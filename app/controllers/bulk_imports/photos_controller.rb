module BulkImports
  class PhotosController < ApplicationController
    include BulkImportable

    require_approval

    def new
    end

    def confirm
      show_confirmation
    end

    def create
      register_user_shelf_items
    end

    def complete
      show_completion
    end
  end
end
