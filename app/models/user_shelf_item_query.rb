class UserShelfItemQuery
  SORTS = %w[added read_on title author rating].freeze
  MAX_TEXT_LENGTH = 100

  attr_reader :status, :tag, :unmatched, :q, :sort

  def initialize(scope, params)
    @scope = scope
    @status = params[:status].to_s.presence_in(UserShelfItem.status.values)
    @tag = params[:tag].to_s.strip.first(MAX_TEXT_LENGTH).presence
    @unmatched = ActiveModel::Type::Boolean.new.cast(params[:unmatched]) || false
    @q = params[:q].to_s.strip.first(MAX_TEXT_LENGTH).presence
    @sort = params[:sort].to_s.presence_in(SORTS) || "added"
  end

  def relation
    relation = @scope
    relation = relation.where(status: status) if status
    relation = relation.tagged(tag) if tag
    relation = relation.where(book_id: nil) if unmatched
    relation = relation.matching_text(q) if q
    relation.order(*sort_order)
  end

  def to_h
    { status: status || "all", tag:, unmatched:, q: q || "", sort: }
  end

  private
    def sort_order
      case sort
      when "read_on" then [ Arel.sql("user_shelf_items.last_read_on DESC NULLS LAST"), { id: :desc } ]
      when "title" then [ Arel.sql('user_shelf_items.title COLLATE "ja-x-icu"'), :id ]
      when "author" then [ Arel.sql(%(NULLIF(user_shelf_items.author, '') COLLATE "ja-x-icu" NULLS LAST)), Arel.sql('user_shelf_items.title COLLATE "ja-x-icu"'), :id ]
      when "rating" then [ { rating: :desc, created_at: :desc, id: :desc } ]
      else [ { created_at: :desc, id: :desc } ]
      end
    end
end
