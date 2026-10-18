# shiori

自分用の読書記録アプリ。

```sh
gem install dip
dip provision   # イメージのビルド、依存のインストール、DB の作成、スキーマの反映、seed
dip rails s     # http://localhost:3000
```

開発用のログインは `dev@example.com` / `password`。本のマスタのファイル（`data/master/`、git 管理外）を置いてから `dip provision` する。

構成・コマンド・決まりごとは [`.claude/CLAUDE.md`](.claude/CLAUDE.md) と `.claude/rules/` を見る。
