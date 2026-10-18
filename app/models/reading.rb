class Reading < ApplicationRecord
  belongs_to :user_shelf_item

  validates :finished_on, presence: true
end
