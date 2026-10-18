module ShelfPaginatable
  extend ActiveSupport::Concern

  PER_PAGE = 20

  included do
    include Pagy::Method
  end

  private
    def shelf_page
      shelf_page_for(current_user.user_shelf_items)
    end

    def shelf_page_for(user_shelf_items)
      query = UserShelfItemQuery.new(user_shelf_items, params)
      pagy, page_user_shelf_items = pagy(:offset, query.relation.preload(:readings, book: :identifiers), limit: PER_PAGE)
      {
        user_shelf_items: page_user_shelf_items.map(&:as_card_json),
        page: pagy.data_hash(data_keys: %i[count page last previous next from to series]),
        facets: UserShelfItemFacets.new(user_shelf_items).to_h,
        filters: query.to_h.merge(page: pagy.page)
      }
    end

    def viewer_props(mode:, owner: nil)
      {
        mode:,
        owner_id: owner&.id,
        signed_in: current_user.present?,
        is_owner: current_user.present? && current_user == owner,
        is_admin: current_user&.admin? || false,
        approved: current_user&.approved? || false
      }
    end
end
