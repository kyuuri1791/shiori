require "rails_helper"

RSpec.describe BookQueryInterpreter do
  subject(:result) { described_class.new(client:).call("推し活の本") }

  let!(:messages) { double("messages") }
  let!(:client) { double("client", beta: double("beta", messages:)) }
  let!(:named) { { titles: [ "推し、燃ゆ" ], author: "宇佐見りん", target: "any", volume: nil, guesses: [] } }
  let!(:sonnet_guess) { { titles: [], author: nil, target: "any", volume: nil, guesses: [ { title: "推し、燃ゆ", author: "宇佐見りん" } ] } }
  let!(:opus_guess) { { titles: [], author: nil, target: "any", volume: nil, guesses: [ { title: "イン・ザ・メガチャーチ", author: "朝井リョウ" } ] } }

  context "作品名が書かれた依頼文のとき" do
    before do
      allow(messages).to receive(:create).and_return(
        double(stop_reason: :end_turn, content: [ double(type: :text, text: named.to_json) ], usage: double(input_tokens: 100, output_tokens: 10))
      )
    end

    it "Sonnet の解釈をそのまま使い、Opus には聞き直さない" do
      expect(result.interpretation["titles"]).to eq [ "推し、燃ゆ" ]
      expect(messages).to have_received(:create).once.with(hash_including(model: described_class::MODEL))
    end
  end

  context "特徴だけの説明で、Sonnet が候補を推測したとき" do
    before do
      allow(messages).to receive(:create).with(hash_including(model: described_class::MODEL)).and_return(
        double(stop_reason: :end_turn, content: [ double(type: :text, text: sonnet_guess.to_json) ], usage: double(input_tokens: 100, output_tokens: 10))
      )
      allow(messages).to receive(:create).with(hash_including(model: described_class::GUESS_MODEL)).and_return(
        double(stop_reason: :end_turn, content: [ double(type: :text, text: opus_guess.to_json) ], usage: double(input_tokens: 120, output_tokens: 30))
      )
    end

    it "Opus に聞き直し、その解釈を使う" do
      expect(result.interpretation["guesses"]).to eq [ { "title" => "イン・ザ・メガチャーチ", "author" => "朝井リョウ" } ]
    end

    it "使ったトークン数は2回分を足す" do
      expect([ result.input_tokens, result.output_tokens ]).to eq [ 220, 40 ]
    end
  end

  context "Opus への聞き直しが失敗したとき" do
    before do
      allow(messages).to receive(:create).with(hash_including(model: described_class::MODEL)).and_return(
        double(stop_reason: :end_turn, content: [ double(type: :text, text: sonnet_guess.to_json) ], usage: double(input_tokens: 100, output_tokens: 10))
      )
      allow(messages).to receive(:create).with(hash_including(model: described_class::GUESS_MODEL)).and_return(
        double(stop_reason: :refusal, content: [], usage: double(input_tokens: 0, output_tokens: 0))
      )
    end

    it "Sonnet の解釈を使う" do
      expect(result.interpretation["guesses"]).to eq [ { "title" => "推し、燃ゆ", "author" => "宇佐見りん" } ]
    end
  end
end
