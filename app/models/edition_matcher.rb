class EditionMatcher
  MAX_ITEMS = 10
  MAX_CANDIDATES = 3
  MAX_TEXT_LENGTH = 200
  ISBN_LIKE = /\A[0-9０-９Xx\-－\s]+\z/
  IGNORED_CHARACTERS = /[[:space:][:punct:]・、。「」『』（）]/

  Item = Data.define(:title, :author, :isbn, :volume)
  Match = Data.define(:isbn13, :candidates, :owned_edition_ids, :close_edition_ids)

  def self.item(title:, author: nil, isbn: nil, volume: nil)
    volume = Integer(volume, exception: false)
    Item.new(
      title: title.to_s.strip.first(MAX_TEXT_LENGTH),
      author: author.to_s.strip.first(MAX_TEXT_LENGTH),
      isbn: isbn.to_s.strip.first(MAX_TEXT_LENGTH),
      volume: volume&.between?(1, 9999) ? volume : nil
    )
  end

  def initialize(books)
    @books = books
  end

  def call(items)
    raise ArgumentError, "too many items" if items.size > MAX_ITEMS

    found = items.map { [ isbn_of(it), candidates_for(it) ] }
    owned = owned_edition_ids(found.flat_map { |_, candidates| candidates.map(&:id) })
    found.zip(items).map do |(isbn, candidates), item|
      close = isbn ? candidates.map(&:id) : candidates.select { close_title?(it.title, item.title) }.map(&:id)
      Match.new(isbn13: isbn&.to_s, candidates:, owned_edition_ids: owned & candidates.map(&:id), close_edition_ids: close)
    end
  end

  private
    def close_title?(edition_title, query)
      wanted = comparable(query)
      wanted.present? && comparable(edition_title).include?(wanted)
    end

    def comparable(text)
      text.to_s.unicode_normalize(:nfkc).downcase.gsub(IGNORED_CHARACTERS, "")
    end

    def isbn_of(item)
      source = item.isbn.presence || item.title
      Isbn.parse(source.unicode_normalize(:nfkc)) if source.match?(ISBN_LIKE)
    end

    def candidates_for(item)
      isbn = isbn_of(item)
      return [ Edition.preload(:identifiers).find_by_isbn(isbn.to_s) ].compact if isbn
      return [] if item.title.empty?

      volume_candidates(item).presence || Edition.suggest(item.title, author: item.author).first(MAX_CANDIDATES)
    rescue ActiveRecord::QueryCanceled
      []
    end

    def volume_candidates(item)
      return [] unless item.volume

      interpretation = { "titles" => [ item.title ], "author" => item.author.presence, "target" => "volume", "volume" => item.volume }
      ids = Edition.with_statement_timeout(Edition::SUGGEST_TIMEOUT_MS) { AiEditionResolver.new(interpretation).editions.first(MAX_CANDIDATES).map(&:id) }
      Edition.preload(:identifiers).where(id: ids).index_by(&:id).values_at(*ids).compact
    end

    def owned_edition_ids(ids)
      return [] if ids.empty?

      @books.where(edition_id: ids.uniq).distinct.pluck(:edition_id)
    end
end
