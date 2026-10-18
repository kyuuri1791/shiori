class AiBookResolver
  LIMIT = 10
  SERIES_LIMIT = 100
  SERIES_FETCH_LIMIT = 300
  TRAILING_SYMBOLS = /[!?！？・~〜\s]+\z/
  FULL_WIDTH_DIGITS = "０１２３４５６７８９".freeze
  MAIN_VOLUME_TAIL = "[[:space:]]*(\\([^)]*\\)|（[^）]*）)?[[:space:]]*($|[:：]|[!！?？・.,、#＃(（\\[［第巻[:space:]]*[0-9０-９上中下])".freeze
  SERIES_BOUNDARY = "($|[[:space:]:：.,、・!！?？#＃(（\\[［<＜〈「『/／_-]|[0-9０-９])".freeze
  BUNDLE_PATTERN = "(セット|パック|BOX|ボックス|全巻|[0-9０-９]+[[:space:]]*巻?[[:space:]]*[～〜~][[:space:]]*[0-9０-９]+)".freeze

  def initialize(interpretation)
    @titles = Array(interpretation["titles"])
    @author = interpretation["author"].presence
    @target = interpretation["target"]
    @volume = interpretation["volume"]
    @guesses = Array(interpretation["guesses"])
  end

  def books
    return guessed_books if @titles.empty?
    return series_books if @target == "all"

    @titles.each do |title|
      found = search(title)
      return found if found.any?
    end
    []
  end

  private
    def guessed_books
      @guesses.filter_map { |guess| self.class.new("titles" => [ guess["title"] ], "author" => guess["author"], "target" => "any").books.first }
        .uniq(&:id).first(LIMIT)
    end

    def series_books
      @titles.flat_map { series(it) }.uniq(&:id).first(SERIES_LIMIT)
    end

    def series(title)
      core = normalize(title)
      found = series_volumes(core)
      found.empty? && core.match?(/\s/) ? series_volumes(core.gsub(/\s+/, "")) : found
    end

    def series_volumes(core)
      return [] if core.length < 2

      Book.where("books.title ILIKE ?", "#{Book.sanitize_sql_like(core)}%")
        .where("books.title ~* ?", main_volume_pattern(core))
        .where.not("books.title ~* ?", BUNDLE_PATTERN)
        .order(volume_order(core, :asc, nulls: :first), Arel.sql("books.published_on ASC NULLS LAST"), :id)
        .limit(SERIES_FETCH_LIMIT)
        .uniq { [ volume_number(it.title, core), it.published_on.to_s.first(7) ] }
    end

    def volume_number(title, core)
      title.unicode_normalize(:nfkc)[core.length..].to_s[/\d+/]&.to_i
    end

    def normalize(title)
      title.to_s.unicode_normalize(:nfkc).sub(TRAILING_SYMBOLS, "").strip
    end

    def search(title)
      core = normalize(title)
      return [] if core.length < 2

      containing = Book.where("books.title ILIKE ?", "%#{Book.sanitize_sql_like(core)}%")
      return volume_search(containing, core) if @target == "volume" && @volume

      ordered(containing, core).limit(LIMIT).to_a
    end

    def volume_search(containing, core)
      starting = containing.where("books.title ILIKE ?", "#{Book.sanitize_sql_like(core)}%")
      found = starting.where("books.title ~ ?", volume_pattern).order(volume_right_after(core), *ranking(core), volume_order(core, :asc)).limit(LIMIT).to_a
      return found if found.any?

      series = starting.where("books.title ~* ?", main_volume_pattern(core)).order(bundle_last, Arel.sql("books.published_on ASC NULLS LAST"), :id)
      nth = series.offset(@volume - 1).first
      listed = [ nth, *series.limit(LIMIT) ].compact.uniq.first(LIMIT)
      listed.presence || ordered(containing, core).limit(LIMIT).to_a
    end

    def volume_right_after(core)
      pattern = "^#{Regexp.escape(core)}[[:space:]!！?？・.:：#＃(（\\[［第巻]*#{volume_digits}([^0-9０-９]|$)"
      Arel.sql(Book.sanitize_sql_array([ "(books.title ~* ?) DESC", pattern ]))
    end

    def ordered(relation, core)
      case @target
      when "latest" then relation.order(*ranking(core), Arel.sql("books.published_on DESC NULLS LAST"), volume_order(core, :desc), id: :desc)
      when "first" then relation.order(*ranking(core), Arel.sql("books.published_on ASC NULLS LAST"), volume_order(core, :asc), :id)
      else relation.order(*ranking(core), *[ Book.author_first(@author), Arel.sql(Book.sanitize_sql_array([ "similarity(books.title, ?) DESC", core ])), :id ].compact)
      end
    end

    def ranking(core)
      [ series_rank(core), bundle_last ]
    end

    def series_rank(core)
      Arel.sql(Book.sanitize_sql_array([
        "CASE WHEN books.title ~* ? THEN 0 WHEN books.title ~* ? THEN 1 WHEN books.title ILIKE ? THEN 2 ELSE 3 END",
        main_volume_pattern(core), series_pattern(core), "#{Book.sanitize_sql_like(core)}%"
      ]))
    end

    def bundle_last
      Arel.sql(Book.sanitize_sql_array([ "(books.title ~* ?) ASC", BUNDLE_PATTERN ]))
    end

    def volume_order(core, direction, nulls: :last)
      Arel.sql(Book.sanitize_sql_array([
        "substring(translate(substring(books.title from ?), ?, '0123456789') from '([0-9]+)')::numeric #{direction == :desc ? "DESC" : "ASC"} NULLS #{nulls == :first ? "FIRST" : "LAST"}",
        core.length + 1, FULL_WIDTH_DIGITS
      ]))
    end

    def main_volume_pattern(core)
      "^#{Regexp.escape(core)}#{MAIN_VOLUME_TAIL}"
    end

    def series_pattern(core)
      "^#{Regexp.escape(core)}#{SERIES_BOUNDARY}"
    end

    def volume_pattern
      "(^|[^0-9０-９])#{volume_digits}([^0-9０-９]|$)"
    end

    def volume_digits
      half = @volume.to_s
      "(#{half}|#{half.tr("0-9", FULL_WIDTH_DIGITS)})"
    end
end
