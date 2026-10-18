require "rails_helper"

RSpec.describe ShelfPhotoScanJob do
  subject(:perform) { described_class.perform_now(scan.id) }

  let!(:scan) { create(:shelf_photo_scan) }
  let!(:reader) { instance_double(ShelfPhotoReader) }

  before do
    allow(ShelfPhotoReader).to receive(:new).and_return(reader)
  end

  context "読み取りに成功したとき" do
    before do
      allow(reader).to receive(:call).and_return(
        ShelfPhotoReader::Result.new(books: [ { "title" => "火車", "author" => "宮部みゆき", "volume" => nil } ], input_tokens: 1500, output_tokens: 40)
      )
    end

    it "読み取った本を保存し、写真を消す" do
      perform
      expect(scan.reload.attributes.slice("status", "books", "image")).to eq(
        "status" => "succeeded", "books" => [ { "title" => "火車", "author" => "宮部みゆき", "volume" => nil } ], "image" => nil
      )
    end
  end

  context "読み取りに失敗したとき" do
    before do
      allow(reader).to receive(:call).and_raise(ShelfPhotoReader::Error, "refused")
    end

    it "失敗にして、写真を消す" do
      perform
      expect(scan.reload.attributes.slice("status", "image")).to eq("status" => "failed", "image" => nil)
    end
  end
end
