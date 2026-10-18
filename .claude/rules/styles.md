---
paths:
  - "app/assets/stylesheets/**"
  - "app/client/**/*.tsx"
  - "app/views/**"
---

# スタイル

- **スタイルは Sass（SCSS）で BEM 構成にする。** `.block`、`.block__element`、`.block--modifier`、`.block__element--modifier`。状態（選択中・開いている など）も modifier で表す。素の CSS ファイルや CSS-in-JS、ユーティリティクラスは使わない。
- 色や書体は `app/assets/stylesheets/_tokens.scss` の CSS 変数を使う。画面はライトのみ（ダークモードには対応しない）。
- ブロックごとに `app/assets/stylesheets/blocks/_<block>.scss` を作る。
- **CSS は画面ごとに、ビューで必要な分だけ読み込む。** ビュー `app/views/<controller>/<action>.html.erb` 用のエントリを `app/assets/stylesheets/<controller>/<action>/application.scss` に置き（ビューのパスと1対1）、`tokens`・`base` とその画面で使うブロックだけを `@use` する。ビューで `content_for :head` の中に `vite_stylesheet_tag "<controller>/<action>/application.scss"` と書いて読み込む。レイアウトで全画面共通の CSS は読み込まない。JS の中で CSS を `import` しない。エントリは `vite.config.js` が `**/application.scss` を自動でビルド対象にする。
- Vite は gem を使わず `app/helpers/vite_helper.rb` で読み込む。開発中は Vite の開発サーバー（HMR）、本番は `pnpm build` で `public/vite/` に出力したものを manifest から引く。
- SCSS は `app/assets/stylesheets/` に置くが、Propshaft ではなく Vite でビルドする（Propshaft の対象からは `config/initializers/assets.rb` で外している）。開発中は Vite の開発サーバーが `<link>` で読み込んだ CSS も HMR で更新する。
