import type { UserShelfItem } from "./types"

const year = new Date().getFullYear()

export const GUEST_SAMPLE_USER_SHELF_ITEM: UserShelfItem = {
  id: -1,
  book_id: -1,
  isbn13: "9784101010137",
  title: "こころ",
  author: "夏目漱石",
  status: "read",
  rating: 5,
  tags: ["小説", "再読したい"],
  review: "（見本）学生のころに読んだときは「先生」の側にしか目が行かなかったが、読み返すと「私」の若さがまぶしい。手紙の章は一気に読んだ。",
  notes: [
    { t: new Date(year, 8, 3).getTime(), text: "（見本）「精神的に向上心のないものは馬鹿だ」— 上・十九" },
    { t: new Date(year, 8, 10).getTime(), text: "（見本）下の章から一気に引き込まれる" },
  ],
  reading_dates: [`${year - 6}-07-21`, `${year}-09-14`],
  book: {
    id: -1,
    isbn13: "9784101010137",
    title: "こころ",
    authors: ["夏目漱石"],
    publisher: "新潮社",
    published_on: "2004-03",
    cover_url: null,
  },
  discarded: false,
  created_at: new Date(year - 6, 6, 21).getTime(),
}
