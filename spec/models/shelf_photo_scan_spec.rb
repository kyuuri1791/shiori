require "rails_helper"

RSpec.describe ShelfPhotoScan do
  describe ".detect_content_type" do
    it "ファイルの中身から写真の形式を判定する" do
      expect([
        described_class.detect_content_type("\xFF\xD8\xFF\xE0rest".b),
        described_class.detect_content_type("\x89PNG\r\n\x1A\nrest".b),
        described_class.detect_content_type("RIFF\x00\x00\x00\x00WEBPrest".b),
        described_class.detect_content_type("<svg></svg>")
      ]).to eq [ "image/jpeg", "image/png", "image/webp", nil ]
    end
  end

  describe "作成" do
    it "上限より大きい写真は受け付けない" do
      scan = build(:shelf_photo_scan, image: "\x89PNG\r\n\x1A\n".b + ("0" * described_class::MAX_IMAGE_BYTES))
      expect(scan).not_to be_valid
    end
  end
end
