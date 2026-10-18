require "rails_helper"

RSpec.describe AiBookResolver do
  subject(:books) { described_class.new("titles" => titles, "author" => nil, "target" => target, "volume" => volume, "guesses" => guesses).books }

  let!(:target) { "any" }
  let!(:volume) { nil }
  let!(:guesses) { [] }

  describe "最新刊" do
    let!(:target) { "latest" }

    context "外伝やスピンオフがあるとき" do
      let!(:titles) { [ "この素晴らしい世界に祝福を！" ] }
      let!(:main) { create(:book, title: "この素晴らしい世界に祝福を! 22", published_on: "2026-02") }

      before do
        create(:book, title: "この素晴らしい世界に祝福を! 21", published_on: "2025-07")
        create(:book, title: "この素晴らしい世界に祝福を!よりみち4回目!", published_on: "2026-03")
        create(:book, title: "この素晴らしい世界に祝福を!外伝", published_on: "2026-04")
      end

      it "本編の巻を優先する" do
        expect(books.first).to eq main
      end
    end

    context "副題付きの巻と関連書籍があるとき" do
      let!(:titles) { [ "進撃の巨人" ] }
      let!(:last) { create(:book, title: "進撃の巨人 : beginning. 34", published_on: "2021-06") }

      before do
        create(:book, title: "進撃の巨人 33", published_on: "2021-01")
        create(:book, title: "進撃の巨人Full color book. 4", published_on: "2022-03")
        create(:book, title: "進撃の巨人公式ぬりえブック", published_on: "2024-11")
      end

      it "副題付きの巻を本編として扱い、関連書籍は後ろに回す" do
        expect(books.first).to eq last
      end
    end

    context "まとめ買いのパックやセットがあるとき" do
      let!(:titles) { [ "薬屋のひとりごと" ] }
      let!(:main) { create(:book, title: "薬屋のひとりごと 14", published_on: "2026-06") }

      before do
        create(:book, title: "薬屋のひとりごと １巻～３巻お買い得バリューパック", published_on: "2026-09")
        create(:book, title: "薬屋のひとりごと 全巻セット", published_on: "2026-09")
      end

      it "パックやセットを後ろに回す" do
        expect(books.first).to eq main
      end
    end

    context "発売月が同じ巻が並ぶとき" do
      let!(:titles) { [ "SLAM DUNK" ] }
      let!(:last) { create(:book, title: "SLAM DUNK : 新装再編版 #20", published_on: "2018-09") }

      before do
        create(:book, title: "SLAM DUNK : 新装再編版 #19", published_on: "2018-09")
        create(:book, title: "SLAM DUNK : 新装再編版 #18", published_on: "2018-09")
      end

      it "巻数の大きいほうを先にする" do
        expect(books.first).to eq last
      end
    end
  end

  describe "1巻" do
    let!(:target) { "first" }
    let!(:titles) { [ "銀河英雄伝説" ] }
    let!(:first) { create(:book, title: "銀河英雄伝説 : 長篇スペース・オペラ", published_on: "1982-11") }

    before do
      create(:book, title: "銀河英雄伝説 : 長篇スペース・オペラ 2 (野望篇)", published_on: "1983-09")
      create(:book, title: "銀河英雄伝説外伝 : 長篇スペース・オペラ<星を砕く者> 1", published_on: "1986-04")
    end

    it "巻数のない最初の巻も対象にする" do
      expect(books.first).to eq first
    end
  end

  describe "巻数の指定" do
    let!(:target) { "volume" }

    context "書名に巻数がない作品" do
      let!(:titles) { [ "ダンジョン飯" ] }
      let!(:volume) { 3 }
      let!(:volumes) { %w[2015-01 2015-08 2016-08].map { create(:book, title: "ダンジョン飯", published_on: it) } }

      before do
        create(:book, title: "引退したSランク冒険者は辺境でダンジョン飯を作ることにした Mな1-3-1", published_on: "2024-05")
      end

      it "書名の途中に作品名を含むだけの本は選ばず、刊行順で3番目の本を先頭に、本編を刊行順に返す" do
        expect(books).to eq [ volumes[2], volumes[0], volumes[1] ]
      end
    end

    context "書名に巻数がある作品" do
      let!(:titles) { [ "ONE PIECE" ] }
      let!(:volume) { 100 }
      let!(:target_volume) { create(:book, title: "ONE PIECE 巻100", published_on: "2021-09") }

      before do
        create(:book, title: "ONE PIECE magazine 100", published_on: "2025-01")
        create(:book, title: "ONE PIECE 巻101", published_on: "2022-03")
      end

      it "その巻を返す" do
        expect(books.first).to eq target_volume
      end
    end

    context "書名の末尾に同じ数字がある関連書があるとき" do
      let!(:titles) { [ "鬼滅の刃" ] }
      let!(:volume) { 1 }
      let!(:first_volume) { create(:book, title: "鬼滅の刃 1", published_on: "2016-06") }

      before do
        create(:book, title: "鬼滅の刃 : ノベライズ. 炭治郎と禰豆子、運命のはじまり編 こ-13-1", published_on: "2019-09")
      end

      it "作品名のすぐ後に巻数がある本を先にする" do
        expect(books.first).to eq first_volume
      end
    end
  end

  describe "巻を指定しない検索" do
    let!(:titles) { [ "火車" ] }
    let!(:user_shelf_item) { create(:book, title: "火車", published_on: "1998-02") }

    before do
      create(:book, title: "「火車」を読む", published_on: "2001-01")
    end

    it "書名が作品名で始まる本を、途中に含む本より先にする" do
      expect(books.first).to eq user_shelf_item
    end
  end

  describe "特徴だけの説明から推測した候補" do
    let!(:titles) { [] }
    let!(:guesses) { [ { "title" => "イン・ザ・メガチャーチ", "author" => "朝井リョウ" }, { "title" => "存在しない本", "author" => nil }, { "title" => "推し、燃ゆ", "author" => "宇佐見りん" } ] }
    let!(:first_guess) { create(:book, title: "イン・ザ・メガチャーチ", authors: [ "朝井リョウ" ], published_on: "2025-09") }
    let!(:third_guess) { create(:book, title: "推し、燃ゆ", authors: [ "宇佐見りん" ], published_on: "2020-09") }

    before do
      create(:book, title: "推し、燃ゆ う17-2", authors: [ "宇佐見りん" ], published_on: "2023-07")
    end

    it "候補ごとに一番近い1冊を、候補の順に返す" do
      expect(books).to eq [ first_guess, third_guess ]
    end
  end

  describe "シリーズ全部" do
    let!(:target) { "all" }
    let!(:titles) { [ "とある魔術の禁書目録", "新約 とある魔術の禁書目録" ] }
    let!(:first) { create(:book, title: "とある魔術の禁書目録", published_on: "2004-04") }
    let!(:second) { create(:book, title: "とある魔術の禁書目録(インデックス) 2 0951", published_on: "2004-06") }
    let!(:tenth) { create(:book, title: "とある魔術の禁書目録. 10 1301", published_on: "2006-06") }
    let!(:sequel) { create(:book, title: "新約とある魔術の禁書目録(インデックス). 1 2125", published_on: "2011-03") }

    before do
      create(:book, title: "とある魔術の禁書目録. 2 951", published_on: "2004-06")
      create(:book, title: "とある魔術の禁書目録 1～3巻セット", published_on: "2020-01")
      create(:book, title: "とある科学の超電磁砲 : とある魔術の禁書目録外伝. 1", published_on: "2007-02")
    end

    it "本編を巻数の順に、同じ巻の重複とまとめ買いのセットを除いて返す" do
      expect(books).to eq [ first, second, tenth, sequel ]
    end
  end
end
