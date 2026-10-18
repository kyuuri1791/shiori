FactoryBot.define do
  factory :ai_search do
    user
    query { "このすばの最新刊" }
    status { :succeeded }
    interpretation { { "titles" => [ "この素晴らしい世界に祝福を！" ], "author" => nil, "target" => "latest", "volume" => nil, "guesses" => [] } }
    interpreter_version { BookQueryInterpreter::VERSION }
  end
end
