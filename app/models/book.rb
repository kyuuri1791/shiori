class Book < ApplicationRecord
  has_many :identifiers, class_name: "BookIdentifier", dependent: :destroy
  has_many :user_shelf_items, dependent: :nullify

  validates :title, presence: true

  scope :with_identifier, ->(scheme, value) { joins(:identifiers).where(book_identifiers: { scheme:, value: }) }

  def self.find_by_isbn(value)
    isbn = Isbn.parse(value) or return nil
    with_identifier("isbn13", isbn.to_s).first
  end

  MIN_TRIGRAM_LENGTH = 3

  def self.search(query, author: nil, limit: 10)
    q = query.to_s.strip
    return none if q.empty?

    q.length < MIN_TRIGRAM_LENGTH ? prefix_search(q, author, limit) : trigram_search(q, author, limit)
  end

  def self.author_first(author)
    normalized = author.to_s.unicode_normalize(:nfkc).gsub(/[\s.・]/, "")
    return if normalized.empty?

    Arel.sql(sanitize_sql_array([
      "(regexp_replace(array_to_string(books.authors, ''), '[[:space:].・]', '', 'g') ILIKE ?) DESC",
      "%#{sanitize_sql_like(normalized)}%"
    ]))
  end

  def self.prefix_search(q, author, limit)
    where("books.title LIKE ?", "#{sanitize_sql_like(q)}%")
      .order(*[ author_first(author), Arel.sql("char_length(books.title)"), :id ].compact)
      .limit(limit)
  end

  def self.trigram_search(q, author, limit)
    contains = "%#{sanitize_sql_like(q)}%"
    where("books.title ILIKE :contains OR books.title % :q", contains:, q:)
      .order(*[
        Arel.sql(sanitize_sql_array([ "(books.title ILIKE ?) DESC", contains ])),
        author_first(author),
        Arel.sql(sanitize_sql_array([ "(books.title ILIKE ?) DESC", "#{sanitize_sql_like(q)}%" ])),
        Arel.sql(sanitize_sql_array([ "similarity(books.title, ?) DESC", q ])),
        :id
      ].compact)
      .limit(limit)
  end

  SUGGEST_TIMEOUT_MS = 500

  def self.suggest(query, author: nil)
    with_statement_timeout(SUGGEST_TIMEOUT_MS) { search(query, author:).preload(:identifiers).to_a }
  end

  def self.with_statement_timeout(milliseconds)
    transaction do
      connection.exec_query("SELECT set_config('statement_timeout', $1, true)", "statement_timeout", [ Integer(milliseconds).to_s ])
      yield
    end
  end

  def isbn13
    identifiers.find { it.scheme == "isbn13" }&.value
  end

  def author_line = [ authors.first(2).join("、"), ("ほか" if authors.size > 2) ].compact.join(" ")

  def as_card_json
    { id:, isbn13:, title:, authors:, publisher:, published_on:, cover_url: }
  end
end
