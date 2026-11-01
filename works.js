// ====== 実績一覧のデータ ======
// works.html（実績一覧）と index.html（入口の枠）の両方がここを読みます。
// date は公開日（YYYY-MM-DD）。一覧は新しい順に自動で並び、表示は年だけです。
// 番号は古い方から 01, 02… と自動で振られます。追加は {} を1つ足すだけ（順番は気にしなくてよい）。
// 項目は index.html の work スロットと同じ（name / status / desc / tags / ytId / img / links）。

const WORKS = [
  {
    name: "いちプロ 様",
    status: "Video Works",
    date: "2026-03-13",
    tags: ["MV", "Lyric Motion", "歌ってみた"],
    ytId: "raK3qEc7G2Y",
    links: [{ label: "【歌ってみた】君の彼氏になりたい。 / SnowMan【＃いちプロ】", url: "https://youtu.be/raK3qEc7G2Y?si=LwQK9ySFzm_q9dGB" }],
  },
  {
    name: "Krush 様",
    status: "Video Works",
    date: "2026-02-14",
    tags: ["MV", "Blender", "Lyric Motion", "歌ってみた"],
    ytId: "RTY3UJ6UmOw",
    links: [{ label: "キャリバー / ばぁう(cover.)", url: "https://youtu.be/RTY3UJ6UmOw?si=VWETlyy4AvGkkkpA" }],
  },
  {
    name: "歌宵花瑠 様",
    status: "Video Works",
    date: "2025-12-12",
    tags: ["MV", "Vocaloid", "Lyric Motion"],
    ytId: "MqjxINp7VjQ",
    links: [{ label: "Sunny Notes (feat.初音ミク) / 歌宵花瑠", url: "https://youtu.be/MqjxINp7VjQ?si=ecOMgr6F5R5wsuFw" }],
  },
  {
    name: "Krush 様",
    status: "Video Works",
    date: "2025-12-11",
    tags: ["MV", "Blender", "Lyric Motion"],
    ytId: "IEjHbilyqbM",
    links: [{ label: "I&U / Krush", url: "https://www.youtube.com/watch?v=IEjHbilyqbM" }],
  },
  {
    name: "ノンストップメドれ！",
    status: "Video works",
    date: "2022-10-13",
    desc: "透明度 名義にて、3:52~4:12のパートを担当",
    tags: ["MV", "Vocaloid", "Lyric Motion"],
    ytId: "aPpe4zBk3OQ",
    links: [{ label: "ノンストップメドれ！【MV】-また切ない世界を生きる", url: "https://youtu.be/aPpe4zBk3OQ?si=0o_fPp8y8t2Oeqjx&t=231" }],
  },
];

// 新しい順に並べ、古い方から番号（n）を振ったものを返す
function sortedWorks() {
  const list = WORKS.map((w, i) => ({ ...w, _i: i }));
  list.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a._i - b._i);
  return list.map((w, i) => ({ ...w, n: list.length - i }));
}
