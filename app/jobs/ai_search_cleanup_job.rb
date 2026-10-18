class AiSearchCleanupJob < ApplicationJob
  queue_as :default

  def perform
    AiSearch.expired.in_batches(of: 1000).delete_all
  end
end
