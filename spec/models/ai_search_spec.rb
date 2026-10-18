require "rails_helper"

RSpec.describe AiSearch do
  describe ".reusable_interpretation" do
    subject(:reused) { described_class.reusable_interpretation("このすばの最新刊") }

    context "今の解釈の版で、1日以内に成功した同じ依頼文があるとき" do
      let!(:search) { create(:ai_search) }

      it "その解釈を返す" do
        expect(reused).to eq search.interpretation
      end
    end

    context "プロンプトやモデルを変える前の解釈しかないとき" do
      let!(:search) { create(:ai_search, interpreter_version: "old-version") }

      it "使い回さない" do
        expect(reused).to be_nil
      end
    end

    context "1日より前の解釈しかないとき" do
      let!(:search) { create(:ai_search, created_at: 2.days.ago) }

      it "使い回さない" do
        expect(reused).to be_nil
      end
    end

    context "失敗した検索しかないとき" do
      let!(:search) { create(:ai_search, status: :failed) }

      it "使い回さない" do
        expect(reused).to be_nil
      end
    end
  end
end
