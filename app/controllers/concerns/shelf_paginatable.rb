module ShelfPaginatable
  extend ActiveSupport::Concern

  PER_PAGE = 20

  included do
    include Pagy::Method
  end

  private
    def shelf_page
      shelf_page_for(current_user.books)
    end

    def shelf_page_for(books)
      query = BookQuery.new(books, params)
      pagy, page_books = pagy(:offset, query.relation.preload(:readings, edition: :identifiers), limit: PER_PAGE)
      {
        books: page_books.map(&:as_card_json),
        page: pagy.data_hash(data_keys: %i[count page last previous next from to series]),
        facets: BookFacets.new(books).to_h,
        filters: query.to_h.merge(page: pagy.page)
      }
    end

    def viewer_props(mode:, owner: nil)
      { mode:, owner_id: owner&.id, signed_in: current_user.present?, is_owner: current_user.present? && current_user == owner }
    end
end
