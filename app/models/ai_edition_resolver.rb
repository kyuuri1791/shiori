class AiEditionResolver
  LIMIT = 10
  TRAILING_SYMBOLS = /[!?！？・~〜\s]+\z/
  FULL_WIDTH_DIGITS = "０１２３４５６７８９".freeze
  MAIN_VOLUME_TAIL = "[[:space:]]*($|[:：]|[!！?？・.,、#＃(（\\[［第巻[:space:]]*[0-9０-９上中下])".freeze
  SERIES_BOUNDARY = "($|[[:space:]:：.,、・!！?？#＃(（\\[［<＜〈「『/／_-]|[0-9０-９])".freeze
  BUNDLE_PATTERN = "(セット|パック|BOX|ボックス|全巻|[0-9０-９]+[[:space:]]*巻?[[:space:]]*[～〜~][[:space:]]*[0-9０-９]+)".freeze

  def initialize(interpretation)
    @titles = Array(interpretation["titles"])
    @author = interpretation["author"].presence
    @target = interpretation["target"]
    @volume = interpretation["volume"]
    @guesses = Array(interpretation["guesses"])
  end

  def editions
    return guessed_editions if @titles.empty?

    @titles.each do |title|
      found = search(title)
      return found if found.any?
    end
    []
  end

  private
    def guessed_editions
      @guesses.filter_map { |guess| self.class.new("titles" => [ guess["title"] ], "author" => guess["author"], "target" => "any").editions.first }
        .uniq(&:id).first(LIMIT)
    end

    def search(title)
      core = title.to_s.unicode_normalize(:nfkc).sub(TRAILING_SYMBOLS, "").strip
      return [] if core.length < 2

      containing = Edition.where("editions.title ILIKE ?", "%#{Edition.sanitize_sql_like(core)}%")
      return volume_search(containing, core) if @target == "volume" && @volume

      ordered(containing, core).limit(LIMIT).to_a
    end

    def volume_search(containing, core)
      starting = containing.where("editions.title ILIKE ?", "#{Edition.sanitize_sql_like(core)}%")
      found = starting.where("editions.title ~ ?", volume_pattern).order(volume_right_after(core), *ranking(core), volume_order(core, :asc)).limit(LIMIT).to_a
      return found if found.any?

      series = starting.where("editions.title ~* ?", main_volume_pattern(core)).order(bundle_last, Arel.sql("editions.published_on ASC NULLS LAST"), :id)
      nth = series.offset(@volume - 1).first
      listed = [ nth, *series.limit(LIMIT) ].compact.uniq.first(LIMIT)
      listed.presence || ordered(containing, core).limit(LIMIT).to_a
    end

    def volume_right_after(core)
      pattern = "^#{Regexp.escape(core)}[[:space:]!！?？・.:：#＃(（\\[［第巻]*#{volume_digits}([^0-9０-９]|$)"
      Arel.sql(Edition.sanitize_sql_array([ "(editions.title ~* ?) DESC", pattern ]))
    end

    def ordered(relation, core)
      case @target
      when "latest" then relation.order(*ranking(core), Arel.sql("editions.published_on DESC NULLS LAST"), volume_order(core, :desc), id: :desc)
      when "first" then relation.order(*ranking(core), Arel.sql("editions.published_on ASC NULLS LAST"), volume_order(core, :asc), :id)
      else relation.order(*ranking(core), *[ Edition.author_first(@author), Arel.sql(Edition.sanitize_sql_array([ "similarity(editions.title, ?) DESC", core ])), :id ].compact)
      end
    end

    def ranking(core)
      [ series_rank(core), bundle_last ]
    end

    def series_rank(core)
      Arel.sql(Edition.sanitize_sql_array([
        "CASE WHEN editions.title ~* ? THEN 0 WHEN editions.title ~* ? THEN 1 WHEN editions.title ILIKE ? THEN 2 ELSE 3 END",
        main_volume_pattern(core), series_pattern(core), "#{Edition.sanitize_sql_like(core)}%"
      ]))
    end

    def bundle_last
      Arel.sql(Edition.sanitize_sql_array([ "(editions.title ~* ?) ASC", BUNDLE_PATTERN ]))
    end

    def volume_order(core, direction)
      Arel.sql(Edition.sanitize_sql_array([
        "substring(translate(substring(editions.title from ?), ?, '0123456789') from '([0-9]+)[^0-9]*$')::numeric #{direction == :desc ? "DESC" : "ASC"} NULLS LAST",
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
