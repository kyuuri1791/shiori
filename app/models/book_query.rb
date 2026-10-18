class BookQuery
  SORTS = {
    "added" => "books.created_at DESC, books.id DESC",
    "read_on" => "(SELECT max(readings.finished_on) FROM readings WHERE readings.book_id = books.id) DESC NULLS LAST, books.id DESC",
    "title" => 'books.title COLLATE "ja-x-icu" ASC, books.id ASC',
    "author" => %(NULLIF(books.author, '') COLLATE "ja-x-icu" ASC NULLS LAST, books.title COLLATE "ja-x-icu" ASC, books.id ASC),
    "rating" => "books.rating DESC, books.created_at DESC, books.id DESC"
  }.freeze
  MAX_TEXT_LENGTH = 100

  attr_reader :status, :tag, :unmatched, :q, :sort

  def initialize(scope, params)
    @scope = scope
    @status = params[:status].to_s.presence_in(Book.status.values)
    @tag = params[:tag].to_s.strip.first(MAX_TEXT_LENGTH).presence
    @unmatched = ActiveModel::Type::Boolean.new.cast(params[:unmatched]) || false
    @q = params[:q].to_s.strip.first(MAX_TEXT_LENGTH).presence
    @sort = params[:sort].to_s.presence_in(SORTS.keys) || "added"
  end

  def relation
    relation = @scope
    relation = relation.where(status: status) if status
    relation = relation.where("books.tags @> ARRAY[?]::varchar[]", tag) if tag
    relation = relation.where(edition_id: nil) if unmatched
    relation = search(relation) if q
    relation.order(Arel.sql(SORTS.fetch(sort)))
  end

  def to_h
    { status: status || "all", tag:, unmatched:, q: q || "", sort: }
  end

  private
    def search(relation)
      like = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"
      relation.where(<<~SQL.squish, like:)
        books.title ILIKE :like OR books.author ILIKE :like OR books.review ILIKE :like
        OR books.isbn13 ILIKE :like OR array_to_string(books.tags, ' ') ILIKE :like OR books.notes::text ILIKE :like
      SQL
    end
end
