class DevSeeder
  SHELF_SIZE = 80
  TAGS = %w[小説 ミステリ SF 漫画 ノンフィクション 技術書 エッセイ 再読したい 積読 図書館].freeze
  REVIEWS = [
    "前半はゆっくりだけど、後半で一気に引き込まれた。",
    "思っていたのと違ったが、これはこれで良かった。",
    "メモを取りながら読んだ。また読み返したい。",
    "読みやすくて一晩で読み終えた。",
    "正直合わなかった。途中で何度か止まった。",
    "人に薦めたくなる一冊。",
    "読み終えてしばらく余韻が残った。"
  ].freeze
  NOTES = [ "p.42 の一文が良かった", "登場人物の関係を整理しながら読む", "3章から面白くなる", "参考文献を後で確認" ].freeze
  FREE_TITLES = [ [ "サークルの合同誌 vol.3", "" ], [ "図書館で借りた古い文庫（タイトル失念）", "" ], [ "友人に借りた画集", "" ] ].freeze
  ISBN_ONLY = %w[9784167911300 9784152098702].freeze

  def initialize(random: Random.new(42), today: Date.current)
    @random = random
    @today = today
  end

  def run
    user = User.find_or_create_by!(email_address: "dev@example.com") { it.password = "password" }
    warn "no master data loaded; run `dip rails master:load` first for a realistic shelf" unless Book.exists?
    shelved = user.user_shelf_items.exists? ? 0 : build_shelf(user)
    puts "user_shelf_items created: #{shelved}"
  end

  private
    def build_shelf(user)
      books = sample_books
      UserShelfItem.transaction do
        books.each { create_from_book(user, it) }
        FREE_TITLES.each { |title, author| create_user_shelf_item(user, title:, author:, status: :want) }
        ISBN_ONLY.reject { Book.find_by_isbn(it) }.each { create_user_shelf_item(user, isbn13: it, status: :want) }
      end
      user.user_shelf_items.count
    end

    def sample_books
      max_id = Book.maximum(:id) or return []
      ids = Array.new(SHELF_SIZE * 3) { @random.rand(1..max_id) }.uniq
      Book.preload(:identifiers).where(id: ids).order(:id).limit(SHELF_SIZE).to_a
    end

    def create_from_book(user, book)
      status = pick({ read: 55, want: 35, reading: 10 })
      reading_dates = status == :read ? reading_dates_for_read_user_shelf_item : []
      create_user_shelf_item(
        user,
        book:,
        status:,
        reading_dates:,
        rating: status == :read ? pick({ 0 => 30, 3 => 20, 4 => 25, 5 => 15, 2 => 7, 1 => 3 }) : 0,
        tags: TAGS.sample(pick({ 0 => 40, 1 => 40, 2 => 20 }), random: @random),
        review: status == :read && @random.rand < 0.3 ? REVIEWS.sample(random: @random) : "",
        notes: @random.rand < 0.15 ? [ { "t" => days_ago_ms(@random.rand(1..200)), "text" => NOTES.sample(random: @random) } ] : [],
        created_at: (reading_dates.first&.then { Date.iso8601(it) } || @today) - @random.rand(0..120)
      )
    end

    def reading_dates_for_read_user_shelf_item
      first = @today - @random.rand(0..730)
      dates = [ first ]
      dates << first + @random.rand(30..(@today - first).to_i.clamp(30, 400)) if @random.rand < 0.15 && (@today - first).to_i > 60
      dates.select { it <= @today }.sort.map(&:iso8601)
    end

    def create_user_shelf_item(user, created_at: nil, **attributes)
      user_shelf_item = user.user_shelf_items.create!(attributes)
      user_shelf_item.update_columns(created_at:, updated_at: created_at) if created_at
      user_shelf_item
    end

    def pick(weights)
      roll = @random.rand(weights.values.sum)
      weights.each { |value, weight| return value if (roll -= weight) < 0 }
    end

    def days_ago_ms(days)
      ((@today - days).to_time.to_f * 1000).to_i
    end
end
