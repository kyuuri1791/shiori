module Forms
  class BookBulkRegistrationForm
    include ActiveModel::Model

    MAX_BOOKS = 100

    attr_reader :books

    validate :books_count
    validate :books_valid
    validate :no_duplicates

    def initialize(user:, books_attributes:)
      @user = user
      @books = books_attributes.map { user.books.new(it) }
    end

    def save
      return false if invalid?

      books.each(&:save!)
      true
    end

    private
      def books_count
        errors.add(:base, "登録する本がありません") if books.empty?
        errors.add(:base, "一度に登録できるのは#{MAX_BOOKS}冊までです") if books.size > MAX_BOOKS
      end

      def books_valid
        books.each.with_index(1) do |book, number|
          next if book.valid?

          errors.add(:base, "#{number}冊目（#{book.title.presence || book.isbn13}）: #{book.errors.full_messages.to_sentence}")
        end
      end

      def no_duplicates
        keys = books.map { it.edition_id || it.isbn13 }.compact
        errors.add(:base, "同じ本が2回含まれています") if keys.size != keys.uniq.size
      end
  end
end
