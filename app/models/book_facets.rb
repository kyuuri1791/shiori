class BookFacets
  TAG_LIMIT = 30

  def initialize(scope)
    @scope = scope
  end

  def to_h
    { counts:, tags:, unmatched: @scope.where(edition_id: nil).count }
  end

  private
    def counts
      by_status = @scope.group(:status).count.transform_keys(&:to_s)
      { all: by_status.values.sum, want: by_status.fetch("want", 0), reading: by_status.fetch("reading", 0), read: by_status.fetch("read", 0) }
    end

    def tags
      sql = <<~SQL.squish
        SELECT tag, count(*) FROM (#{@scope.unscope(:order).select("unnest(books.tags) AS tag").to_sql}) tagged
        GROUP BY tag ORDER BY count(*) DESC, tag LIMIT #{TAG_LIMIT}
      SQL
      Book.connection.select_rows(sql).map { |tag, count| { tag:, count: } }
    end
end
