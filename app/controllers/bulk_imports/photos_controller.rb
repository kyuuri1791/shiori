module BulkImports
  class PhotosController < ApplicationController
    include BulkImportable

    def new
    end

    def confirm(books)
      show_confirmation(books)
    end

    def create(books, status)
      register_books(books, status)
    end

    def complete
      show_completion
    end
  end
end
