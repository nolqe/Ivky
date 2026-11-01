// ====== 息吹のデータ ======
// サイトに出る中身は、全部ここにあります。どれも一度だけ書けば、球の上のどこに出ていても同じものが出ます。
// 作品の形は name / status / date / desc / tags / ytId / img / links。date（YYYY-MM-DD）は無くてよく、無い物は年を出しません。
// 実績一覧（WORKS）の番号は、公開日の古い方から 01, 02… と自動で振られます。追加は {} を 1 つ足して、PLACES に置き場所を 1 行足すだけです。
// タグの Log-!N は、のおるがいるチームの名前（チームでの仕事に付ける）。

const IVKY_DATA = (() => {
  // 北極の札
  const TITLE = { name: "「息吹」", sub: "のおる(nolqe)-portfolio & info" };

  // 正面の自己紹介
  const HOME = {
    name: "のおる",
    signImg: "./images/sign.png",
    handle: "@t_t_r_n_",
    role: "Creator & nomad…",
    lead: "映像制作を軸に、幅広く活動中",
    chips: ["Blender", "AfterEffects", "Vocal", "Illustration", "Maid"],
  };

  const ICON = "./images/icon.webp";

  const POEM = ["循環、円環、そこにある波", "今日も作為を溢し続けるのは", "そこにあなたがいるから！"];

  // 実績一覧（依頼で作った物）。id は置き場所（PLACES）から指すための名前で、動画の物は動画の id をそのまま使う
  const WORKS = [
    {
      id: "1Em4VQsKUMY",
      name: "bit-chan 様 × 葡萄うると 様 × むゆう 様",
      status: "Video Works",
      date: "2026-10-31",
      tags: ["MV", "歌ってみた"],
      ytId: "1Em4VQsKUMY",
      links: [{ label: ". 仮装狂騒曲 - bit-chan × 葡萄うると × むゆう cover .", url: "https://youtu.be/1Em4VQsKUMY?si=wt2VGVWd3JsHqxT4" }],
    },
    {
      id: "6YKut5aPnuk",
      name: "Krush 様",
      status: "Video Works",
      date: "2026-09-30",
      tags: ["MV"],
      ytId: "6YKut5aPnuk",
      links: [{ label: "フレネミー/ Krush【オリジナル楽曲】", url: "https://youtu.be/6YKut5aPnuk?si=bAyySTT5k1VHAYHD" }],
    },
    {
      id: "elfqXQpuz2I",
      name: "Krush 様",
      status: "Video Works",
      date: "2026-09-18",
      tags: ["MV", "歌ってみた", "Shorts"],
      ytId: "elfqXQpuz2I",
      links: [{ label: "Bang Bang Bang", url: "https://youtube.com/shorts/elfqXQpuz2I?si=K7lo-9MCHAryoBPD" }],
    },
    {
      id: "B1Bq2Mp1npk",
      name: "ゆうぎり高校 様",
      status: "Video Works",
      date: "2026-08-28",
      tags: ["MV", "Log-!N"],
      ytId: "B1Bq2Mp1npk",
      links: [{ label: "篠崎シャノン - Sweet & Bitter（Official Music Video）", url: "https://youtu.be/B1Bq2Mp1npk?si=vbKh31NYGygT0-Yu" }],
    },
    {
      id: "ruLioMAoPi4",
      name: "ゆにれいど ! 様",
      status: "Video Works",
      date: "2026-07-21",
      tags: ["MV", "歌ってみた", "Log-!N"],
      ytId: "ruLioMAoPi4",
      links: [{ label: "長く短い祭 / 椎名林檎 (Covered by コンプサウルス/聖ルナティア）【 異世界れこーど！】", url: "https://youtu.be/ruLioMAoPi4?si=m5c0ktxoMKdzK2Aq" }],
    },
    {
      id: "c6q72uyarP4",
      name: "宵崎 獅白 様",
      status: "Video Works",
      date: "2026-07-07",
      tags: ["MV", "歌ってみた"],
      ytId: "c6q72uyarP4",
      links: [{ label: "とても素敵な六月でした / Covered by 宵崎 獅白", url: "https://youtu.be/c6q72uyarP4?si=S4W530CfkMze4GJ7" }],
    },
    {
      id: "TLNAlx0UrzE",
      name: "Ena 様 × Krush 様",
      status: "Video Works",
      date: "2026-07-04",
      tags: ["MV", "歌ってみた"],
      ytId: "TLNAlx0UrzE",
      links: [{ label: "III / Ena × Krush 歌ってみた", url: "https://youtu.be/TLNAlx0UrzE?si=Hr-byJBHjq9VYF8X" }],
    },
    {
      id: "njXTSvwjWZo",
      name: "シャロ 様",
      status: "Video Works",
      date: "2026-06-12",
      tags: ["MV", "Vocaloid"],
      ytId: "njXTSvwjWZo",
      links: [{ label: "へるぱーていぱー！feat.ᴍ ɪ ᴋ ᴜ", url: "https://youtu.be/njXTSvwjWZo?si=i4mT8q1MIJTLbhCw" }],
    },
    {
      id: "khhx4gYrE5o",
      name: "歌宵花瑠 様",
      status: "Video Works",
      date: "2026-02-28",
      tags: ["MV", "Vocaloid"],
      ytId: "khhx4gYrE5o",
      links: [{ label: "メルティリップ (feat.初音ミク) / 歌宵花瑠", url: "https://youtu.be/khhx4gYrE5o?si=NJP2xrnlzTjQdtSb" }],
    },
    {
      id: "raK3qEc7G2Y",
      name: "いちプロ 様",
      status: "Video Works",
      date: "2026-03-13",
      tags: ["MV", "Lyric Motion", "歌ってみた"],
      ytId: "raK3qEc7G2Y",
      links: [{ label: "【歌ってみた】君の彼氏になりたい。 / SnowMan \n【＃いちプロ】", url: "https://youtu.be/raK3qEc7G2Y?si=LwQK9ySFzm_q9dGB" }],
    },
    {
      id: "RTY3UJ6UmOw",
      name: "Krush 様",
      status: "Video Works",
      date: "2026-02-14",
      tags: ["MV", "Blender", "Lyric Motion", "歌ってみた"],
      ytId: "RTY3UJ6UmOw",
      links: [{ label: "キャリバー / ばぁう(cover.)", url: "https://youtu.be/RTY3UJ6UmOw?si=VWETlyy4AvGkkkpA" }],
    },
    {
      id: "MqjxINp7VjQ",
      name: "歌宵花瑠 様",
      status: "Video Works",
      date: "2025-12-12",
      tags: ["MV", "Vocaloid", "Lyric Motion"],
      ytId: "MqjxINp7VjQ",
      links: [{ label: "Sunny Notes (feat.初音ミク) / 歌宵花瑠", url: "https://youtu.be/MqjxINp7VjQ?si=ecOMgr6F5R5wsuFw" }],
    },
    {
      id: "IEjHbilyqbM",
      name: "Krush 様",
      status: "Video Works",
      date: "2025-12-11",
      tags: ["MV", "Blender", "Lyric Motion"],
      ytId: "IEjHbilyqbM",
      links: [{ label: "I&U / Krush", url: "https://www.youtube.com/watch?v=IEjHbilyqbM" }],
    },
    {
      id: "aPpe4zBk3OQ",
      name: "ノンストップメドれ！",
      status: "Video works",
      date: "2022-10-13",
      desc: "透明度 名義にて、3:52~4:12のパートを担当",
      tags: ["MV", "Vocaloid", "Lyric Motion"],
      ytId: "aPpe4zBk3OQ",
      links: [{ label: "ノンストップメドれ！【MV】-また切ない世界を生きる", url: "https://youtu.be/aPpe4zBk3OQ?si=0o_fPp8y8t2Oeqjx&t=231" }],
    },
  ];

  // 自主制作。kind: "note" の物は、題・説明・画像・リンクを縦に並べる札で出す（それ以外は実績一覧と同じ札）
  const PERSONAL = [
    {
      id: "6l0f_aeVlOY",
      name: "「二次創作MV」椎乃味醂 / この命を響かせたいと思ったのだ",
      tags: ["MV", "二次創作"],
      ytId: "6l0f_aeVlOY",
      links: [{ label: "YouTube", url: "https://youtu.be/6l0f_aeVlOY?si=o8GSvYZbWh-0Vorz" }],
    },
    {
      id: "PqEu2ZRaiQQ",
      name: "【OS-3合作単品】懐色、虚色",
      tags: ["MV", "合作"],
      ytId: "PqEu2ZRaiQQ",
      links: [{ label: "YouTube", url: "https://youtu.be/PqEu2ZRaiQQ?si=uZlfAIvtlyQ-Lrl-" }],
    },
    {
      id: "NJJGgsy9IRs",
      name: "[二次創作MV] IMAWANOKIWA",
      tags: ["MV", "二次創作"],
      ytId: "NJJGgsy9IRs",
      links: [{ label: "YouTube", url: "https://youtu.be/NJJGgsy9IRs?si=WwfzqRfQa8TPz4xa" }],
    },
    {
      id: "Ct8nx6FWLiI",
      name: "ハネムーン/LOLUET feat.理芽 - のおる",
      tags: ["歌ってみた"],
      ytId: "Ct8nx6FWLiI",
      links: [{ label: "YouTube", url: "https://youtu.be/Ct8nx6FWLiI?si=ODeTZw9Chc-ntu3W" }],
    },
    {
      id: "r3TD5GJlUCg",
      name: "ヴァニタス - のおる (Cover)",
      tags: ["歌ってみた"],
      ytId: "r3TD5GJlUCg",
      links: [{ label: "YouTube", url: "https://youtu.be/r3TD5GJlUCg?si=iBEVxB7nJSlizzyk" }],
    },
    {
      id: "cP_KVLj3J4Y",
      name: "乱高架 / 結月ゆかり",
      ytId: "cP_KVLj3J4Y",
      links: [{ label: "YouTube", url: "https://youtu.be/cP_KVLj3J4Y?si=icjqEGvBH0i42iik" }],
    },
    {
      id: "utau",
      kind: "note",
      title: "UTAU-死乃のぺ　れんたん風単独音",
      meta: "音声ライブラリ",
      url: "https://n00l3.fanbox.cc/posts/11664011",
      linkLabel: "配布ページ →",
      img: "./images/nope.webp",
    },
    {
      id: "nolqe",
      kind: "note",
      title: "nolqe-情報整理ツール",
      meta: "Chrome拡張機能",
      url: "https://note.com/nolqe/n/n6edf38ec361f",
      linkLabel: "noteで見る →",
      img: "./images/nolqe.webp",
    },
    {
      id: "sep",
      kind: "note",
      title: "人工言語-Sepnahqol",
      img: "./images/sep.png",
    },
  ];

  // 料金目安。isGroup: true は名前の下に金額と内容を並べ、false は名前と金額を 1 行で出す
  const PRICE = [
    {
      isGroup: true,
      name: "映像制作",
      subs: [
        { amount: "15,000円〜", desc: "静的なMV" },
        { amount: "25,000円〜", desc: "モーション・2D演出を含むMV" },
        { amount: "40,000円〜", desc: "3DCGを含むMV" },
      ],
    },
    {
      isGroup: false,
      name: "イラスト / ボーカルなど",
      amount: "要相談",
    },
  ];

  // 連絡の案内。template は依頼テンプレート（label が項目名、ph が書き方の例。コピーされるのは項目名だけ）
  const CONTACT = {
    lead: "ご依頼・ご相談はXのDM等へ！\n規模や予算は問いません。\n納品後、銀行振込またはPayPayにてお支払い。",
    dmUrl: "https://x.com/t_t_r_n_",
    dmLabel: "X でDMを送る →",
    discord: "n00l3",
    mail: "yamasakiryo0328@gmail.com",
    template: [
      { label: "依頼内容", ph: "映像制作・イラストなど" },
      { label: "予算目安", ph: "未定でも可" },
      { label: "納期目安", ph: "〇月〇日ごろまで" },
      { label: "素材・仕様", ph: "音源あり・イラスト手配中など" },
      { label: "クレジット", ph: "希望の名義、または不要" },
      { label: "支払い方法", ph: "銀行振込 / PayPay" },
      { label: "自由記述", ph: "イメージ・参考URLなど" },
    ],
  };

  // 旧版。手を入れずにそのまま残してある版で、旧版の札から選ぶと、息吹の上にそのまま映す。href はこのページ（next/）から見た置き場所。
  // この息吹を一番上（今の index.html の場所）に移すときは、今の版を v/2026-11/ に写し、href を "./v/2026-11/"・"./v/2026-04/" に変える
  const VERSIONS = [
    { id: "2026-11", label: "2026.11", href: "../" },
    { id: "2026-04", label: "2026.04", href: "../v/2026-04/" },
  ];

  // ====== 置き場所 ======
  // 球の上の位置を、緯度（帯）と経度（度。正面が 0 で、右回りに増える）で決める。
  // win: true の物が、ふだんの球（店先）に出ている物。それ以外は、球が大きくなったとき（一覧を開いたとき）にその間に現れる。
  // 店先の物の位置は前の息吹と同じ。北極 1・上の輪 4・赤道 6・下の輪 4・南極 1 で、一覧の物はその間に入る。
  // 入れ替えるときは、id ごと別の行と取り替えるだけでよい。
  const N = 1.22, // 北極のあたり
    U = 0.61, // 上の輪
    E = 0, // 赤道
    L = -0.61, // 下の輪
    S = -1.22; // 南極のあたり
  const PLACES = [
    // —— 北極 ——
    { id: "title", lat: N, lon: 0, win: true },
    { id: "njXTSvwjWZo", lat: N, lon: 180 },
    // —— 上の輪 ——
    { id: "icon", lat: U, lon: 0, win: true },
    { id: "B1Bq2Mp1npk", lat: U, lon: 45 },
    { id: "RTY3UJ6UmOw", lat: U, lon: 90, win: true },
    { id: "ruLioMAoPi4", lat: U, lon: 135 },
    { id: "utau", lat: U, lon: 180, win: true },
    { id: "NJJGgsy9IRs", lat: U, lon: 225 },
    { id: "nolqe", lat: U, lon: 270, win: true },
    { id: "Ct8nx6FWLiI", lat: U, lon: 315 },
    // —— 赤道 ——
    { id: "home", lat: E, lon: 0, win: true },
    { id: "1Em4VQsKUMY", lat: E, lon: 30 },
    { id: "raK3qEc7G2Y", lat: E, lon: 60, win: true },
    { id: "6YKut5aPnuk", lat: E, lon: 90 },
    { id: "IEjHbilyqbM", lat: E, lon: 120, win: true },
    { id: "elfqXQpuz2I", lat: E, lon: 150 },
    { id: "aPpe4zBk3OQ", lat: E, lon: 180, win: true },
    { id: "6l0f_aeVlOY", lat: E, lon: 210 },
    { id: "works", lat: E, lon: 240, win: true },
    { id: "PqEu2ZRaiQQ", lat: E, lon: 270 },
    { id: "price", lat: E, lon: 300, win: true },
    { id: "archive", lat: E, lon: 330 },
    // —— 下の輪 ——
    { id: "poem", lat: L, lon: 0, win: true },
    { id: "c6q72uyarP4", lat: L, lon: 45 },
    { id: "MqjxINp7VjQ", lat: L, lon: 90, win: true },
    { id: "TLNAlx0UrzE", lat: L, lon: 135 },
    { id: "sep", lat: L, lon: 180, win: true },
    { id: "r3TD5GJlUCg", lat: L, lon: 225 },
    { id: "contact", lat: L, lon: 270, win: true },
    { id: "cP_KVLj3J4Y", lat: L, lon: 315 },
    // —— 南極 ——
    { id: "reach", lat: S, lon: 0, win: true },
    { id: "khhx4gYrE5o", lat: S, lon: 180 },
  ];

  // メニューの行き先が正面に出す物
  const ANCHOR = { home: "home", works: "1Em4VQsKUMY", personal: "6l0f_aeVlOY", request: "price", archive: "archive" };

  return { TITLE, HOME, ICON, POEM, WORKS, PERSONAL, PRICE, CONTACT, VERSIONS, PLACES, ANCHOR };
})();
