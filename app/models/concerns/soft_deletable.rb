module SoftDeletable
  extend ActiveSupport::Concern

  included do
    include Discard::Model
    default_scope -> { kept }
  end
end
