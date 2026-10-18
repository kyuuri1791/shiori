require "rails_helper"

RSpec.describe EditionMatcher do
  subject(:matches) { described_class.new(user.books).call(items) }

  let!(:user) { create(:user) }
  let!(:kasha) { create(:edition, title: "火車", authors: [ "宮部みゆき" ]) }
  let!(:kokoro) { create(:edition, title: "こころ", authors: [ "夏目漱石" ]) }
  let!(:kokoro_isbn) { create(:edition_identifier, edition: kokoro, value: "9784101010137") }

  context "書名で照合するとき" do
    let!(:items) { [ described_class.item(title: "火車", author: "宮部みゆき") ] }

    it "マスタの候補を返す" do
      expect(matches.first.candidates).to eq [ kasha ]
    end
  end

  context "ISBN だけの行のとき" do
    let!(:items) { [ described_class.item(title: "978-4-10-101013-7") ] }

    it "ISBN でマスタを引く" do
      expect([ matches.first.isbn13, matches.first.candidates ]).to eq [ "9784101010137", [ kokoro ] ]
    end
  end

  context "マスタにない本のとき" do
    let!(:items) { [ described_class.item(title: "誰も知らない同人誌") ] }

    it "候補を返さない" do
      expect(matches.first.candidates).to be_empty
    end
  end

  context "書名が似ているだけの候補があるとき" do
    let!(:items) { [ described_class.item(title: "火車の残花"), described_class.item(title: "火車") ] }

    it "書名が依頼の文字列を含む候補だけを一致とする" do
      expect(matches.map(&:close_edition_ids)).to eq [ [], [ kasha.id ] ]
    end
  end

  context "もう本棚にある本のとき" do
    let!(:items) { [ described_class.item(title: "火車"), described_class.item(title: "こころ") ] }
    let!(:owned) { create(:book, user:, edition: kasha) }
    let!(:other_users) { create(:book, edition: kokoro) }

    it "自分の本棚にある本だけ印を付ける" do
      expect(matches.map(&:owned_edition_ids)).to eq [ [ kasha.id ], [] ]
    end
  end

  context "巻数があるとき" do
    let!(:items) { [ described_class.item(title: "ダンジョン飯", volume: 2) ] }
    let!(:second) { create(:edition, title: "ダンジョン飯 2", published_on: "2015-08") }

    before do
      create(:edition, title: "ダンジョン飯 1", published_on: "2015-01")
      create(:edition, title: "ダンジョン飯 3", published_on: "2016-08")
    end

    it "その巻を候補の先頭にする" do
      expect(matches.first.candidates.first).to eq second
    end
  end

  context "件数が上限を超えるとき" do
    let!(:items) { Array.new(described_class::MAX_ITEMS + 1) { described_class.item(title: "火車") } }

    it "照合しない" do
      expect { matches }.to raise_error(ArgumentError)
    end
  end
end
