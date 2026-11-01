// ====== 依頼・相談のデータ ======
// request.html（依頼・相談）と index.html（料金目安・Contact・南極の枠）の両方がここを読みます。
// PRICE は料金目安。isGroup: true は名前の下に金額と内容を並べ、false は名前と金額を 1 行で出します。
// CONTACT は連絡の案内。template は依頼テンプレート（label が項目名、ph が書き方の例。コピーされるのは項目名だけ）。

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
