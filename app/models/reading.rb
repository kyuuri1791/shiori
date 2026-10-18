class Reading < ApplicationRecord
  belongs_to :book

  validates :finished_on, presence: true
end
