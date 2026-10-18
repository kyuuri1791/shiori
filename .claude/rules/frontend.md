---
paths:
  - "app/client/**"
  - "vite.config.js"
  - "package.json"
---

# フロントエンド

- 画面は Rails のビューが最初のデータを `data-props` に埋め込み、React（`app/client/`）が描く。それ以降のデータは `app/controllers/api/` の JSON API から取り直す。条件は URL のクエリに反映する。Inertia にはしない。
- ブラウザに全件を持たない前提で作る。件数・集計・重複判定などはサーバーの応答を使う。
- 書き込みは `api.ts` の1件ずつの関数（`createBook` / `updateBook` / `destroyBook`）を呼ぶ。取り消しできる操作は、「元に戻す」用に逆の操作を呼ぶ関数を積む。確認画面を挟む操作（まとめて登録など）には「元に戻す」を付けない。削除は論理削除を戻させないため、取り消せる間（トーストが出ている間）は画面で隠すだけにして、その後（またはページを閉じるとき）にサーバーへ送る。
- **ログインしていない人や他人の本棚も、自分の本棚と同じ画面で表示する。** サーバーから渡す `viewer.mode`（`owner` / `readonly` / `guest`）で機能を出し分け、閲覧用に別の画面を作らない。
- **TypeScript で書く**（`.ts` / `.tsx`、`tsconfig.json` は `strict` と `noUncheckedIndexedAccess`）。API から返るデータの型は `types.ts` にまとめ、サーバー側の JSON を変えたらここも合わせる。`any` は使わない。Vite は型チェックをしないので、変更したら `dip pnpm typecheck` でエラーが0件なのを確かめる。
- エントリは `app/client/entrypoints/*.tsx` に置く（Vite が自動でビルド対象にする）。
