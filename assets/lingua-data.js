/* global LinguaData */
/* LinguaData: 多语种学习素材 —— 英语 / 日语 / 韩语，每语言 A1-C2 六级 */
(function (global) {
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // ============= 英语 EN =============
  const enWords = {
    A1: [
      { word: 'hello', meaning: '你好', example: 'Hello, nice to meet you.', phonetic: '/həˈloʊ/' },
      { word: 'goodbye', meaning: '再见', example: 'Goodbye, see you tomorrow.', phonetic: '/ɡʊdˈbaɪ/' },
      { word: 'morning', meaning: '早晨', example: 'Good morning, everyone.', phonetic: '/ˈmɔːrnɪŋ/' },
      { word: 'water', meaning: '水', example: 'Can I have some water?', phonetic: '/ˈwɔːtər/' },
      { word: 'apple', meaning: '苹果', example: 'I eat an apple every day.', phonetic: '/ˈæpəl/' }
    ],
    A2: [
      { word: 'travel', meaning: '旅行', example: 'I love to travel in summer.', phonetic: '/ˈtrævəl/' },
      { word: 'friend', meaning: '朋友', example: 'She is my best friend.', phonetic: '/frɛnd/' },
      { word: 'restaurant', meaning: '餐厅', example: 'Let\'s meet at the restaurant.', phonetic: '/ˈrɛstərɒnt/' },
      { word: 'weather', meaning: '天气', example: 'The weather is nice today.', phonetic: '/ˈwɛðər/' },
      { word: 'holiday', meaning: '假期', example: 'My holiday was great.', phonetic: '/ˈhɒlɪdeɪ/' }
    ],
    B1: [
      { word: 'experience', meaning: '经验；经历', example: 'That was a strange experience.', phonetic: '/ɪkˈspɪəriəns/' },
      { word: 'opportunity', meaning: '机会', example: 'This is a great opportunity.', phonetic: '/ˌɒpərˈtjuːnəti/' },
      { word: 'comfortable', meaning: '舒适的', example: 'This chair is very comfortable.', phonetic: '/ˈkʌmftəbəl/' },
      { word: 'improve', meaning: '改进；提高', example: 'I want to improve my English.', phonetic: '/ɪmˈpruːv/' },
      { word: 'decision', meaning: '决定', example: 'It was a difficult decision.', phonetic: '/dɪˈsɪʒən/' }
    ],
    B2: [
      { word: 'achievement', meaning: '成就', example: 'Graduating was her biggest achievement.', phonetic: '/əˈtʃiːvmənt/' },
      { word: 'sophisticated', meaning: '精密的；老练的', example: 'The system is highly sophisticated.', phonetic: '/səˈfɪstɪkeɪtɪd/' },
      { word: 'perspective', meaning: '观点；视角', example: 'Try to see it from her perspective.', phonetic: '/pərˈspɛktɪv/' },
      { word: 'sufficient', meaning: '足够的', example: 'We have sufficient time.', phonetic: '/səˈfɪʃənt/' },
      { word: 'negotiate', meaning: '谈判；协商', example: 'They will negotiate the contract.', phonetic: '/nɪˈɡoʊʃieɪt/' }
    ],
    C1: [
      { word: 'inherent', meaning: '固有的', example: 'There are inherent risks.', phonetic: '/ɪnˈhɪərənt/' },
      { word: 'ambiguous', meaning: '模棱两可的', example: 'The statement is ambiguous.', phonetic: '/æmˈbɪɡjuəs/' },
      { word: 'empirical', meaning: '实证的', example: 'We need empirical evidence.', phonetic: '/ɪmˈpɪrɪkəl/' },
      { word: 'pragmatic', meaning: '务实的', example: 'He took a pragmatic approach.', phonetic: '/præɡˈmætɪk/' },
      { word: 'scrutiny', meaning: '仔细审查', example: 'The plan is under scrutiny.', phonetic: '/ˈskruːtəni/' }
    ],
    C2: [
      { word: 'ubiquitous', meaning: '无处不在的', example: 'Smartphones are ubiquitous.', phonetic: '/juːˈbɪkwɪtəs/' },
      { word: 'juxtapose', meaning: '并列；并置', example: 'The artist juxtaposed colors beautifully.', phonetic: '/ˌdʒʌkstəˈpoʊz/' },
      { word: 'serendipity', meaning: '意外的幸运发现', example: 'The discovery was pure serendipity.', phonetic: '/ˌsɛrənˈdɪpəti/' },
      { word: 'unequivocal', meaning: '明确无疑的', example: 'She gave an unequivocal answer.', phonetic: '/ˌʌnɪˈkwɪvəkəl/' },
      { word: 'ephemeral', meaning: '短暂的', example: 'Fame can be ephemeral.', phonetic: '/ɪˈfɛmərəl/' }
    ]
  };

  const enGrammar = [
    { level: 'A1', q: 'She ___ a student.', type: 'choice', options: ['is', 'are', 'am', 'be'], answer: 0 },
    { level: 'A1', q: 'I ___ breakfast every morning.', type: 'choice', options: ['have', 'has', 'having', 'had'], answer: 0 },
    { level: 'A2', q: 'They ___ to Paris last summer.', type: 'choice', options: ['go', 'goes', 'went', 'going'], answer: 2 },
    { level: 'A2', q: '___ you ever been to Japan?', type: 'choice', options: ['Have', 'Has', 'Had', 'Do'], answer: 0 },
    { level: 'B1', q: 'If I ___ more time, I would learn Spanish.', type: 'choice', options: ['have', 'had', 'has', 'will have'], answer: 1 },
    { level: 'B1', q: 'She told me that she ___ call back later.', type: 'choice', options: ['will', 'would', 'shall', 'is'], answer: 1 },
    { level: 'B2', q: 'The book ___ by a famous author.', type: 'choice', options: ['wrote', 'is written', 'was written', 'writes'], answer: 2 },
    { level: 'B2', q: 'By next year, I ___ here for ten years.', type: 'choice', options: ['will work', 'will have worked', 'work', 'have worked'], answer: 1 },
    { level: 'C1', q: '___ the weather was bad, we went out.', type: 'choice', options: ['Despite', 'Although', 'However', 'Because'], answer: 1 },
    { level: 'C1', q: 'It is important that he ___ present at the meeting.', type: 'choice', options: ['is', 'be', 'was', 'being'], answer: 1 },
    { level: 'C2', q: 'He insisted that she ___ a lawyer immediately.', type: 'choice', options: ['calls', 'call', 'called', 'calling'], answer: 1 },
    { level: 'C2', q: '___, she remained optimistic.', type: 'choice', options: ['Having failed repeatedly', 'Failed repeatedly', 'Having fail', 'Repeated fails'], answer: 0 }
  ];

  const enSpeak = [
    { level: 'A1', sentence: 'Good morning, how are you today?', translation: '早上好，你今天过得怎么样？' },
    { level: 'A2', sentence: 'I would like to order a coffee, please.', translation: '我想要点一杯咖啡。' },
    { level: 'B1', sentence: 'In my opinion, traveling alone helps you grow.', translation: '在我看来，独自旅行能帮助你成长。' },
    { level: 'B2', sentence: 'Despite the heavy rain, we decided to go for a walk.', translation: '尽管雨很大，我们还是决定出去走走。' },
    { level: 'C1', sentence: 'The government should invest more in renewable energy.', translation: '政府应当在可再生能源上投入更多。' },
    { level: 'C2', sentence: 'What we need is a paradigm shift in how we think about work.', translation: '我们需要的是对工作方式的一种范式转变。' }
  ];

  const enListen = [
    {
      level: 'A2', script: 'A: Excuse me, where is the train station? B: It\'s two blocks away, on the left.',
      question: 'What is the woman asking for?', options: ['The time', 'Directions to the station', 'A coffee', 'Her passport'], answer: 1
    },
    {
      level: 'B1', script: 'A: How was your weekend? B: It was great, I went hiking with some friends.',
      question: 'What did the man do on the weekend?', options: ['Stayed home', 'Went hiking', 'Watched TV', 'Cooked dinner'], answer: 1
    },
    {
      level: 'B2', script: 'A: The meeting has been moved to Thursday at 3 PM. B: Thank you for letting me know.',
      question: 'When is the meeting?', options: ['Tuesday 3 PM', 'Wednesday 10 AM', 'Thursday 3 PM', 'Friday 11 AM'], answer: 2
    },
    {
      level: 'C1', script: 'A: Given the recent market volatility, we should diversify our portfolio. B: I couldn\'t agree more.',
      question: 'What does the first speaker suggest?', options: ['Sell everything', 'Diversify investments', 'Buy gold only', 'Close the company'], answer: 1
    }
  ];

  // ============= 日语 JA =============
  const jaWords = {
    A1: [
      { word: 'こんにちは', meaning: '你好', example: 'こんにちは、元気ですか？', phonetic: 'kon-ni-chi-wa' },
      { word: 'ありがとう', meaning: '谢谢', example: 'どうもありがとう。', phonetic: 'a-ri-ga-tou' },
      { word: 'すみません', meaning: '对不起；不好意思', example: 'すみません、遅れました。', phonetic: 'su-mi-ma-sen' },
      { word: '水', meaning: '水', example: '水をください。', phonetic: 'mi-zu' },
      { word: 'りんご', meaning: '苹果', example: 'りんごを食べます。', phonetic: 'rin-go' }
    ],
    A2: [
      { word: '旅行', meaning: '旅行', example: '来月、日本へ旅行に行きます。', phonetic: 'ryo-kou' },
      { word: '友達', meaning: '朋友', example: '友達と映画を見ました。', phonetic: 'to-mo-da-chi' },
      { word: '天気', meaning: '天气', example: '今日はいい天気ですね。', phonetic: 'ten-ki' },
      { word: 'レストラン', meaning: '餐厅', example: '駅前のレストランで会いましょう。', phonetic: 'res-to-ran' },
      { word: '仕事', meaning: '工作', example: '今日は仕事が忙しい。', phonetic: 'shi-go-to' }
    ],
    B1: [
      { word: '経験', meaning: '经验', example: '貴重な経験になりました。', phonetic: 'kei-ken' },
      { word: '機会', meaning: '机会', example: 'また機会があればよろしく。', phonetic: 'ki-kai' },
      { word: '快適', meaning: '舒适', example: 'このホテルはとても快適です。', phonetic: 'kai-te-ki' },
      { word: '上達', meaning: '进步', example: '日本語が上達しましたね。', phonetic: 'jou-tatsu' },
      { word: '決断', meaning: '决断', example: '難しい決断を迫られた。', phonetic: 'ketsu-dan' }
    ],
    B2: [
      { word: '達成', meaning: '达成', example: '目標を達成できて嬉しい。', phonetic: 'tas-sei' },
      { word: '洗練', meaning: '精致；老练', example: '彼女は洗練された趣味を持っている。', phonetic: 'sen-ren' },
      { word: '視点', meaning: '视角', example: '違う視点で考えてみよう。', phonetic: 'shi-ten' },
      { word: '十分', meaning: '足够', example: '時間は十分あります。', phonetic: 'juu-bun' },
      { word: '交渉', meaning: '谈判', example: '条件を交渉します。', phonetic: 'kou-shou' }
    ],
    C1: [
      { word: '内在', meaning: '内在；固有', example: 'この計画には内在的なリスクがある。', phonetic: 'nai-zai' },
      { word: '曖昧', meaning: '暧昧；含糊', example: '彼の回答は少し曖昧だった。', phonetic: 'ai-mai' },
      { word: '実証', meaning: '实证', example: '実証データが必要だ。', phonetic: 'jit-shou' },
      { word: '実務的', meaning: '务实的', example: '実務的な解決策を考えましょう。', phonetic: 'jit-mu-te-ki' },
      { word: '精査', meaning: '仔细审查', example: '予算を精査します。', phonetic: 'sei-sa' }
    ],
    C2: [
      { word: '遍在', meaning: '无处不在', example: 'スマホはもはや遍在している。', phonetic: 'hen-zai' },
      { word: '並置', meaning: '并置', example: '対立する概念を並置する面白い作品。', phonetic: 'hei-chi' },
      { word: 'セレンディピティ', meaning: '意外的幸运发现', example: '発見はまさにセレンディピティだった。', phonetic: 'se-ren-di-pi-ti' },
      { word: '明確', meaning: '明确', example: '彼女は明確な答えを出した。', phonetic: 'mei-kaku' },
      { word: '儚い', meaning: '短暂；虚幻', example: '桜の花は儚い。', phonetic: 'ha-ka-nai' }
    ]
  };

  const jaGrammar = [
    { level: 'A1', q: '私 ___ 学生です。', type: 'choice', options: ['は', 'が', 'を', 'に'], answer: 0 },
    { level: 'A1', q: '朝ご飯 ___ 食べます。', type: 'choice', options: ['を', 'が', 'に', 'で'], answer: 0 },
    { level: 'A2', q: '昨日、映画 ___ 見ました。', type: 'choice', options: ['を', 'へ', 'に', 'で'], answer: 0 },
    { level: 'A2', q: '日本 ___ 行ったことがありますか。', type: 'choice', options: ['に', 'を', 'へ', 'で'], answer: 2 },
    { level: 'B1', q: 'もし時間があれば、日本語 ___ 勉強します。', type: 'choice', options: ['を', 'で', 'に', 'へ'], answer: 0 },
    { level: 'B1', q: '彼は後 ___ 電話すると言っていました。', type: 'choice', options: ['に', 'で', 'を', 'は'], answer: 0 },
    { level: 'B2', q: 'この本 ___ 有名な作家によって書かれました。', type: 'choice', options: ['は', 'を', 'が', 'に'], answer: 0 },
    { level: 'B2', q: '来年まで ___ 10年間ここで働いていることになります。', type: 'choice', options: ['に', 'で', 'は', 'を'], answer: 1 },
    { level: 'C1', q: '天気が悪かった ___ 、散歩に行きました。', type: 'choice', options: ['のに', 'ので', 'から', 'ため'], answer: 0 },
    { level: 'C1', q: '彼が会議に出席する ___ 重要だ。', type: 'choice', options: ['ことは', 'ものは', 'のは', 'わけは'], answer: 2 },
    { level: 'C2', q: '彼はすぐに弁護士を呼ぶ ___ 主張した。', type: 'choice', options: ['と', 'へ', 'を', 'に'], answer: 0 },
    { level: 'C2', q: '___ 、彼女は前向きでした。', type: 'choice', options: ['何度も失敗したが', '失敗しない', '失敗するので', '失敗しなければ'], answer: 0 }
  ];

  const jaSpeak = [
    { level: 'A1', sentence: 'おはようございます、今日はどうですか。', translation: '早上好，今天怎么样？' },
    { level: 'A2', sentence: 'コーヒーを一つお願いします。', translation: '请给我一杯咖啡。' },
    { level: 'B1', sentence: '一人旅は自分を成長させてくれると思います。', translation: '我认为独自旅行能让人成长。' },
    { level: 'B2', sentence: '雨が強かったですが、散歩に行くことにしました。', translation: '虽然雨很大，但我们还是去散步了。' },
    { level: 'C1', sentence: '政府は再生可能エネルギーにもっと投資すべきです。', translation: '政府应该对可再生能源投入更多。' },
    { level: 'C2', sentence: '私たちに必要なのは、働き方に対するパラダイムシフトだ。', translation: '我们需要的是对工作方式的范式转变。' }
  ];

  const jaListen = [
    {
      level: 'A2', script: 'A：すみません、駅はどこですか？ B：あそこを左に曲がって、2つ目です。',
      question: '何を尋ねていますか？', options: ['時間', '駅への道順', '喫茶店', 'パスポート'], answer: 1
    },
    {
      level: 'B1', script: 'A：週末はどうでしたか？ B：とてもよくて、友達とハイキングに行きました。',
      question: '男性は週末何をしましたか？', options: ['家にいた', 'ハイキングに行った', 'テレビを見た', '料理をした'], answer: 1
    },
    {
      level: 'B2', script: 'A：会議が木曜日の午後3時に変更になりました。 B：連絡ありがとうございます。',
      question: '会議はいつですか？', options: ['火曜午後3時', '水曜午前10時', '木曜午後3時', '金曜午前11時'], answer: 2
    },
    {
      level: 'C1', script: 'A：最近の市場変動を考えると、ポートフォリオを分散投資すべきです。 B：全く同感です。',
      question: '最初の発言者は何を提案していますか？', options: ['すべて売る', '分散投資', '金だけ買う', '会社を閉じる'], answer: 1
    }
  ];

  // ============= 韩语 KO =============
  const koWords = {
    A1: [
      { word: '안녕하세요', meaning: '你好', example: '안녕하세요, 처음 뵙겠습니다.', phonetic: 'an-nyeong-ha-se-yo' },
      { word: '감사합니다', meaning: '谢谢', example: '정말 감사합니다.', phonetic: 'gam-sa-ham-ni-da' },
      { word: '죄송합니다', meaning: '对不起', example: '늦어서 죄송합니다.', phonetic: 'joe-song-ham-ni-da' },
      { word: '물', meaning: '水', example: '물 좀 주세요.', phonetic: 'mul' },
      { word: '사과', meaning: '苹果', example: '사과를 먹어요.', phonetic: 'sa-gwa' }
    ],
    A2: [
      { word: '여행', meaning: '旅行', example: '다음 달에 일본으로 여행 가요.', phonetic: 'yeo-haeng' },
      { word: '친구', meaning: '朋友', example: '친구와 영화를 봤어요.', phonetic: 'chin-gu' },
      { word: '날씨', meaning: '天气', example: '오늘 날씨가 정말 좋네요.', phonetic: 'nal-ssi' },
      { word: '식당', meaning: '餐厅', example: '역 앞 식당에서 만나요.', phonetic: 'sik-ddang' },
      { word: '일', meaning: '工作；日', example: '오늘은 일이 바빠요.', phonetic: 'il' }
    ],
    B1: [
      { word: '경험', meaning: '经验', example: '정말 소중한 경험이었습니다.', phonetic: 'gyeong-heom' },
      { word: '기회', meaning: '机会', example: '다음 기회에 또 만나요.', phonetic: 'gi-hoe' },
      { word: '편안', meaning: '舒适', example: '이 호텔은 정말 편안해요.', phonetic: 'pyeon-an' },
      { word: '향상', meaning: '提高', example: '한국어 실력이 많이 향상되었어요.', phonetic: 'hyang-sang' },
      { word: '결단', meaning: '决断', example: '어려운 결단을 내려야 했어요.', phonetic: 'gyeol-dan' }
    ],
    B2: [
      { word: '달성', meaning: '达成', example: '목표를 달성해서 기뻐요.', phonetic: 'dal-seong' },
      { word: '세련', meaning: '精致；老练', example: '그녀는 세련된 취향을 가지고 있어요.', phonetic: 'se-ryeon' },
      { word: '관점', meaning: '视角', example: '다른 관점에서 생각해 봅시다.', phonetic: 'gwan-jeom' },
      { word: '충분', meaning: '足够', example: '시간은 충분히 있어요.', phonetic: 'chung-bun' },
      { word: '교섭', meaning: '谈判', example: '조건을 교섭할 거예요.', phonetic: 'gyo-seop' }
    ],
    C1: [
      { word: '내재', meaning: '内在；固有', example: '이 계획에는 내재된 위험이 있어요.', phonetic: 'nae-jae' },
      { word: '모호', meaning: '模糊；含糊', example: '그의 대답은 조금 모호했어요.', phonetic: 'mo-ho' },
      { word: '실증', meaning: '实证', example: '실증 데이터가 필요해요.', phonetic: 'sil-jeung' },
      { word: '실용적', meaning: '务实的', example: '실용적인 해결책을 찾아 봅시다.', phonetic: 'sil-yong-jeok' },
      { word: '정밀 검사', meaning: '仔细审查', example: '예산을 정밀 검사할 거예요.', phonetic: 'jeong-mil-geom-sa' }
    ],
    C2: [
      { word: '유비쿼터스', meaning: '无处不在', example: '스마트폰은 이제 유비쿼터스해요.', phonetic: 'u-bi-kweo-teo-seu' },
      { word: '병치', meaning: '并置', example: '대립되는 개념들을 병치시킨 흥미로운 작품.', phonetic: 'byeong-chi' },
      { word: '뜻밖의 행운', meaning: '意外的幸运发现', example: '발견은 정말 뜻밖의 행운이었어요.', phonetic: 'tteut-bak-ui-haeng-un' },
      { word: '명확', meaning: '明确', example: '그녀는 명확한 답을 내놨어요.', phonetic: 'myeong-hwak' },
      { word: '덧없는', meaning: '短暂；虚幻', example: '벚꽃은 덧없는 아름다움이에요.', phonetic: 'deot-eom-neun' }
    ]
  };

  const koGrammar = [
    { level: 'A1', q: '저 ___ 학생입니다.', type: 'choice', options: ['는', '이', '가', '을'], answer: 0 },
    { level: 'A1', q: '아침을 ___ 요.', type: 'choice', options: ['먹', '먹어', '먹고', '먹으'], answer: 1 },
    { level: 'A2', q: '어제 영화를 ___ 요.', type: 'choice', options: ['보', '봤어', '보고', '볼'], answer: 1 },
    { level: 'A2', q: '한국 ___ 가 본 적이 있어요?', type: 'choice', options: ['에', '를', '으로', '에서'], answer: 0 },
    { level: 'B1', q: '시간이 있다면 한국어 ___ 공부할 거예요.', type: 'choice', options: ['를', '으로', '에', '에서'], answer: 0 },
    { level: 'B1', q: '나중에 전화 ___ 라고 했어요.', type: 'choice', options: ['할', '한다고', '하고', '하는'], answer: 1 },
    { level: 'B2', q: '이 책은 유명한 작가 ___ 썼습니다.', type: 'choice', options: ['가', '이', '에 의해', '으로'], answer: 2 },
    { level: 'B2', q: '내년까지 여기서 10년 ___ 일하고 있을 겁니다.', type: 'choice', options: ['간', '동안', '만에', '까지'], answer: 1 },
    { level: 'C1', q: '날씨가 안 좋았 ___ 산책하러 갔어요.', type: 'choice', options: ['지만', '는데', '아서', '므로'], answer: 0 },
    { level: 'C1', q: '그가 회의에 참석하는 ___ 중요해요.', type: 'choice', options: ['것은', '것이', '는 것은', '것이라고'], answer: 2 },
    { level: 'C2', q: '변호사를 즉시 부를 ___ 주장했어요.', type: 'choice', options: ['라고', '이라고', '으로', '에서'], answer: 0 },
    { level: 'C2', q: '___ 그녀는 여전히 낙관적이었어요.', type: 'choice', options: ['여러 번 실패했지만', '실패하지 않고', '실패해서', '실패하기는'], answer: 0 }
  ];

  const koSpeak = [
    { level: 'A1', sentence: '안녕하세요, 오늘 기분이 어때요?', translation: '你好，今天心情怎么样？' },
    { level: 'A2', sentence: '커피 한 잔 주세요.', translation: '请给我一杯咖啡。' },
    { level: 'B1', sentence: '혼자 여행하는 것은 스스로 성장하게 도와주는 것 같아요.', translation: '我觉得独自旅行能帮助自己成长。' },
    { level: 'B2', sentence: '비가 많이 왔지만 산책하러 가기로 했어요.', translation: '虽然雨很大，但我们还是去散步了。' },
    { level: 'C1', sentence: '정부는 재생 가능 에너지에 더 많이 투자해야 해요.', translation: '政府应该对可再生能源投入更多。' },
    { level: 'C2', sentence: '우리에게 필요한 것은 일하는 방식에 대한 패러다임의 전환이에요.', translation: '我们需要的是对工作方式的范式转变。' }
  ];

  const koListen = [
    {
      level: 'A2', script: 'A：실례합니다, 역이 어디예요? B：저기서 왼쪽으로 두 번째예요.',
      question: '무엇을 물어보고 있나요?', options: ['시간', '역 위치', '카페', '여권'], answer: 1
    },
    {
      level: 'B1', script: 'A：주말 어땠어요? B：아주 좋았어요, 친구들과 하이킹 다녀왔어요.',
      question: '남자는 주말에 무엇을 했나요?', options: ['집에 있었다', '하이킹을 갔다', 'TV를 봤다', '요리를 했다'], answer: 1
    },
    {
      level: 'B2', script: 'A：회의가 목요일 오후 3시로 변경되었습니다. B：알려줘서 고마워요.',
      question: '회의는 언제인가요?', options: ['화요일 오후3시', '수요일 오전10시', '목요일 오후3시', '금요일 오전11시'], answer: 2
    },
    {
      level: 'C1', script: 'A：최근 시장 변동을 고려하면 포트폴리오를 분산 투자해야 해요. B：전적으로 동의해요.',
      question: '첫 번째 발언자는 무엇을 제안하나요?', options: ['모두 매도', '분산 투자', '금만 매수', '회사 폐업'], answer: 1
    }
  ];

  // ============= 生成通用课程大纲（根据级别生成 4-8 课，每课 15-20 分钟）=============
  function buildLessons(lang) {
    const titles = {
      en: {
        A1: ['Greetings and introductions', 'Numbers and everyday objects', 'Colors and simple descriptions', 'Present simple "be"'],
        A2: ['Daily routines', 'Food and restaurants', 'Weather and seasons', 'Past simple basics'],
        B1: ['Talking about experiences', 'Travel and plans', 'Opinions and debates', 'Conditionals and reported speech'],
        B2: ['Work and career', 'Technology and society', 'Environment and sustainability', 'Advanced grammar review'],
        C1: ['Abstract ideas', 'Cultural differences', 'Formal writing', 'Idioms and colloquialisms'],
        C2: ['Academic reading', 'Rhetoric and argumentation', 'Subtle nuances and register', 'Proverb and idiom mastery']
      },
      ja: {
        A1: ['挨拶と自己紹介', '数字と日常品', '色と簡単な描写', '「です・ます」の基本'],
        A2: ['日常生活', '食事とレストラン', '天気と季節', 'ます形／ました形'],
        B1: ['経験について話す', '旅行と予定', '意見と議論', '条件文と間接話法'],
        B2: ['仕事とキャリア', 'テクノロジーと社会', '環境と持続可能性', '高度な文法総復習'],
        C1: ['抽象的な考え', '文化の違い', 'フォーマルなライティング', 'イディオムと口語'],
        C2: ['学術的リーディング', 'レトリックと議論', '微妙なニュアンス', 'ことわざとイディオム']
      },
      ko: {
        A1: ['인사와 자기소개', '숫자와 일상 물건', '색깔과 간단한 묘사', '-입니다 / -아요'],
        A2: ['일상 생활', '음식과 식당', '날씨와 계절', '과거형 기본'],
        B1: ['경험 이야기', '여행과 계획', '의견과 토론', '조건문과 간접 화법'],
        B2: ['직장과 커리어', '기술과 사회', '환경과 지속 가능성', '고급 문법 종합'],
        C1: ['추상적인 아이디어', '문화 차이', '격식 있는 글쓰기', '관용구와 구어'],
        C2: ['학술적 읽기', '수사와 논증', '미묘한 뉘앙스', '속담과 관용구 마스터']
      }
    };
    const lessons = [];
    LEVELS.forEach((lv, idx) => {
      const list = titles[lang][lv];
      list.forEach((t, i) => {
        lessons.push({
          id: `${lang}-${lv}-${i + 1}`,
          level: lv,
          order: idx * 10 + i + 1,
          title: t,
          minutes: 15 + (i % 3) * 5,
          type: ['reading', 'grammar', 'listening', 'speaking'][i % 4]
        });
      });
    });
    return lessons;
  }

  function buildWords(words) {
    const out = [];
    LEVELS.forEach(lv => {
      (words[lv] || []).forEach((w, i) => {
        out.push({
          id: `${lv}-${i}-${w.word}`,
          level: lv,
          word: w.word,
          meaning: w.meaning,
          example: w.example,
          phonetic: w.phonetic
        });
      });
    });
    return out;
  }

  // ============= 社区示例帖子 =============
  const samplePosts = [
    { user: 'haru', lang: 'ja', title: '日本語の敬語、難しいけど面白い', body: '丁寧語・尊敬語・謙譲語を整理してから、会話がぐっとスムーズになりました。', likes: 12, ts: Date.now() - 86400000 * 2 },
    { user: 'lina', lang: 'en', title: '30 天口语打卡计划 Day 7', body: '每天大声朗读 5 分钟，一周后明显感觉舌头更灵活了。', likes: 24, ts: Date.now() - 86400000 },
    { user: 'minsu', lang: 'ko', title: 'TOPIK 2 级备考经验分享', body: '先把常用 500 词背熟，再刷真题 3 遍，基本就稳了。', likes: 31, ts: Date.now() - 86400000 * 3 },
    { user: 'kenji', lang: 'en', title: 'Sharing my B2 speaking routine', body: 'I record myself for 2 minutes every day and then listen back for pronunciation.', likes: 9, ts: Date.now() - 86400000 * 5 }
  ];

  // ============= 成就徽章 =============
  const badgeDefs = [
    { id: 'first_login', title: '初次登录', desc: '完成第一次登录', icon: '🌱', check: (s) => s.loggedInAt.length > 0 },
    { id: 'streak_3', title: '坚持三天', desc: '连续 3 天学习', icon: '🔥', check: (s) => s.streak >= 3 },
    { id: 'streak_7', title: '一周习惯', desc: '连续 7 天学习', icon: '🌟', check: (s) => s.streak >= 7 },
    { id: 'streak_30', title: '月度修行', desc: '连续 30 天学习', icon: '🏆', check: (s) => s.streak >= 30 },
    { id: 'words_50', title: '单词新星', desc: '掌握 50 个单词', icon: '📖', check: (s) => s.masteredWords >= 50 },
    { id: 'words_200', title: '单词达人', desc: '掌握 200 个单词', icon: '📚', check: (s) => s.masteredWords >= 200 },
    { id: 'lesson_10', title: '课程开始', desc: '完成 10 节课', icon: '🎯', check: (s) => s.doneLessons.length >= 10 },
    { id: 'lesson_50', title: '课程达人', desc: '完成 50 节课', icon: '🎓', check: (s) => s.doneLessons.length >= 50 },
    { id: 'speak_10', title: '开口的勇气', desc: '完成 10 次口语练习', icon: '🎙️', check: (s) => (s.speakCount || 0) >= 10 },
    { id: 'listen_10', title: '听力敏锐', desc: '完成 10 次听力练习', icon: '👂', check: (s) => (s.listenCount || 0) >= 10 },
    { id: 'community_1', title: '初次发声', desc: '在社区发布第一条帖子', icon: '💬', check: (s) => s.myPosts.length >= 1 },
    { id: 'xp_1000', title: '经验值 1000', desc: '累计 XP 达到 1000', icon: '⭐', check: (s) => s.xp >= 1000 }
  ];

  global.LinguaData = {
    LEVELS,
    languages: {
      en: {
        name: '英语',
        ttsCode: 'en-US',
        words: buildWords(enWords),
        grammar: enGrammar,
        speak: enSpeak,
        listen: enListen,
        lessons: buildLessons('en')
      },
      ja: {
        name: '日语',
        ttsCode: 'ja-JP',
        words: buildWords(jaWords),
        grammar: jaGrammar,
        speak: jaSpeak,
        listen: jaListen,
        lessons: buildLessons('ja')
      },
      ko: {
        name: '韩语',
        ttsCode: 'ko-KR',
        words: buildWords(koWords),
        grammar: koGrammar,
        speak: koSpeak,
        listen: koListen,
        lessons: buildLessons('ko')
      }
    },
    samplePosts,
    badgeDefs
  };
})(window);
