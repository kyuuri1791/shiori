module Forms
  class UserShelfItemBulkRegistrationForm
    include ActiveModel::Model

    MAX_BOOKS = 100

    attr_reader :user_shelf_items

    validate :user_shelf_items_count
    validate :user_shelf_items_valid
    validate :no_duplicates

    def initialize(user:, user_shelf_items_attributes:)
      @user = user
      @user_shelf_items = user_shelf_items_attributes.map { user.user_shelf_items.new(it) }
    end

    def save
      return false if invalid?

      user_shelf_items.each(&:save!)
      true
    end

    private
      def user_shelf_items_count
        errors.add(:base, "登録する本がありません") if user_shelf_items.empty?
        errors.add(:base, "一度に登録できるのは#{MAX_BOOKS}冊までです") if user_shelf_items.size > MAX_BOOKS
      end

      def user_shelf_items_valid
        user_shelf_items.each.with_index(1) do |user_shelf_item, number|
          next if user_shelf_item.valid?

          errors.add(:base, "#{number}冊目（#{user_shelf_item.title.presence || user_shelf_item.isbn13}）: #{user_shelf_item.errors.full_messages.to_sentence}")
        end
      end

      def no_duplicates
        keys = user_shelf_items.map { it.book_id || it.isbn13 }.compact
        errors.add(:base, "同じ本が2回含まれています") if keys.size != keys.uniq.size
      end
  end
end
