// Auto-generated from https://kcwikizh.github.io/kcwiki-quest-data/data.json
// Generated: 2026-06-19T16:26:11.703Z
// Quest entries: 446

import type { QuestDefinition } from "./quest-data.js";

export const GENERATED_QUEST_DEFINITIONS = [
  {
    "id": 101,
    "wikiId": "A01",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "はじめての「編成」！",
    "detail": "２隻以上の艦で構成される「艦隊」を編成せよ！",
    "materialRewards": [
      20,
      20,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "ship",
        "name": "白雪",
        "masterId": 10,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 102,
    "wikiId": "A02",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「駆逐隊」を編成せよ！",
    "detail": "駆逐艦４隻以上で構成される「駆逐隊」を編成せよ！",
    "materialRewards": [
      30,
      30,
      30,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      101
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "駆逐",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 103,
    "wikiId": "A03",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「水雷戦隊」を編成せよ！",
    "detail": "軽巡洋艦を旗艦とし、数隻の駆逐艦で構成される「水雷戦隊」を編成せよ！",
    "materialRewards": [
      40,
      40,
      0,
      40
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      102
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 104,
    "wikiId": "A04",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "６隻編成の艦隊を編成せよ！",
    "detail": "全6隻で構成される主力艦隊を編成せよ！",
    "materialRewards": [
      50,
      0,
      50,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "第2艦隊開放",
        "amount": 1
      }
    ],
    "prerequisites": [
      103
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "艦",
          "amount": 6
        }
      ]
    }
  },
  {
    "id": 105,
    "wikiId": "A05",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "軽巡２隻を擁する隊を編成せよ！",
    "detail": "軽巡洋艦２隻を擁する高速艦隊を編成せよ！",
    "materialRewards": [
      60,
      60,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      103
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "軽巡",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 106,
    "wikiId": "A07",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「重巡戦隊」を編成せよ！",
    "detail": "重巡洋艦２隻を擁する重巡艦隊を編成せよ！",
    "materialRewards": [
      0,
      70,
      0,
      30
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      105
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "重巡",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 107,
    "wikiId": "A12",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「空母機動部隊」を編成せよ！",
    "detail": "空母1隻以上を旗艦とし、その護衛艦艇と共に、空母機動部隊を編成せよ！",
    "materialRewards": [
      50,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      106
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "空母",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 108,
    "wikiId": "A08",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「天龍」型軽巡姉妹の全２艦を編成せよ！",
    "detail": "天龍型軽巡洋艦「天龍」「龍田」を同一艦隊に配属せよ！",
    "materialRewards": [
      100,
      100,
      100,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      105
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "天龍"
        },
        {
          "ship": "龍田"
        }
      ]
    }
  },
  {
    "id": 109,
    "wikiId": "A14",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「川内」型軽巡姉妹の全３艦を編成せよ！",
    "detail": "川内型軽巡洋艦「川内」「神通」「那珂」を同一艦隊に配属せよ！",
    "materialRewards": [
      100,
      0,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "第3艦隊開放",
        "amount": 1
      }
    ],
    "prerequisites": [
      106
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "川内"
        },
        {
          "ship": "神通"
        },
        {
          "ship": "那珂"
        }
      ]
    }
  },
  {
    "id": 110,
    "wikiId": "A15",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「妙高」型重巡姉妹の全４隻を編成せよ！",
    "detail": "妙高型重巡洋艦「妙高」「那智」「足柄」「羽黒」を同一艦隊に配属せよ！",
    "materialRewards": [
      150,
      100,
      150,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      109
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "妙高"
        },
        {
          "ship": "那智"
        },
        {
          "ship": "足柄"
        },
        {
          "ship": "羽黒"
        }
      ]
    }
  },
  {
    "id": 111,
    "wikiId": "A17",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「扶桑」型戦艦姉妹の全２隻を編成せよ！",
    "detail": "扶桑型戦艦「扶桑」「山城」を同一艦隊に配属せよ！",
    "materialRewards": [
      200,
      200,
      200,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      108
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "扶桑"
        },
        {
          "ship": "山城"
        }
      ]
    }
  },
  {
    "id": 112,
    "wikiId": "A18",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「伊勢」型戦艦姉妹の全２隻を編成せよ！",
    "detail": "伊勢型戦艦「伊勢」「日向」を同一艦隊に配属せよ！",
    "materialRewards": [
      300,
      200,
      300,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      111
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "伊勢"
        },
        {
          "ship": "日向"
        }
      ]
    }
  },
  {
    "id": 113,
    "wikiId": "A13",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "戦艦と重巡による主力艦隊を編成せよ！",
    "detail": "戦艦1隻以上、重巡2隻以上を主力とした水上打撃艦隊を編成せよ！",
    "materialRewards": [
      0,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      107
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "戦艦",
          "amount": 1
        },
        {
          "ship": "重巡",
          "amount": 2
        }
      ],
      "disallowed": "航戦"
    }
  },
  {
    "id": 114,
    "wikiId": "A19",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「南雲機動部隊」を編成せよ！",
    "detail": "一航戦「赤城」「加賀」二航戦「飛龍」「蒼龍」からなる第一機動部隊を編成せよ！",
    "materialRewards": [
      500,
      500,
      500,
      500
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      }
    ],
    "prerequisites": [
      113
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "赤城"
        },
        {
          "ship": "加賀"
        },
        {
          "ship": "飛龍"
        },
        {
          "ship": "蒼龍"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 115,
    "wikiId": "A06",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "第２艦隊を編成せよ！",
    "detail": "二つ目の艦隊、第２艦隊の旗艦を指定して、第２艦隊を編成せよ！",
    "materialRewards": [
      50,
      50,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      104
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "艦",
          "amount": 1
        }
      ],
      "fleetid": 2
    }
  },
  {
    "id": 116,
    "wikiId": "A09",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「水上機母艦」を配備せよ！",
    "detail": "多数の水上偵察機を運用する「水上機母艦」を艦隊に配備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      104
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "水母",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 117,
    "wikiId": "A11",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "第２艦隊で空母機動部隊を編成せよ！",
    "detail": "第２艦隊に空母を配備して、空母機動部隊を編成せよ！",
    "materialRewards": [
      100,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      215
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "空母",
          "amount": 1
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ],
      "fleetid": 2
    }
  },
  {
    "id": 118,
    "wikiId": "A16",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「金剛」型による高速戦艦部隊を編成せよ！",
    "detail": "金剛型戦艦「金剛」「比叡」「榛名」「霧島」全４隻の高速戦艦を集中配備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "第4艦隊開放",
        "amount": 1
      }
    ],
    "prerequisites": [
      110
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "金剛"
        },
        {
          "ship": "比叡"
        },
        {
          "ship": "榛名"
        },
        {
          "ship": "霧島"
        }
      ]
    }
  },
  {
    "id": 119,
    "wikiId": "A20",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「三川艦隊」を編成せよ！",
    "detail": "「鳥海」「青葉」「加古」「古鷹」「天龍」を含む高速艦隊を編成せよ！",
    "materialRewards": [
      400,
      0,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      }
    ],
    "prerequisites": [
      113
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "鳥海"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "加古"
        },
        {
          "ship": "古鷹"
        },
        {
          "ship": "天龍"
        },
        {
          "ship": "高速艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 120,
    "wikiId": "A10",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第六駆逐隊」を編成せよ！",
    "detail": "「暁」「響」「雷」「電」4隻による第六駆逐隊を編成せよ！",
    "materialRewards": [
      150,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      116
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "暁"
        },
        {
          "ship": "響"
        },
        {
          "ship": "雷"
        },
        {
          "ship": "電"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 121,
    "wikiId": "A21",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第四戦隊」を編成せよ！",
    "detail": "「愛宕」「高雄」「鳥海」「摩耶」を基幹とした第四戦隊を編成せよ！",
    "materialRewards": [
      300,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      119
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "愛宕"
        },
        {
          "ship": "高雄"
        },
        {
          "ship": "鳥海"
        },
        {
          "ship": "摩耶"
        }
      ]
    }
  },
  {
    "id": 122,
    "wikiId": "A22",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「西村艦隊」を編成せよ！",
    "detail": "「扶桑」「山城」「最上」「時雨」を基幹とした西村艦隊を編成せよ！",
    "materialRewards": [
      200,
      200,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      121
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "扶桑"
        },
        {
          "ship": "山城"
        },
        {
          "ship": "最上"
        },
        {
          "ship": "時雨"
        }
      ]
    }
  },
  {
    "id": 123,
    "wikiId": "A23",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第五航空戦隊」を編成せよ！",
    "detail": "「翔鶴」「瑞鶴」を基幹とし、駆逐艦2隻を加えた第五航空戦隊を編成せよ！",
    "materialRewards": [
      300,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      122
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "翔鶴"
        },
        {
          "ship": "瑞鶴"
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 124,
    "wikiId": "A24",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新「三川艦隊」を編成せよ！",
    "detail": "「鳥海」「青葉」「衣笠」「加古」「古鷹」「天龍」からなる三川艦隊を編成せよ！",
    "materialRewards": [
      300,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      121
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "鳥海"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "衣笠"
        },
        {
          "ship": "加古"
        },
        {
          "ship": "古鷹"
        },
        {
          "ship": "天龍"
        }
      ]
    }
  },
  {
    "id": 125,
    "wikiId": "A25",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "潜水艦隊を編成せよ！",
    "detail": "伊号潜水艦2隻からなる潜水艦隊を編成せよ！",
    "materialRewards": [
      150,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      121
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": [
            "潜水艦",
            "潜水空母"
          ],
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 126,
    "wikiId": "A26",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "航空水上打撃艦隊を編成せよ！",
    "detail": "航空戦艦2隻と航空巡洋艦2隻を基幹とする艦隊を編成せよ！",
    "materialRewards": [
      0,
      0,
      200,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      122
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "航戦",
          "amount": 2
        },
        {
          "ship": "航巡",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 127,
    "wikiId": "A27",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "中規模潜水艦隊を編成せよ！",
    "detail": "伊号潜水艦3隻以上からなる潜水艦隊を編成せよ！",
    "materialRewards": [
      150,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      121
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": [
            "潜水艦",
            "潜水空母"
          ],
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 128,
    "wikiId": "A28",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第六戦隊」を編成せよ！",
    "detail": "「古鷹」「加古」「青葉」「衣笠」を基幹とした第六戦隊を編成せよ！",
    "materialRewards": [
      250,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      120
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "古鷹"
        },
        {
          "ship": "加古"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "衣笠"
        }
      ]
    }
  },
  {
    "id": 129,
    "wikiId": "A29",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第五艦隊」を編成せよ！",
    "detail": "「那智」「足柄」「多摩」「木曾」を中核とした「第五艦隊」を編成せよ！",
    "materialRewards": [
      200,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      }
    ],
    "prerequisites": [
      121
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "那智"
        },
        {
          "ship": "足柄"
        },
        {
          "ship": "多摩"
        },
        {
          "ship": "木曾"
        }
      ]
    }
  },
  {
    "id": 130,
    "wikiId": "A30",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第一水雷戦隊」を編成せよ！",
    "detail": "「阿武隈」「曙」「潮」「霞」「不知火」を中核とした「第一水雷戦隊」を編成せよ！",
    "materialRewards": [
      200,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      129
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "阿武隈"
        },
        {
          "ship": "曙"
        },
        {
          "ship": "潮"
        },
        {
          "ship": "霞"
        },
        {
          "ship": "不知火"
        }
      ]
    }
  },
  {
    "id": 131,
    "wikiId": "A31",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第八駆逐隊」を編成せよ！",
    "detail": "「朝潮」「満潮」「大潮」「荒潮」4隻による第八駆逐隊を編成せよ！",
    "materialRewards": [
      150,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      125
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "朝潮"
        },
        {
          "ship": "満潮"
        },
        {
          "ship": "大潮"
        },
        {
          "ship": "荒潮"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 132,
    "wikiId": "A32",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第十八駆逐隊」を編成せよ！",
    "detail": "「霞」「霰」「陽炎」「不知火」4隻による第十八駆逐隊を編成せよ！",
    "materialRewards": [
      180,
      180,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      239
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "霞"
        },
        {
          "ship": "霰"
        },
        {
          "ship": "陽炎"
        },
        {
          "ship": "不知火"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 133,
    "wikiId": "A33",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第三十駆逐隊(第一次)」を編成せよ！",
    "detail": "「睦月」「如月」「弥生」「望月」4隻による第三十駆逐隊(第一次)を編成せよ！",
    "materialRewards": [
      200,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      131
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "睦月"
        },
        {
          "ship": "如月"
        },
        {
          "ship": "弥生"
        },
        {
          "ship": "望月"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 134,
    "wikiId": "WA01",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "式の準備！(その参)",
    "detail": "第一艦隊旗艦に練度の高い(Lv.90以上～99以下)艦娘を配備して気持ちを整理せよ！",
    "materialRewards": [
      88,
      88,
      88,
      88
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      }
    ],
    "prerequisites": [
      306
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "艦",
          "flagship": true,
          "lv": [
            90,
            99
          ]
        }
      ]
    }
  },
  {
    "id": 135,
    "wikiId": "WA02",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新たなる旅立ち！",
    "detail": "第一艦隊旗艦に強い絆を結んだLv.100以上の艦娘を配備した6隻の艦隊を編成せよ！",
    "materialRewards": [
      200,
      200,
      200,
      200
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      245
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "艦",
          "flagship": true,
          "lv": [
            100,
            999
          ]
        },
        {
          "ship": "艦",
          "amount": 5
        }
      ]
    }
  },
  {
    "id": 136,
    "wikiId": "A34",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第三十駆逐隊(第二次)」を編成せよ！",
    "detail": "「睦月」「弥生」「卯月」「望月」4隻による第三十駆逐隊(第二次)を編成せよ！",
    "materialRewards": [
      220,
      220,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      133
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "睦月"
        },
        {
          "ship": "弥生"
        },
        {
          "ship": "卯月"
        },
        {
          "ship": "望月"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 137,
    "wikiId": "A35",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第五戦隊」を編成せよ！",
    "detail": "「妙高」「那智」「羽黒」を基幹とした第五戦隊を編成せよ！",
    "materialRewards": [
      0,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 5
      }
    ],
    "prerequisites": [
      248
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "妙高"
        },
        {
          "ship": "那智"
        },
        {
          "ship": "羽黒"
        }
      ]
    }
  },
  {
    "id": 138,
    "wikiId": "A36",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「第二航空戦隊」を編成せよ！",
    "detail": "「飛龍改二」(※旗艦)及び「蒼龍」を基幹とした二航戦(要駆逐艦2隻)を編成せよ！",
    "materialRewards": [
      0,
      0,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      128
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "飛龍改二",
          "flagship": true
        },
        {
          "ship": "蒼龍"
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 139,
    "wikiId": "A37",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "潜水艦隊「第六艦隊」を編成せよ！",
    "detail": "「潜水母艦」と複数の潜水艦(4隻以上)からなる潜水艦隊「第六艦隊」を編成せよ！",
    "materialRewards": [
      250,
      250,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      127
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "潜水母艦",
          "flagship": true
        },
        {
          "ship": [
            "潜水艦",
            "潜水空母"
          ],
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 140,
    "wikiId": "A38",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新型電探を配備せよ！",
    "detail": "新型電探運用試験のため、第一艦隊の旗艦に「妙高改二」を配備せよ！",
    "materialRewards": [
      300,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "22号対水上電探改四",
        "masterId": 88,
        "amount": 1
      }
    ],
    "prerequisites": [
      137
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "妙高改二",
          "flagship": true
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 141,
    "wikiId": "A39",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "再編成「第二航空戦隊」を強化せよ！",
    "detail": "「蒼龍改二」(※旗艦)及び「飛龍改二」を基幹とした二航戦(要駆逐艦2隻)を編成せよ！",
    "materialRewards": [
      0,
      0,
      0,
      450
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      250
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "蒼龍改二",
          "flagship": true
        },
        {
          "ship": "飛龍改二"
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 142,
    "wikiId": "A40",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第三戦隊」全艦集結せよ！",
    "detail": "第二次改装を完了した改装金剛型高速戦艦4隻を集結させよ！",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "試製35.6cm三連装砲",
        "masterId": 103,
        "amount": 1
      }
    ],
    "prerequisites": [
      246
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "金剛改二"
        },
        {
          "ship": "比叡改二"
        },
        {
          "ship": "榛名改二"
        },
        {
          "ship": "霧島改二"
        }
      ]
    }
  },
  {
    "id": 143,
    "wikiId": "A41",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「新型正規空母」を配備せよ！",
    "detail": "雲龍型航空母艦一番艦「雲龍」を第一艦隊機旗艦に配備せよ！",
    "materialRewards": [
      100,
      100,
      100,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      123
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "雲龍",
          "flagship": true
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 144,
    "wikiId": "A42",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "主力戦艦部隊「第二戦隊」を編成せよ！",
    "detail": "長門型2隻及び扶桑型2隻の計4隻の主力戦艦からなる第二戦隊を編成せよ！",
    "materialRewards": [
      0,
      250,
      250,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      132
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "長門"
        },
        {
          "ship": "陸奥"
        },
        {
          "ship": "扶桑"
        },
        {
          "ship": "山城"
        }
      ]
    }
  },
  {
    "id": 145,
    "wikiId": "A43",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "戦艦を主力とした水上打撃部隊を編成せよ！",
    "detail": "大和型・長門型・伊勢型・扶桑型のいずれか3隻と軽巡1隻他の水上打撃部隊を配備せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      258
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "shipclass": [
            "大和",
            "長門",
            "伊勢",
            "扶桑"
          ],
          "amount": 3
        },
        {
          "ship": "軽巡",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 146,
    "wikiId": "A45",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "改修工廠を準備せよ！",
    "detail": "第一艦隊の旗艦に工作艦「明石」を配備、改修工廠の準備を実施せよ！",
    "materialRewards": [
      100,
      0,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 5
      },
      {
        "kind": "special",
        "name": "改修工廠開放",
        "amount": 1
      }
    ],
    "prerequisites": [
      116
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "明石",
          "flagship": true
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 147,
    "wikiId": "A44",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「西村艦隊」を再編成せよ！",
    "detail": "「扶桑」「山城」「最上」「時雨」「満潮」を基幹とした西村艦隊を編成せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      }
    ],
    "prerequisites": [
      137,
      224
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "扶桑"
        },
        {
          "ship": "山城"
        },
        {
          "ship": "最上"
        },
        {
          "ship": "時雨"
        },
        {
          "ship": "満潮"
        }
      ]
    }
  },
  {
    "id": 148,
    "wikiId": "A46",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "軽快な「水上反撃部隊」を編成せよ！",
    "detail": "駆逐艦「霞」を旗艦とした重巡「足柄」及び軽巡1隻駆逐艦4隻の水上挺身部隊を編成せよ！",
    "materialRewards": [
      250,
      250,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      123
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "霞",
          "flagship": true
        },
        {
          "ship": "足柄"
        },
        {
          "ship": "軽巡",
          "amount": 1
        },
        {
          "ship": "駆逐",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 149,
    "wikiId": "A47",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第十一駆逐隊」を編成せよ！",
    "detail": "特I型駆逐艦「吹雪」「白雪」「初雪」「叢雲」4隻による第十一駆逐隊を編成せよ！",
    "materialRewards": [
      110,
      110,
      110,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      132
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "吹雪"
        },
        {
          "ship": "白雪"
        },
        {
          "ship": "初雪"
        },
        {
          "ship": "叢雲"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 150,
    "wikiId": "A48",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第二一駆逐隊」を編成せよ！",
    "detail": "「初春」「子日」「若葉」「初霜」4隻による第二一駆逐隊を編成せよ！",
    "materialRewards": [
      210,
      210,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      }
    ],
    "prerequisites": [
      267
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "初春"
        },
        {
          "ship": "子日"
        },
        {
          "ship": "若葉"
        },
        {
          "ship": "初霜"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 151,
    "wikiId": "A49",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第二二駆逐隊」を編成せよ！",
    "detail": "「皐月」「文月」「長月」他1隻計駆逐艦4隻による第二二駆逐隊を編成せよ！",
    "materialRewards": [
      220,
      220,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      271
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "皐月"
        },
        {
          "ship": "文月"
        },
        {
          "ship": "長月"
        },
        {
          "ship": "駆逐",
          "amount": 1
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 152,
    "wikiId": "A50",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「三川艦隊」を新編、突入準備せよ！",
    "detail": "第一艦隊において、「鳥海改ニ」を旗艦とする「三川艦隊」を編成せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      136,
      227
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "鳥海改二",
          "flagship": true
        },
        {
          "ship": [
            "天龍",
            "古鷹",
            "加古",
            "青葉",
            "夕張",
            "衣笠"
          ],
          "select": 5
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 153,
    "wikiId": "A51",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第十八戦隊」を新編成せよ！",
    "detail": "軽巡洋艦「天龍」「龍田」を基幹戦力とした「第十八戦隊」を4隻以上で新編成せよ！",
    "materialRewards": [
      180,
      180,
      0,
      180
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      274
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "天龍"
        },
        {
          "ship": "龍田"
        },
        {
          "ship": "艦",
          "amount": [
            2,
            99
          ]
        }
      ]
    }
  },
  {
    "id": 154,
    "wikiId": "A52",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "海上突入部隊を編成せよ！",
    "detail": "戦艦「比叡」「霧島」軽巡「長良」駆逐艦「暁」「雷」「電」による海上突入部隊を編成せよ！",
    "materialRewards": [
      0,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      227
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "比叡"
        },
        {
          "ship": "霧島"
        },
        {
          "ship": "長良"
        },
        {
          "ship": "暁"
        },
        {
          "ship": "雷"
        },
        {
          "ship": "電"
        }
      ]
    }
  },
  {
    "id": 155,
    "wikiId": "A53",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「第六駆逐隊」を編成せよ！",
    "detail": "「暁改二」を旗艦とした「響」「雷」「電」4隻による第六駆逐隊を編成せよ！",
    "materialRewards": [
      150,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "探照灯",
        "masterId": 74,
        "amount": 1
      }
    ],
    "prerequisites": [
      224
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "暁改二",
          "flagship": true
        },
        {
          "ship": "響"
        },
        {
          "ship": "雷"
        },
        {
          "ship": "電"
        }
      ]
    }
  },
  {
    "id": 156,
    "wikiId": "A54",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第一水雷戦隊」北方突入準備！",
    "detail": "「阿武隈」を旗艦として「響」「初霜」「若葉」「五月雨」「島風」による一水戦を編成せよ！",
    "materialRewards": [
      150,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      201,
      240
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "阿武隈",
          "flagship": true
        },
        {
          "ship": "響"
        },
        {
          "ship": "初霜"
        },
        {
          "ship": "若葉"
        },
        {
          "ship": "五月雨"
        },
        {
          "ship": "島風"
        }
      ]
    }
  },
  {
    "id": 157,
    "wikiId": "A55",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第一水雷戦隊」北方再突入準備！",
    "detail": "「阿武隈改二」を旗艦として「響」「夕雲」「長波」「秋雲」「島風」の一水戦を再編成せよ！",
    "materialRewards": [
      200,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      309
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "阿武隈改二",
          "flagship": true
        },
        {
          "ship": "響"
        },
        {
          "ship": "夕雲"
        },
        {
          "ship": "長波"
        },
        {
          "ship": "秋雲"
        },
        {
          "ship": "島風"
        }
      ]
    }
  },
  {
    "id": 158,
    "wikiId": "A92",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭無比「第一戦隊」抜錨準備！",
    "detail": "主力戦艦編成任務：第一艦隊旗艦に「長門改二」、同二番艦に「陸奥改二」から編成される第一戦隊を配備、精鋭無比の水上打撃艦隊を編成せよ！",
    "materialRewards": [
      0,
      800,
      800,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "41cm連装砲",
            "masterId": 8,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 8
          }
        ]
      },
      {
        "kind": "equipment",
        "name": "三式弾改",
        "masterId": 317,
        "amount": 1
      }
    ],
    "prerequisites": [
      856
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "長門改二",
          "flagship": true
        },
        {
          "ship": "陸奥改二",
          "place": 2
        }
      ]
    }
  },
  {
    "id": 161,
    "wikiId": "A56",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第五航空戦隊」を再編成せよ！",
    "detail": "「翔鶴」「瑞鶴」と随伴駆逐艦「朧」「秋雲」を基幹とした第五航空戦隊を再編成せよ！",
    "materialRewards": [
      300,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      123,
      264
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "翔鶴"
        },
        {
          "ship": "瑞鶴"
        },
        {
          "ship": "朧"
        },
        {
          "ship": "秋雲"
        }
      ]
    }
  },
  {
    "id": 162,
    "wikiId": "A57",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「第二一戦隊」出撃準備！",
    "detail": "「那智改二」「足柄改二」及び「多摩」「木曾」を基幹とした、第二一戦隊を編成せよ！",
    "materialRewards": [
      150,
      150,
      150,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      }
    ],
    "prerequisites": [
      152,
      263
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "那智改二"
        },
        {
          "ship": "足柄改二"
        },
        {
          "ship": "多摩"
        },
        {
          "ship": "木曾"
        }
      ]
    }
  },
  {
    "id": 163,
    "wikiId": "A58",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第十六戦隊(第一次)」を編成せよ！",
    "detail": "「足柄」を旗艦として「球磨」「長良」を擁する、第十六戦隊(第一次)を編成せよ！",
    "materialRewards": [
      150,
      150,
      150,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      119
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "足柄",
          "flagship": true
        },
        {
          "ship": "球磨"
        },
        {
          "ship": "長良"
        }
      ]
    }
  },
  {
    "id": 164,
    "wikiId": "A59",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第三航空戦隊」を編成せよ！",
    "detail": "「瑞鶴改」を旗艦とし、「瑞鳳」「千歳」「千代田」を加えた4隻の空母部隊を編成せよ！",
    "materialRewards": [
      200,
      200,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "熟練搭乗員",
        "itemId": 70,
        "amount": 1
      }
    ],
    "prerequisites": [
      264,
      624
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "瑞鶴改",
          "flagship": true
        },
        {
          "ship": "瑞鳳"
        },
        {
          "ship": "千歳航",
          "note": "軽母"
        },
        {
          "ship": "千代田航",
          "note": "軽母"
        }
      ]
    }
  },
  {
    "id": 165,
    "wikiId": "A60",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第四航空戦隊」を編成せよ！",
    "detail": "航空戦艦「伊勢改」及び「日向改」を基幹戦力とした第四航空戦隊を編成せよ！",
    "materialRewards": [
      0,
      200,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "瑞雲(六三四空)",
        "masterId": 79,
        "amount": 1
      }
    ],
    "prerequisites": [
      293
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "伊勢改"
        },
        {
          "ship": "日向改"
        }
      ]
    }
  },
  {
    "id": 166,
    "wikiId": "A61",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「小沢艦隊」を編成せよ！",
    "detail": "「瑞鶴改」旗艦、空母「瑞鳳改」「千歳」「千代田」及び「伊勢改」「日向改」を配備せよ！",
    "materialRewards": [
      300,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      165,
      266
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "瑞鶴改",
          "flagship": true
        },
        {
          "ship": "瑞鳳改"
        },
        {
          "ship": "千歳航",
          "note": "軽母"
        },
        {
          "ship": "千代田航",
          "note": "軽母"
        },
        {
          "ship": "伊勢改"
        },
        {
          "ship": "日向改"
        }
      ]
    }
  },
  {
    "id": 167,
    "wikiId": "A62",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新航空戦隊を編成せよ！",
    "detail": "改二改装を終えた翔鶴型航空母艦2隻と同護衛艦による新航空戦隊を新編成せよ！",
    "materialRewards": [
      0,
      300,
      300,
      300
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "熟練搭乗員",
        "itemId": 70,
        "amount": 1
      }
    ],
    "prerequisites": [
      632
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "翔鶴改二"
        },
        {
          "ship": "瑞鶴改二"
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 168,
    "wikiId": "A63",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第十六戦隊(第二次)」を編成せよ！",
    "detail": "「名取」を旗艦として「五十鈴」「鬼怒」を擁する、第十六戦隊(第二次)を編成せよ！",
    "materialRewards": [
      160,
      160,
      160,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      289
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "名取",
          "flagship": true
        },
        {
          "ship": "五十鈴"
        },
        {
          "ship": "鬼怒"
        }
      ]
    }
  },
  {
    "id": 169,
    "wikiId": "A64",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「新編成航空戦隊」を編成せよ！",
    "detail": "空母2隻+航空戦艦/航空巡洋艦2隻+駆逐艦2隻の新航空戦隊を編成せよ！",
    "materialRewards": [
      0,
      200,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      }
    ],
    "prerequisites": [
      287,
      295
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "空母",
          "amount": 2
        },
        {
          "ship": [
            "航巡",
            "航戦"
          ],
          "amount": 2
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 170,
    "wikiId": "A65",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精強な「水上反撃部隊」を再編成せよ！",
    "detail": "駆逐艦「霞」旗艦、「足柄」「大淀」「朝霜」「清霜」他の水上反撃部隊を再編成せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      }
    ],
    "prerequisites": [
      148,
      296
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "霞",
          "flagship": true
        },
        {
          "ship": "足柄"
        },
        {
          "ship": "大淀"
        },
        {
          "ship": "朝霜"
        },
        {
          "ship": "清霜"
        }
      ]
    }
  },
  {
    "id": 171,
    "wikiId": "A66",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第三十一戦隊(第一次)」を編成せよ！",
    "detail": "「五十鈴改二」旗艦、「皐月改二」「卯月改」を含む、対潜機動水上部隊を編成せよ！",
    "materialRewards": [
      310,
      310,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      216,
      295
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "五十鈴改二",
          "flagship": true
        },
        {
          "ship": "皐月改二"
        },
        {
          "ship": "卯月改"
        }
      ]
    }
  },
  {
    "id": 172,
    "wikiId": "A67",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第二七駆逐隊」を編成せよ！",
    "detail": "「白露改」旗艦、「時雨」「春雨」「五月雨」4隻による第二七駆逐隊を編成せよ！",
    "materialRewards": [
      0,
      270,
      270,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      131,
      216
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "白露改",
          "flagship": true
        },
        {
          "ship": "時雨"
        },
        {
          "ship": "春雨"
        },
        {
          "ship": "五月雨"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 173,
    "wikiId": "A68",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "強行高速輸送部隊を編成せよ！",
    "detail": "「川内改二」旗艦、「江風改二」「時雨改二」他駆逐2隻による水雷戦隊を編成せよ！",
    "materialRewards": [
      100,
      100,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      293
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "川内改二",
          "flagship": true
        },
        {
          "ship": "江風改二"
        },
        {
          "ship": "時雨改二"
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 174,
    "wikiId": "A69",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「水雷戦隊」を含む艦隊を再編成せよ！",
    "detail": "軽巡級を旗艦とした駆逐艦4隻からなる強力な水雷戦隊を含む艦隊を再編成せよ！",
    "materialRewards": [
      200,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      104
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 175,
    "wikiId": "A70",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「第八駆逐隊」を再編成せよ！",
    "detail": "「朝潮改二」を旗艦とした「満潮」「大潮」「荒潮」4隻による第八駆逐隊を再編成せよ！",
    "materialRewards": [
      200,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      239
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "朝潮改二",
          "flagship": true
        },
        {
          "ship": "大潮"
        },
        {
          "ship": "満潮"
        },
        {
          "ship": "荒潮"
        }
      ]
    }
  },
  {
    "id": 176,
    "wikiId": "A71",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭！八駆第一小隊！",
    "detail": "「朝潮改二丁」及び「大潮改二」を含む艦隊を編成せよ！",
    "materialRewards": [
      250,
      250,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      819
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "朝潮改二丁"
        },
        {
          "ship": "大潮改二"
        }
      ]
    }
  },
  {
    "id": 177,
    "wikiId": "A72",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第十九駆逐隊」を編成せよ！",
    "detail": "特型駆逐艦「磯波」「浦波」「綾波」「敷波」4隻による第十九駆逐隊を編成せよ！",
    "materialRewards": [
      190,
      190,
      190,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      }
    ],
    "prerequisites": [
      201,
      240
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "磯波"
        },
        {
          "ship": "浦波"
        },
        {
          "ship": "綾波"
        },
        {
          "ship": "敷波"
        }
      ]
    }
  },
  {
    "id": 178,
    "wikiId": "A73",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「第十六戦隊(第三次)」を編成せよ！",
    "detail": "「鬼怒」「青葉」「北上」「大井」を擁する、第十六戦隊(第三次)を編成せよ！",
    "materialRewards": [
      200,
      200,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      295
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "鬼怒"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "北上"
        },
        {
          "ship": "大井"
        }
      ]
    }
  },
  {
    "id": 179,
    "wikiId": "A74",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第十六戦隊」を再編成せよ！",
    "detail": "「鬼怒改二」を旗艦として、「北上改二」「大井改二」「球磨改」及び<br>「青葉改」「浦波改」「敷波改」から5隻、計6隻の精鋭「第十六戦隊」を再編成せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      835
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "鬼怒改二",
          "flagship": true
        },
        {
          "ship": [
            "北上改二",
            "大井改二",
            "球磨改",
            "青葉改",
            "浦波改",
            "敷波改"
          ],
          "select": 5
        }
      ]
    }
  },
  {
    "id": 180,
    "wikiId": "A75",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「第一戦隊」を編成せよ！",
    "detail": "編成任務：第一艦隊に新改装された長門型戦艦一番艦「長門改二」及び同二番艦「陸奥改」からなる<br>新編第一戦隊を配備せよ！",
    "materialRewards": [
      0,
      880,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      258
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "長門改二"
        },
        {
          "ship": "陸奥改"
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 181,
    "wikiId": "A76",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「第七戦隊」を編成せよ！",
    "detail": "編成任務：第一艦隊旗艦に新改装された改鈴谷型「熊野改二」、同二番艦に「鈴谷改二」、<br>僚艦に「最上改」「三隈改」を配した新編第七戦隊を配備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      700
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      303,
      851
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "熊野改二",
          "flagship": true
        },
        {
          "ship": "鈴谷改二",
          "place": 2
        },
        {
          "ship": "最上改"
        },
        {
          "ship": "三隈改"
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 182,
    "wikiId": "A77",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第四航空戦隊」を再編成せよ！",
    "detail": "編成任務：第一艦隊旗艦及び同二番艦に練度50以上の航空戦艦「伊勢」「日向」を配備、<br>随伴艦に軽巡洋艦1隻、駆逐艦2隻他を伴う精鋭「第四航空戦隊」を再編成せよ！",
    "materialRewards": [
      0,
      0,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "熟練搭乗員",
        "itemId": 70,
        "amount": 1
      }
    ],
    "prerequisites": [
      165,
      224
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": [
            "伊勢改",
            "日向改"
          ],
          "flagship": true,
          "lv": [
            50,
            999
          ]
        },
        {
          "ship": [
            "伊勢改",
            "日向改"
          ],
          "place": 2,
          "lv": [
            50,
            999
          ]
        },
        {
          "ship": "軽巡",
          "amount": 1
        },
        {
          "ship": "駆逐",
          "amount": 2
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 183,
    "wikiId": "A78",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "新編「第四水雷戦隊」を編成せよ！",
    "detail": "編成任務：第一艦隊旗艦に「由良改二」を配備、随伴艦に二駆「村雨」「夕立」「春雨」「五月雨」<br>他1隻の駆逐艦を配備、新編「第四水雷戦隊」を編成せよ！",
    "materialRewards": [
      400,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 4
      },
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      156,
      225
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "由良改二",
          "flagship": true
        },
        {
          "ship": "村雨"
        },
        {
          "ship": "夕立"
        },
        {
          "ship": "春雨"
        },
        {
          "ship": "五月雨"
        },
        {
          "ship": "駆逐",
          "amount": 1
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 184,
    "wikiId": "A79",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第二二駆逐隊」を再編成せよ！",
    "detail": "編成任務：「文月改二」「皐月改二」「水無月改」「長月改」の精強駆逐艦4隻の編成による<br>精鋭第二二駆逐隊を再編成せよ！",
    "materialRewards": [
      220,
      0,
      220,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 2
      }
    ],
    "prerequisites": [
      270
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "文月改二"
        },
        {
          "ship": "皐月改二"
        },
        {
          "ship": "水無月改"
        },
        {
          "ship": "長月改"
        }
      ]
    }
  },
  {
    "id": 185,
    "wikiId": "A80",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精強「任務部隊」を編成せよ！",
    "detail": "編成任務：第一艦隊旗艦に「Saratoga Mk.II」または同「Mod.2」を配備、随伴艦に<br>軽巡洋艦1隻、駆逐艦2隻以上を配した夜間作戦可能な機動部隊を新編せよ！",
    "materialRewards": [
      0,
      300,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "F6F-3",
            "masterId": 205,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "F4U-1D",
            "masterId": 233,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "TBF",
            "masterId": 256,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      114,
      201
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": [
            "Saratoga Mk.II",
            "Saratoga Mk.II Mod.2"
          ],
          "flagship": true
        },
        {
          "ship": "軽巡洋艦",
          "amount": 1
        },
        {
          "ship": "駆逐艦",
          "amount": 2
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 186,
    "wikiId": "A81",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "最精鋭「第八駆逐隊」を編成せよ！",
    "detail": "精鋭駆逐隊編成任務：「朝潮改二」「大潮改二」「荒潮改二」「満潮改二」の<br>最精鋭朝潮型駆逐艦4隻による新編「第八駆逐隊」の編成を完了せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      821,
      870
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "朝潮改二"
        },
        {
          "ship": "大潮改二"
        },
        {
          "ship": "荒潮改二"
        },
        {
          "ship": "満潮改二"
        }
      ]
    }
  },
  {
    "id": 187,
    "wikiId": "A82",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "「西村艦隊」第二戦隊随伴部隊、集結せよ！",
    "detail": "捷一号作戦準備任務：第一遊撃部隊第三部隊の中核となる第二戦隊の随伴艦を編成する。<br>各艦隊から艦艇を抽出、第三艦隊に「最上」「時雨」「満潮」「朝雲」「山雲」を配備せよ！",
    "materialRewards": [
      0,
      300,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "給糧艦「伊良湖」",
            "itemId": 59,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      }
    ],
    "prerequisites": [
      402,
      429
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "最上"
        },
        {
          "ship": "時雨"
        },
        {
          "ship": "満潮"
        },
        {
          "ship": "朝雲"
        },
        {
          "ship": "山雲"
        }
      ],
      "fleetid": 3
    }
  },
  {
    "id": 188,
    "wikiId": "A83",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「三一駆」第一小隊、抜錨準備！",
    "detail": "編成任務：「長波改二」旗艦、僚艦に「高波改」または「沖波改」「朝霜改」を配した、第三一駆逐隊第一小隊(2隻艦隊)を編成せよ！",
    "materialRewards": [
      200,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "戦闘糧食(特別なおにぎり)",
            "masterId": 241,
            "amount": 2
          }
        ]
      },
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      239,
      673
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "長波改二",
          "flagship": true
        },
        {
          "ship": [
            "高波改",
            "沖波改",
            "朝霜改"
          ],
          "select": 1
        }
      ]
    }
  },
  {
    "id": 189,
    "wikiId": "A84",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「四水戦」抜錨準備！",
    "detail": "四水戦(4Sd)特別編成：「村雨改二」旗艦と精鋭四水戦「由良改二」「夕立改二」「春雨改」「五月雨改」<br>「秋月改」より3隻、さらに主力艦2隻を配備した、有力な特務艦隊を編成、南方海域出撃に備えよ！",
    "materialRewards": [
      0,
      400,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "応急修理女神",
        "masterId": 43,
        "amount": 1
      }
    ],
    "prerequisites": [
      183,
      263
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "村雨改二",
          "flagship": true
        },
        {
          "ship": [
            "由良改二",
            "夕立改二",
            "春雨改",
            "五月雨改",
            "秋月改"
          ],
          "select": 3
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 190,
    "wikiId": "A85",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第二一駆逐隊」、抜錨準備！",
    "detail": "精鋭駆逐隊編成任務：捷一号作戦を支援する。同決戦正面の基地航空への資材輸送任務のため、<br>「若葉改」「初春改二」「初霜改二」を含む3～4隻の精鋭「第二一駆逐隊」の編成を完了せよ！",
    "materialRewards": [
      100,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      }
    ],
    "prerequisites": [
      269
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "若葉改"
        },
        {
          "ship": "初春改二"
        },
        {
          "ship": "初霜改二"
        },
        {
          "ship": "駆逐",
          "amount": [
            0,
            1
          ]
        }
      ]
    }
  },
  {
    "id": 191,
    "wikiId": "A86",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "改装「第十七駆逐隊」、再編始め！",
    "detail": "改装駆逐隊編成任務：改装した陽炎型駆逐艦「浦風改」「谷風改」、そして対空戦闘の激化に備え、<br>対空兵装を軸に大幅強化改装した「磯風乙改」「浜風乙改」による「第十七駆逐隊」を再編せよ！",
    "materialRewards": [
      170,
      170,
      170,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "補強増設",
        "itemId": 64,
        "amount": 1
      }
    ],
    "prerequisites": [
      680,
      808
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "浦風改",
          "amount": 1
        },
        {
          "ship": "谷風改",
          "amount": 1
        },
        {
          "ship": "磯風乙改",
          "amount": 1
        },
        {
          "ship": "浜風乙改",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 192,
    "wikiId": "A87",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第十八駆逐隊」を編成せよ！",
    "detail": "精鋭駆逐隊編成任務：「霰改二」「霞改二/改二乙」「陽炎改」「不知火改」4隻による精鋭「第十八駆逐隊」を編成せよ！",
    "materialRewards": [
      180,
      0,
      180,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      805
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "霰改二",
          "amount": 1
        },
        {
          "ship": [
            "霞改二",
            "霞改二乙"
          ],
          "amount": 1
        },
        {
          "ship": "陽炎改",
          "amount": 1
        },
        {
          "ship": "不知火改",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 193,
    "wikiId": "A88",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "最精鋭甲型駆逐艦、集結せよ！",
    "detail": "甲型駆逐隊編成任務：「陽炎改二」「不知火改二」「黒潮改二」を集中配備、さらに練度70以上の甲型駆逐艦【陽炎型/夕雲型駆逐艦】を3隻集中配備、精鋭艦隊型駆逐隊を編成せよ！",
    "materialRewards": [
      150,
      150,
      150,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "12.7cm連装砲C型改二",
            "masterId": 266,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      603,
      871
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "陽炎改二"
        },
        {
          "ship": "不知火改二"
        },
        {
          "ship": "黒潮改二"
        },
        {
          "shipclass": [
            "陽炎",
            "夕雲"
          ],
          "amount": 3,
          "lv": [
            70,
            999
          ]
        }
      ]
    }
  },
  {
    "id": 194,
    "wikiId": "A89",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第十八戦隊」を再編成せよ！",
    "detail": "旧式小型軽巡部隊の改装再編成：改天龍型軽巡「天龍改二」及び「龍田改二」の2隻で構成される精鋭「第十八戦隊」を再編成せよ！",
    "materialRewards": [
      180,
      0,
      180,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 5
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      275
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "天龍改二"
        },
        {
          "ship": "龍田改二"
        }
      ]
    }
  },
  {
    "id": 195,
    "wikiId": "A90",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精強「第十七駆逐隊」を編成せよ！",
    "detail": "改装甲型駆逐隊編成任務：対空兵装を軸に大幅強化改装した「磯風乙改」「浜風乙改」、そして対潜兵装を強化改装した「浦風丁改」「谷風丁改」による、精鋭「第十七駆逐隊」を編成せよ！",
    "materialRewards": [
      170,
      170,
      0,
      170
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘糧食",
            "itemId": 66,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 3
          }
        ]
      }
    ],
    "prerequisites": [
      191,
      603
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "磯風乙改"
        },
        {
          "ship": "浜風乙改"
        },
        {
          "ship": "浦風丁改"
        },
        {
          "ship": "谷風丁改"
        }
      ]
    }
  },
  {
    "id": 196,
    "wikiId": "A91",
    "category": 1,
    "type": 1,
    "period": "once",
    "title": "精鋭「第十駆逐隊」、抜錨準備！",
    "detail": "甲型駆逐艦編成任務：夕雲型駆逐艦「夕雲改二」および「巻雲改二」の2隻から成る精鋭第十駆逐隊(2隻編成)を編成せよ！",
    "materialRewards": [
      200,
      0,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 5
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      184
    ],
    "requirements": {
      "category": "fleet",
      "groups": [
        {
          "ship": "夕雲改二"
        },
        {
          "ship": "巻雲改二"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 201,
    "wikiId": "Bd01",
    "category": 2,
    "type": 2,
    "period": "daily",
    "title": "敵艦隊を撃破せよ！",
    "detail": "艦隊を出撃させ、敵艦隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      50,
      50,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      204
    ],
    "requirements": {
      "category": "sortie",
      "result": "B",
      "times": 1
    }
  },
  {
    "id": 202,
    "wikiId": "B01",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "はじめての「出撃」！",
    "detail": "艦隊を出撃させ、敵艦隊と交戦せよ！",
    "materialRewards": [
      20,
      20,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "times": 1
    }
  },
  {
    "id": 203,
    "wikiId": "B02",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "鎮守府正面海域を護れ！",
    "detail": "鎮守府正面海域に艦隊を出撃させ、敵艦の跳梁を阻止せよ！",
    "materialRewards": [
      30,
      30,
      30,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      202
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-1",
      "boss": true,
      "result": "B",
      "times": 1
    }
  },
  {
    "id": 204,
    "wikiId": "B04",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "南西諸島沖に出撃せよ！",
    "detail": "南西諸島沖に艦隊を出撃させ、敵艦隊と交戦せよ！",
    "materialRewards": [
      40,
      40,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      203
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-2",
      "times": 1
    }
  },
  {
    "id": 205,
    "wikiId": "B05",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "接近する「敵前衛艦隊」を迎撃せよ！",
    "detail": "南西諸島沖に接近する「敵前衛艦隊」を捕捉、これを撃滅せよ！",
    "materialRewards": [
      50,
      0,
      50,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      },
      {
        "kind": "ship",
        "name": "深雪",
        "masterId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      204
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-2",
      "boss": true,
      "result": "B",
      "times": 1
    }
  },
  {
    "id": 206,
    "wikiId": "B06",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「水雷戦隊」で出撃せよ！",
    "detail": "軽巡洋艦1隻を旗艦とし、複数の駆逐艦からなる水雷戦隊で出撃せよ！",
    "materialRewards": [
      60,
      60,
      0,
      60
    ],
    "rewards": [
      {
        "kind": "ship",
        "name": "龍田",
        "masterId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      205
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 207,
    "wikiId": "B07",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「重巡洋艦」を出撃させよ！",
    "detail": "重巡洋艦を旗艦とした艦隊を編成、これを出撃させよ！",
    "materialRewards": [
      70,
      0,
      70,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      206
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "groups": [
        {
          "ship": "重巡",
          "flagship": true
        }
      ]
    }
  },
  {
    "id": 208,
    "wikiId": "B08",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「戦艦」を出撃させよ！",
    "detail": "海上の覇者、戦艦を旗艦とした艦隊を編成、これを出撃させよ！",
    "materialRewards": [
      0,
      150,
      150,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      207
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "groups": [
        {
          "ship": "戦艦",
          "flagship": true
        }
      ],
      "disallowed": "航戦"
    }
  },
  {
    "id": 209,
    "wikiId": "B09",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「空母機動部隊」出撃せよ！",
    "detail": "空母1隻とその護衛艦艇で構成した空母機動部隊を出撃させよ！",
    "materialRewards": [
      200,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      208
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "groups": [
        {
          "ship": "空母",
          "amount": 1
        },
        {
          "ship": "他の艦",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 210,
    "wikiId": "Bd03",
    "category": 2,
    "type": 2,
    "period": "daily",
    "title": "敵艦隊を10回邀撃せよ！",
    "detail": "艦隊全力出撃！遊弋する敵艦隊を10回邀撃せよ！",
    "materialRewards": [
      150,
      150,
      200,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "battle",
      "times": 10
    }
  },
  {
    "id": 211,
    "wikiId": "Bd04",
    "category": 2,
    "type": 4,
    "period": "daily",
    "title": "敵空母を３隻撃沈せよ！",
    "detail": "艦隊の脅威となる敵空母群。これを捕捉撃滅し、3隻轟沈せよ！",
    "materialRewards": [
      150,
      150,
      150,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      201
    ],
    "requirements": {
      "category": "sink",
      "amount": 3,
      "ship": "敵空母"
    }
  },
  {
    "id": 212,
    "wikiId": "Bd06",
    "category": 2,
    "type": 5,
    "period": "daily",
    "title": "敵輸送船団を叩け！",
    "detail": "敵の輸送船5隻以上を撃沈し、敵の補給路を寸断せよ！",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      201
    ],
    "requirements": {
      "category": "sink",
      "amount": 5,
      "ship": "敵補給艦"
    }
  },
  {
    "id": 213,
    "wikiId": "Bw03",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "海上通商破壊作戦",
    "detail": "1週間で敵輸送船を20隻以上撃沈せよ！",
    "materialRewards": [
      500,
      0,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "sink",
      "amount": 20,
      "ship": "敵補給艦"
    }
  },
  {
    "id": 214,
    "wikiId": "Bw01",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "あ号作戦",
    "detail": "1週間の全力出撃を行い、可能な限り多くの敵艦隊を捕捉、これを迎撃せよ！",
    "materialRewards": [
      300,
      300,
      300,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "a-gou"
    }
  },
  {
    "id": 215,
    "wikiId": "B03",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "第２艦隊、出撃せよ！",
    "detail": "新たに編成した「第２艦隊」を出撃させよ！",
    "materialRewards": [
      0,
      0,
      200,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      115
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "fleetid": 2
    }
  },
  {
    "id": 216,
    "wikiId": "Bd02",
    "category": 2,
    "type": 2,
    "period": "daily",
    "title": "敵艦隊主力を撃滅せよ！",
    "detail": "艦隊を出撃させ、敵艦隊「主力」を捕捉！これを撃滅せよ！",
    "materialRewards": [
      50,
      50,
      50,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      201
    ],
    "requirements": {
      "category": "sortie",
      "times": 1
    }
  },
  {
    "id": 217,
    "wikiId": "B10",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "敵空母を撃沈せよ！",
    "detail": "敵機動部隊を捕捉し、これを邀撃、敵空母を轟沈せよ！",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "ship",
        "name": "赤城",
        "masterId": 83,
        "amount": 1
      }
    ],
    "prerequisites": [
      117
    ],
    "requirements": {
      "category": "sink",
      "amount": 1,
      "ship": "敵空母"
    }
  },
  {
    "id": 218,
    "wikiId": "Bd05",
    "category": 2,
    "type": 2,
    "period": "daily",
    "title": "敵補給艦を3隻撃沈せよ！",
    "detail": "艦隊を出撃させ、敵補給艦を捕捉、これを撃滅せよ！",
    "materialRewards": [
      100,
      50,
      200,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "sink",
      "amount": 3,
      "ship": "敵補給艦"
    }
  },
  {
    "id": 219,
    "wikiId": "B11",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「三川艦隊」出撃せよ！",
    "detail": "新編成した「三川艦隊」で出撃せよ！",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      119
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "groups": [
        {
          "ship": "鳥海"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "加古"
        },
        {
          "ship": "古鷹"
        },
        {
          "ship": "天龍"
        },
        {
          "ship": "高速艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 220,
    "wikiId": "Bw02",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "い号作戦",
    "detail": "有力な母艦航空隊で1週間の全力出撃を行い、可能な限り多くの敵空母を撃滅せよ！",
    "materialRewards": [
      0,
      500,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      218
    ],
    "requirements": {
      "category": "sink",
      "amount": 20,
      "ship": "敵空母"
    }
  },
  {
    "id": 221,
    "wikiId": "Bw04",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "ろ号作戦",
    "detail": "1週間の全力出撃を行い、敵輸送船団を捕捉・撃滅、敵の補給路を寸断せよ！",
    "materialRewards": [
      400,
      0,
      800,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      }
    ],
    "prerequisites": [
      214
    ],
    "requirements": {
      "category": "sink",
      "amount": 50,
      "ship": "敵補給艦"
    }
  },
  {
    "id": 222,
    "wikiId": "B12",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第六駆逐隊」出撃せよ！",
    "detail": "「暁」「響」「雷」「電」による第六駆逐隊、出撃せよ！",
    "materialRewards": [
      200,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      120,
      213
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "groups": [
        {
          "ship": "暁"
        },
        {
          "ship": "響"
        },
        {
          "ship": "雷"
        },
        {
          "ship": "電"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 223,
    "wikiId": "B13",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第四戦隊」出撃せよ！",
    "detail": "「愛宕」「高雄」「鳥海」「摩耶」を基幹とする第四戦隊で、バシー島沖の敵を撃滅せよ！",
    "materialRewards": [
      150,
      100,
      150,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      121
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-2",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "愛宕"
        },
        {
          "ship": "高雄"
        },
        {
          "ship": "鳥海"
        },
        {
          "ship": "摩耶"
        }
      ]
    }
  },
  {
    "id": 224,
    "wikiId": "B14",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「西村艦隊」出撃せよ！",
    "detail": "「扶桑」「山城」「最上」「時雨」を基幹とする西村艦隊で、オリョール海の敵を撃滅せよ！",
    "materialRewards": [
      400,
      0,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "家具箱（小）",
        "itemId": 10,
        "amount": 1
      }
    ],
    "prerequisites": [
      122
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "扶桑"
        },
        {
          "ship": "山城"
        },
        {
          "ship": "最上"
        },
        {
          "ship": "時雨"
        }
      ]
    }
  },
  {
    "id": 225,
    "wikiId": "B15",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第五航空戦隊」出撃せよ！",
    "detail": "「翔鶴」「瑞鶴」を基幹とする第五航空戦隊で、北方海域モーレイ海の敵を撃滅せよ！",
    "materialRewards": [
      200,
      200,
      0,
      700
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      123
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-1",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "翔鶴"
        },
        {
          "ship": "瑞鶴"
        }
      ]
    }
  },
  {
    "id": 226,
    "wikiId": "Bd07",
    "category": 2,
    "type": 2,
    "period": "daily",
    "title": "南西諸島海域の制海権を握れ！",
    "detail": "艦隊を南西諸島海域に全力出撃させ、多数の敵艦隊「主力」群を捕捉、撃滅せよ！",
    "materialRewards": [
      300,
      0,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      218
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-1 ~ 2-5",
      "boss": true,
      "result": "B",
      "times": 5
    }
  },
  {
    "id": 227,
    "wikiId": "B16",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新「三川艦隊」出撃せよ！",
    "detail": "完全編成した「三川艦隊」をもって、オリョール海の敵を撃滅せよ！",
    "materialRewards": [
      100,
      150,
      100,
      150
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      124
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "鳥海"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "衣笠"
        },
        {
          "ship": "加古"
        },
        {
          "ship": "古鷹"
        },
        {
          "ship": "天龍"
        }
      ]
    }
  },
  {
    "id": 228,
    "wikiId": "Bw05",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "海上護衛戦",
    "detail": "有力な対潜能力を持つ海上護衛隊によって、可能な限り多くの敵潜水艦を撃滅せよ！",
    "materialRewards": [
      600,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      }
    ],
    "prerequisites": [
      220
    ],
    "requirements": {
      "category": "sink",
      "amount": 15,
      "ship": "敵潜水艦"
    }
  },
  {
    "id": 229,
    "wikiId": "Bw06",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "敵東方艦隊を撃滅せよ！",
    "detail": "西方海域に出撃し、敵東方艦隊の主力を捕捉、これを撃滅せよ！",
    "materialRewards": [
      400,
      0,
      0,
      700
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      228
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-1 ~ 4-5",
      "boss": true,
      "result": "B",
      "times": 12
    }
  },
  {
    "id": 230,
    "wikiId": "Bd08",
    "category": 2,
    "type": 2,
    "period": "daily",
    "title": "敵潜水艦を制圧せよ！",
    "detail": "対潜能力の充実した艦隊で出撃、敵潜水艦狩りを実施せよ！",
    "materialRewards": [
      300,
      30,
      300,
      30
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      226
    ],
    "requirements": {
      "category": "sink",
      "amount": 6,
      "ship": "敵潜水艦"
    }
  },
  {
    "id": 231,
    "wikiId": "B17",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「潜水艦隊」出撃せよ！",
    "detail": "伊号潜水艦2隻からなる潜水艦隊でオリョール海の敵を撃滅せよ！",
    "materialRewards": [
      150,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      125
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": [
            "潜水艦",
            "潜水空母"
          ],
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 232,
    "wikiId": "B18",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「航空水上打撃艦隊」出撃せよ！",
    "detail": "航空戦艦2隻と航空巡洋艦2隻を基幹とする艦隊でカレー洋の制海権を握れ！",
    "materialRewards": [
      0,
      150,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      126
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-2",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "航戦",
          "amount": 2
        },
        {
          "ship": "航巡",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 233,
    "wikiId": "B19",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第六戦隊」出撃せよ！",
    "detail": "編成した「第六戦隊」をもって出撃し、オリョール海の敵を撃滅「完全勝利」せよ！",
    "materialRewards": [
      0,
      150,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      128
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "古鷹"
        },
        {
          "ship": "加古"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "衣笠"
        }
      ]
    }
  },
  {
    "id": 235,
    "wikiId": "B135",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "近海哨戒を実施せよ!",
    "detail": "哨戒任務：軽巡級1隻以上、駆逐艦または海防艦計3隻以上による艦隊で、鎮守府海域の南西諸島沖及び製油所地帯沿岸、南西諸島海域の南西諸島近海及びバシー海峡の哨戒を実施、敵を捕捉撃滅せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 3
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "25mm三連装機銃",
            "masterId": 40,
            "amount": 2
          }
        ]
      },
      {
        "kind": "useitem",
        "name": "戦闘詳報",
        "itemId": 78,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-2",
        "1-3",
        "2-1",
        "2-2"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true,
          "amount": 1
        },
        {
          "ship": [
            "駆逐",
            "海防艦"
          ],
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 236,
    "wikiId": "B136",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「二四駆逐隊」出撃せよ！",
    "detail": "二四駆出撃任務：「海風改二」を旗艦とし、「山風」「江風」「涼風」のうち2隻以上を含む艦隊を編成、東部オリョール海、沖ノ島海域、南方海域前面、サブ島沖海域に突入！敵艦隊を捕捉、撃滅せよ！",
    "materialRewards": [
      800,
      800,
      800,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "13号対空電探",
            "masterId": 27,
            "amount": 3
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      },
      {
        "kind": "equipment",
        "name": "12.7cm連装砲C型改二",
        "masterId": 266,
        "amount": 1
      }
    ],
    "prerequisites": [
      235,
      273
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "2-3",
        "2-4",
        "5-1",
        "5-3"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "海風改二",
          "flagship": true
        },
        {
          "ship": [
            "山風",
            "江風",
            "涼風"
          ],
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 237,
    "wikiId": "B138",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「羽黒」「神風」、出撃せよ！",
    "detail": "第五戦隊任務：「羽黒」「神風」を基幹として、他に重巡級1隻駆逐艦2隻、または駆逐艦4隻の艦隊で南西諸島近海、バシー海峡、東部オリョール海に出撃、敵艦隊と交戦、これを撃滅せよ！",
    "materialRewards": [
      516,
      0,
      1945,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      },
      {
        "kind": "furniture",
        "name": "「羽黒の護り」掛け軸",
        "furnitureId": 446,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "or",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "2-1",
            "2-2",
            "2-3"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "羽黒"
            },
            {
              "ship": "神風"
            },
            {
              "ship": [
                "航巡",
                "重巡"
              ],
              "amount": 1
            },
            {
              "ship": "駆逐",
              "amount": 2
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "2-1",
            "2-2",
            "2-3"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "羽黒"
            },
            {
              "ship": "神風"
            },
            {
              "ship": "駆逐",
              "amount": 4
            }
          ]
        }
      ]
    }
  },
  {
    "id": 239,
    "wikiId": "B20",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第八駆逐隊」出撃せよ！",
    "detail": "編成した「第八駆逐隊」を含む艦隊で出撃し、オリョール海の敵を撃滅せよ！",
    "materialRewards": [
      0,
      100,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      131
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "朝潮"
        },
        {
          "ship": "満潮"
        },
        {
          "ship": "大潮"
        },
        {
          "ship": "荒潮"
        }
      ]
    }
  },
  {
    "id": 240,
    "wikiId": "B21",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十八駆逐隊」出撃せよ！",
    "detail": "編成した「第十八駆逐隊」を含む艦隊で出撃し、北方海域モーレイ海の敵を撃滅せよ！",
    "materialRewards": [
      0,
      100,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      }
    ],
    "prerequisites": [
      132
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-1",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "霞"
        },
        {
          "ship": "霰"
        },
        {
          "ship": "陽炎"
        },
        {
          "ship": "不知火"
        }
      ]
    }
  },
  {
    "id": 241,
    "wikiId": "Bw07",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "敵北方艦隊主力を撃滅せよ！",
    "detail": "北方海域の深部に出撃し、敵北方艦隊の主力艦隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      300,
      300,
      400,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      }
    ],
    "prerequisites": [
      228
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-3 ~ 3-5",
      "boss": true,
      "result": "B",
      "times": 5
    }
  },
  {
    "id": 242,
    "wikiId": "Bw08",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "敵東方中枢艦隊を撃破せよ！",
    "detail": "西方海域カスガダマ島沖に出撃し、敵東方中枢艦隊を捕捉、これを撃破せよ！",
    "materialRewards": [
      500,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      229
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-4",
      "boss": true,
      "result": "B",
      "times": 1
    }
  },
  {
    "id": 243,
    "wikiId": "Bw09",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "南方海域珊瑚諸島沖の制空権を握れ！",
    "detail": "南方海域珊瑚諸島沖に出撃し、敵機動部隊本体を捕捉撃滅、これに完全勝利せよ！",
    "materialRewards": [
      0,
      300,
      0,
      800
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      }
    ],
    "prerequisites": [
      242
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-2",
      "boss": true,
      "result": "S",
      "times": 2
    }
  },
  {
    "id": 244,
    "wikiId": "B22",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第三十駆逐隊(第一次)」出撃せよ！",
    "detail": "「第三十駆逐隊(第一次)」を含む艦隊で出撃し、キス島沖の主力艦隊と交戦せよ！",
    "materialRewards": [
      100,
      100,
      100,
      500
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      133
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-2",
      "boss": true,
      "result": "C",
      "times": 1,
      "groups": [
        {
          "ship": "睦月"
        },
        {
          "ship": "如月"
        },
        {
          "ship": "弥生"
        },
        {
          "ship": "望月"
        }
      ]
    }
  },
  {
    "id": 245,
    "wikiId": "WB01",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "式の準備！(最終)",
    "detail": "練度の高い(Lv.90～99)第一艦隊旗艦で出撃し、オリョール海の暁に勝利を刻め！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "書類一式＆指輪",
        "amount": 1
      }
    ],
    "prerequisites": [
      134
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "艦",
          "flagship": true,
          "lv": [
            90,
            99
          ]
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 246,
    "wikiId": "WB02",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "二人でする初めての任務！",
    "detail": "強い絆を結んだ艦娘を旗艦とした第一艦隊でリランカ島へ出撃、敵中枢を撃滅せよ！",
    "materialRewards": [
      300,
      300,
      300,
      300
    ],
    "rewards": [
      {
        "kind": "furniture",
        "name": "煎餅布団",
        "furnitureId": 183,
        "amount": 1
      }
    ],
    "prerequisites": [
      135
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "艦",
          "flagship": true,
          "lv": [
            100,
            999
          ]
        }
      ],
      "fleetid": 1
    }
  },
  {
    "id": 247,
    "wikiId": "B23",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「航空戦艦」抜錨せよ！",
    "detail": "航空戦艦2隻を基幹とする艦隊で、西方海域カスガダマ島の敵勢力を撃破せよ！",
    "materialRewards": [
      0,
      300,
      300,
      900
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      }
    ],
    "prerequisites": [
      412
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-4",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "航戦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 248,
    "wikiId": "B24",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第三十駆逐隊」対潜哨戒！",
    "detail": "「第三十駆逐隊(第二次)」は直ちに抜錨！鎮守府正面の対潜哨戒を実施せよ！",
    "materialRewards": [
      330,
      330,
      330,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      136
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "C",
      "times": 1,
      "groups": [
        {
          "ship": "睦月"
        },
        {
          "ship": "弥生"
        },
        {
          "ship": "卯月"
        },
        {
          "ship": "望月"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 249,
    "wikiId": "Bm01",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "「第五戦隊」出撃せよ！",
    "detail": "「第五戦隊」は沖ノ島沖の戦闘哨戒を実施、敵艦隊主力を捕捉、これを撃滅せよ！",
    "materialRewards": [
      0,
      550,
      550,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 5
      },
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      }
    ],
    "prerequisites": [
      137
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "妙高"
        },
        {
          "ship": "那智"
        },
        {
          "ship": "羽黒"
        }
      ]
    }
  },
  {
    "id": 250,
    "wikiId": "B25",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「第二航空戦隊」出撃せよ！",
    "detail": "新編「二航戦」を基幹とした艦隊で、珊瑚諸島沖に出撃、敵機動部隊を撃滅せよ！",
    "materialRewards": [
      0,
      500,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      138
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "飛龍改二",
          "flagship": true
        },
        {
          "ship": "蒼龍"
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 251,
    "wikiId": "B26",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「第二航空戦隊」抜錨せよ！",
    "detail": "錬成を終え再編成「二航戦」を基幹とした艦隊で、敵リランカ島を空襲、破砕せよ！",
    "materialRewards": [
      500,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      141
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "蒼龍改二",
          "flagship": true
        },
        {
          "ship": "飛龍改二"
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 252,
    "wikiId": "B27",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "戦艦「榛名」出撃せよ！",
    "detail": "第二次改装実施した「榛名」を基幹とした艦隊で「南方海域」へ進出、敵艦隊主力を撃滅せよ！",
    "materialRewards": [
      100,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "試製35.6cm三連装砲",
        "masterId": 103,
        "amount": 1
      }
    ],
    "prerequisites": [
      248
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "榛名改二"
        }
      ]
    }
  },
  {
    "id": 253,
    "wikiId": "B28",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第六〇一航空隊」出撃せよ！",
    "detail": "雲龍型航空母艦「雲龍改」含む機動部隊で珊瑚島沖に出撃、敵機動部隊を撃滅せよ！",
    "materialRewards": [
      0,
      300,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "熟練艦載機整備員",
        "masterId": 108,
        "amount": 1
      }
    ],
    "prerequisites": [
      143
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "雲龍改"
        }
      ]
    }
  },
  {
    "id": 254,
    "wikiId": "B29",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「軽空母」戦隊、出撃せよ！",
    "detail": "軽空母1～2隻、軽巡1隻、駆逐艦3～4隻の艦隊でカムラン半島の敵を撃滅せよ！",
    "materialRewards": [
      0,
      300,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      105
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "軽母",
          "amount": [
            1,
            2
          ]
        },
        {
          "ship": "軽巡",
          "amount": 1
        },
        {
          "ship": "駆逐",
          "amount": [
            3,
            4
          ]
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 255,
    "wikiId": "B30",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「水雷戦隊」バシー島沖緊急展開",
    "detail": "軽巡を旗艦とした水雷戦隊(軽巡最大2隻他駆逐艦)でバシー島沖の敵を撃滅せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      206
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "軽巡",
          "amount": [
            1,
            2
          ],
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": [
            1,
            99
          ]
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 256,
    "wikiId": "Bm02",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "「潜水艦隊」出撃せよ！",
    "detail": "潜水艦戦力を中核とした艦隊で中部海域哨戒線へ反復出撃、敵戦力を漸減せよ！",
    "materialRewards": [
      0,
      600,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      255
    ],
    "requirements": {
      "category": "sortie",
      "map": "6-1",
      "boss": true,
      "result": "S",
      "times": 3
    }
  },
  {
    "id": 257,
    "wikiId": "Bm03",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "「水雷戦隊」南西へ！",
    "detail": "軽巡旗艦の水雷戦隊(軽巡最大3隻他駆逐艦)を急派、南西諸島防衛線で敵を撃滅せよ！",
    "materialRewards": [
      500,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      221
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-4",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true,
          "amount": [
            1,
            3
          ]
        },
        {
          "ship": "駆逐",
          "amount": [
            1,
            99
          ]
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 258,
    "wikiId": "B31",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第二戦隊」抜錨！",
    "detail": "「第二戦隊」を基幹とした艦隊でカレー洋に進出、反復出撃により敵海上兵力を撃滅せよ！",
    "materialRewards": [
      0,
      400,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "一式徹甲弾",
        "masterId": 116,
        "amount": 1
      }
    ],
    "prerequisites": [
      144
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-2",
      "boss": true,
      "result": "S",
      "times": 2,
      "groups": [
        {
          "ship": "長門"
        },
        {
          "ship": "陸奥"
        },
        {
          "ship": "扶桑"
        },
        {
          "ship": "山城"
        }
      ]
    }
  },
  {
    "id": 259,
    "wikiId": "Bm04",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "「水上打撃部隊」南方へ！",
    "detail": "戦艦3隻軽巡1隻他を基幹とした水上打撃部隊で南方海域へ進出、敵艦隊を撃滅せよ！",
    "materialRewards": [
      350,
      400,
      350,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      }
    ],
    "prerequisites": [
      145
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "shipclass": [
            "大和",
            "長門",
            "伊勢",
            "扶桑"
          ],
          "amount": 3
        },
        {
          "ship": "軽巡",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 260,
    "wikiId": "B32",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「戦艦部隊」北方海域に突入せよ！",
    "detail": "戦艦2隻と直援軽空母1隻(正規空母無し)基幹の艦隊で北方AL海域に突入、敵を撃滅せよ！",
    "materialRewards": [
      0,
      500,
      0,
      250
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "一式徹甲弾",
        "masterId": 116,
        "amount": 1
      }
    ],
    "prerequisites": [
      259
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "戦艦",
          "amount": [
            2,
            2
          ]
        },
        {
          "ship": "軽母",
          "amount": [
            1,
            1
          ]
        }
      ],
      "disallowed": "空母"
    }
  },
  {
    "id": 261,
    "wikiId": "Bw10",
    "category": 2,
    "type": 3,
    "period": "weekly",
    "title": "海上輸送路の安全確保に努めよ！",
    "detail": "鎮守府正面の対潜哨戒を反復実施し、安全な海上輸送路を確保せよ！",
    "materialRewards": [
      100,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      }
    ],
    "prerequisites": [
      146,
      221
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "A",
      "times": 3
    }
  },
  {
    "id": 262,
    "wikiId": "B33",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「西村艦隊」南方海域へ進出せよ！",
    "detail": "「西村艦隊」を南方海域に進出させ、敵主力艦隊へ突入、これを撃滅せよ！",
    "materialRewards": [
      0,
      0,
      500,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 5
      },
      {
        "kind": "useitem",
        "name": "勲章",
        "itemId": 57,
        "amount": 1
      }
    ],
    "prerequisites": [
      147
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "扶桑"
        },
        {
          "ship": "山城"
        },
        {
          "ship": "最上"
        },
        {
          "ship": "時雨"
        },
        {
          "ship": "満潮"
        }
      ]
    }
  },
  {
    "id": 263,
    "wikiId": "B34",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第六戦隊」南西海域へ出撃せよ！",
    "detail": "「古鷹」「加古」「青葉」「衣笠」を基幹とした「第六戦隊」で、沖ノ島沖の敵艦隊を撃滅せよ！",
    "materialRewards": [
      0,
      400,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      233
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "古鷹"
        },
        {
          "ship": "加古"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "衣笠"
        }
      ]
    }
  },
  {
    "id": 264,
    "wikiId": "Bm06",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "「空母機動部隊」西へ！",
    "detail": "航空母艦2隻(随伴駆逐艦2隻)を基幹とする空母機動艦隊で、カレー洋の敵艦隊を撃滅せよ！",
    "materialRewards": [
      0,
      0,
      600,
      800
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 2
      }
    ],
    "prerequisites": [
      221,
      239
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "空母",
          "amount": 2
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 265,
    "wikiId": "Bm05",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "海上護衛強化月間",
    "detail": "鎮守府正面海域の対潜哨戒を強化し、敵潜水艦を制圧、安全な海上輸送体制を確立せよ！",
    "materialRewards": [
      800,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 5
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      }
    ],
    "prerequisites": [
      240,
      249
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "A",
      "times": 10
    }
  },
  {
    "id": 266,
    "wikiId": "Bm07",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "「水上反撃部隊」突入せよ！",
    "detail": "駆逐艦を旗艦とした重巡1隻軽巡1隻駆逐艦4隻からなる水上挺身部隊、沖ノ島沖に突入せよ！",
    "materialRewards": [
      0,
      600,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      }
    ],
    "prerequisites": [
      148,
      264
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "駆逐",
          "flagship": true,
          "amount": 4
        },
        {
          "ship": "重巡",
          "amount": 1
        },
        {
          "ship": "軽巡",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 267,
    "wikiId": "B35",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十一駆逐隊」出撃せよ！",
    "detail": "「第十一駆逐隊」を含む艦隊で出撃し、オリョール海の敵を撃破せよ！",
    "materialRewards": [
      0,
      300,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      149
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "吹雪"
        },
        {
          "ship": "白雪"
        },
        {
          "ship": "初雪"
        },
        {
          "ship": "叢雲"
        }
      ]
    }
  },
  {
    "id": 268,
    "wikiId": "B36",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十一駆逐隊」対潜哨戒！",
    "detail": "「第十一駆逐隊」を含む艦隊で鎮守府正面へ展開、対潜哨戒を実施せよ！",
    "materialRewards": [
      400,
      0,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "三式水中探信儀",
        "masterId": 47,
        "amount": 1
      }
    ],
    "prerequisites": [
      149
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "C",
      "times": 1,
      "groups": [
        {
          "ship": "吹雪"
        },
        {
          "ship": "白雪"
        },
        {
          "ship": "初雪"
        },
        {
          "ship": "叢雲"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 269,
    "wikiId": "B37",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第二一駆逐隊」出撃せよ！",
    "detail": "「第二一駆逐隊」を含む艦隊で出撃し、北方海域モーレイ海の敵を撃滅せよ！",
    "materialRewards": [
      300,
      300,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      }
    ],
    "prerequisites": [
      150
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "初春"
        },
        {
          "ship": "子日"
        },
        {
          "ship": "若葉"
        },
        {
          "ship": "初霜"
        }
      ]
    }
  },
  {
    "id": 270,
    "wikiId": "B39",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第二二駆逐隊」出撃せよ！",
    "detail": "「第二二駆逐隊」を含む艦隊で南西諸島防衛線に出撃、敵主力艦隊を撃滅せよ！",
    "materialRewards": [
      0,
      0,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      151
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-4",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "皐月"
        },
        {
          "ship": "文月"
        },
        {
          "ship": "長月"
        },
        {
          "ship": "駆逐",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 271,
    "wikiId": "B38",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「那智戦隊」抜錨せよ！",
    "detail": "旗艦「那智」及び「初霜」「霞」「潮」「曙」他1隻の艦隊でバシー島沖の敵を撃滅せよ！",
    "materialRewards": [
      500,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      }
    ],
    "prerequisites": [
      249,
      269
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "那智",
          "flagship": true
        },
        {
          "ship": "初霜"
        },
        {
          "ship": "霞"
        },
        {
          "ship": "潮"
        },
        {
          "ship": "曙"
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 272,
    "wikiId": "B40",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「改装防空重巡」出撃せよ！",
    "detail": "摩耶改または摩耶改二及び軽巡1駆逐2隻を含む艦隊でオリョール海の敵艦隊を撃滅せよ！",
    "materialRewards": [
      300,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "三式弾",
        "masterId": 35,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "25mm三連装機銃",
        "masterId": 40,
        "amount": 1
      }
    ],
    "prerequisites": [
      416
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": [
            "摩耶改",
            "摩耶改二"
          ],
          "flagship": true
        },
        {
          "ship": "軽巡",
          "amount": 1
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 273,
    "wikiId": "B41",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「三川艦隊」ソロモン方面へ！",
    "detail": "第一艦隊に編成した「三川艦隊」を南方海域に進出させ、同方面の敵艦隊を撃滅せよ！",
    "materialRewards": [
      480,
      480,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      }
    ],
    "prerequisites": [
      307
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "鳥海改二",
          "flagship": true
        },
        {
          "ship": [
            "天龍",
            "古鷹",
            "加古",
            "青葉",
            "夕張",
            "衣笠"
          ],
          "select": 5
        }
      ]
    }
  },
  {
    "id": 274,
    "wikiId": "B42",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第六駆逐隊」対潜哨戒なのです！",
    "detail": "「第六駆逐隊」を含む艦隊で鎮守府正面へ展開、対潜哨戒を実施せよ！",
    "materialRewards": [
      200,
      200,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "九三式水中聴音機",
        "masterId": 46,
        "amount": 1
      }
    ],
    "prerequisites": [
      120
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "C",
      "times": 1,
      "groups": [
        {
          "ship": "暁"
        },
        {
          "ship": "響"
        },
        {
          "ship": "雷"
        },
        {
          "ship": "電"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 275,
    "wikiId": "B43",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "抜錨！「第十八戦隊」",
    "detail": "「天龍」「龍田」を基幹戦力とした「第十八戦隊」で出撃し、オリョール海の敵主力を撃滅せよ！",
    "materialRewards": [
      350,
      0,
      0,
      250
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      153
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "天龍"
        },
        {
          "ship": "龍田"
        }
      ]
    }
  },
  {
    "id": 276,
    "wikiId": "B44",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "海上突入部隊、進発せよ！",
    "detail": "「比叡」「霧島」「長良」「暁」「雷」「電」の艦隊で、南方海域進出作戦を実施、敵を撃滅せよ！",
    "materialRewards": [
      500,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 5
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      }
    ],
    "prerequisites": [
      154,
      243
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "比叡"
        },
        {
          "ship": "霧島"
        },
        {
          "ship": "長良"
        },
        {
          "ship": "暁"
        },
        {
          "ship": "雷"
        },
        {
          "ship": "電"
        }
      ]
    }
  },
  {
    "id": 277,
    "wikiId": "B45",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第六駆逐隊」対潜哨戒を徹底なのです！",
    "detail": "「第六駆逐隊」を含む艦隊で鎮守府正面で対潜哨戒を実施、敵潜水艦部隊を痛打せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "九三式水中聴音機",
        "masterId": 46,
        "amount": 1
      }
    ],
    "prerequisites": [
      155,
      274
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "暁"
        },
        {
          "ship": "響"
        },
        {
          "ship": "雷"
        },
        {
          "ship": "電"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 278,
    "wikiId": "B46",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第一水雷戦隊」ケ号作戦、突入せよ！",
    "detail": "北方突入準備を完了した「一水戦」で北方キス島に突入！包囲網を破り、友軍を救出せよ！",
    "materialRewards": [
      0,
      300,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      156
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-2",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "阿武隈",
          "flagship": true
        },
        {
          "ship": "響"
        },
        {
          "ship": "初霜"
        },
        {
          "ship": "若葉"
        },
        {
          "ship": "五月雨"
        },
        {
          "ship": "島風"
        }
      ]
    }
  },
  {
    "id": 279,
    "wikiId": "B47",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第一水雷戦隊」北方ケ号作戦、再突入！",
    "detail": "北方再突入準備の新編「一水戦」で北方キス島に再突入を敢行、同撤収作戦を完遂せよ！",
    "materialRewards": [
      0,
      400,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      }
    ],
    "prerequisites": [
      157,
      309
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "阿武隈改二",
          "flagship": true
        },
        {
          "ship": "響"
        },
        {
          "ship": "夕雲"
        },
        {
          "ship": "長波"
        },
        {
          "ship": "秋雲"
        },
        {
          "ship": "島風"
        }
      ]
    }
  },
  {
    "id": 280,
    "wikiId": "Bm08",
    "category": 2,
    "type": 6,
    "period": "monthly",
    "title": "兵站線確保！海上警備を強化実施せよ！",
    "detail": "海上警備任務：軽空母または軽巡級1隻、駆逐艦または海防艦を計3隻以上配備した海上護衛艦隊で、南西諸島沖警備、海上護衛作戦、南1号作戦、南西諸島哨戒を実施、各作戦海域の敵を撃滅せよ！",
    "materialRewards": [
      400,
      400,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 4
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 2
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "九五式爆雷",
            "masterId": 226,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "25mm単装機銃",
            "masterId": 49,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "給糧艦「伊良湖」",
            "itemId": 59,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      265,
      311
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-2",
        "1-3",
        "1-4",
        "2-1"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "軽空母",
            "軽巡"
          ],
          "amount": 1
        },
        {
          "ship": [
            "駆逐",
            "海防艦"
          ],
          "amount": [
            3,
            99
          ]
        }
      ]
    }
  },
  {
    "id": 281,
    "wikiId": "B129",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭無比「第一戦隊」まかり通る！",
    "detail": "第一艦隊第一戦隊、改装主力戦艦「長門改二」及び「陸奥改二」を中核とした水上打撃艦隊を編成、バシー海峡、北方AL海域戦闘哨戒、カレー洋リランカ島沖及び南方海域前面の敵を捕捉撃滅せよ！",
    "materialRewards": [
      800,
      800,
      800,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "41cm連装砲",
            "masterId": 8,
            "amount": 4
          },
          {
            "kind": "equipment",
            "name": "九一式徹甲弾",
            "masterId": 36,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "三式弾",
            "masterId": 35,
            "amount": 2
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "試製46cm連装砲",
            "masterId": 117,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "試製南山",
            "masterId": 148,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      158
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "2-2",
        "3-5",
        "4-5",
        "5-1"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "長門改二",
            "陸奥改二"
          ],
          "flagship": true
        },
        {
          "ship": [
            "長門改二",
            "陸奥改二"
          ],
          "place": 2
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 282,
    "wikiId": "B130",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭無比「第一戦隊」まかり通る！【拡張作戦】",
    "detail": "第一艦隊第一戦隊、改装主力戦艦「長門改二」及び「陸奥改二」を中核とした精鋭水上打撃艦隊を展開、南西諸島海域沖ノ島沖、南方海域サーモン海域北方、中部海域ピーコック島沖の敵戦力を撃滅せよ！",
    "materialRewards": [
      1000,
      1000,
      1000,
      1000
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 5
          },
          {
            "kind": "equipment",
            "name": "試製46cm連装砲",
            "masterId": 117,
            "amount": 1
          }
        ]
      },
      {
        "kind": "equipment",
        "name": "41cm連装砲改二",
        "masterId": 318,
        "amount": 1
      }
    ],
    "prerequisites": [
      281
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "2-5",
        "5-5",
        "6-4"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "長門改二",
            "陸奥改二"
          ],
          "flagship": true
        },
        {
          "ship": [
            "長門改二",
            "陸奥改二"
          ],
          "place": 2
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 283,
    "wikiId": "B137",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精強！'第一航空戦隊'出撃せよ！",
    "detail": "第一艦隊旗艦「赤城改二(改二戊)」同二番艦「加賀」の第一航空戦隊を中核とした艦隊で、カレー洋リランカ島沖、珊瑚諸島沖に展開！さらにKW環礁沖海域に反復出撃！鎧袖一触！敵を粉砕せよ！",
    "materialRewards": [
      0,
      0,
      1000,
      1000
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 5
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          }
        ]
      },
      {
        "kind": "equipment",
        "name": "流星改(一航戦)",
        "masterId": 342,
        "amount": 1
      }
    ],
    "prerequisites": [
      272,
      333
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "4-5",
            "5-2"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "赤城改二",
                "赤城改二戊"
              ],
              "flagship": true
            },
            {
              "ship": [
                "加賀",
                "加賀改"
              ],
              "place": 2
            }
          ]
        },
        {
          "category": "sortie",
          "times": 2,
          "map": "6-5",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "赤城改二",
                "赤城改二戊"
              ],
              "flagship": true
            },
            {
              "ship": [
                "加賀",
                "加賀改"
              ],
              "place": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 284,
    "wikiId": "Bq11",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "南西諸島方面「海上警備行動」発令！",
    "detail": "海上警備任務：軽空母または軽巡級1隻、駆逐艦または海防艦を計3隻以上配備した海上護衛艦隊で、南1号作戦、南西諸島哨戒、柳作戦、オリョール哨戒を実施、各作戦海域に出没する敵を撃滅せよ！",
    "materialRewards": [
      0,
      800,
      800,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "九四式爆雷投射機",
            "masterId": 44,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "ドラム缶(輸送用)",
            "masterId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "special",
        "name": "戦果80",
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      }
    ],
    "prerequisites": [
      280,
      303
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-4",
        "2-1",
        "2-2",
        "2-3"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "軽空母",
            "軽巡"
          ],
          "amount": 1
        },
        {
          "ship": [
            "駆逐",
            "海防艦"
          ],
          "amount": [
            3,
            99
          ]
        }
      ]
    }
  },
  {
    "id": 285,
    "wikiId": "B49",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「空母機動部隊」北方海域に進出せよ！",
    "detail": "航空母艦を旗艦とした空母機動部隊を北方AL海域方面に展開、敵戦力を撃滅せよ！",
    "materialRewards": [
      500,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "戦闘糧食",
        "masterId": 145,
        "amount": 2
      }
    ],
    "prerequisites": [
      230,
      260
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "空母",
          "flagship": true
        }
      ]
    }
  },
  {
    "id": 286,
    "wikiId": "B48",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "鎮守府正面の対潜哨戒を強化せよ！",
    "detail": "鎮守府正面の対潜哨戒を強化し、海上資源輸送路の安全を確立せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      201,
      205,
      216
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "A",
      "times": 4
    }
  },
  {
    "id": 287,
    "wikiId": "B50",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第五航空戦隊」珊瑚諸島沖に出撃せよ！",
    "detail": "再編成した「第五航空戦隊」を珊瑚諸島沖に展開、敵機動部隊を捕捉撃滅せよ！",
    "materialRewards": [
      0,
      500,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      161
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "翔鶴"
        },
        {
          "ship": "瑞鶴"
        },
        {
          "ship": "朧"
        },
        {
          "ship": "秋雲"
        }
      ]
    }
  },
  {
    "id": 288,
    "wikiId": "B51",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「第二一戦隊」北方へ出撃せよ！",
    "detail": "新編「第二一戦隊」を基幹とする艦隊で北方海域モーレイ海に出撃、敵を撃滅せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      }
    ],
    "prerequisites": [
      162
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-1",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "那智改二"
        },
        {
          "ship": "足柄改二"
        },
        {
          "ship": "多摩"
        },
        {
          "ship": "木曾"
        }
      ]
    }
  },
  {
    "id": 289,
    "wikiId": "B52",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十六戦隊(第一次)」出撃せよ！",
    "detail": "「第十六戦隊(第一次)」をバシー島沖に展開、敵艦隊を撃滅せよ！",
    "materialRewards": [
      200,
      0,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      }
    ],
    "prerequisites": [
      163
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "足柄",
          "flagship": true
        },
        {
          "ship": "球磨"
        },
        {
          "ship": "長良"
        }
      ]
    }
  },
  {
    "id": 290,
    "wikiId": "B128",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「比叡」の出撃",
    "detail": "「比叡」南方海域出撃任務：高速戦艦「比叡」を旗艦とする有力な戦隊で、南方海域サブ島沖海域及びサーモン海域に出撃。同作戦海域の敵戦隊と交戦、これを撃滅せよ！",
    "materialRewards": [
      0,
      1113,
      1942,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "“比睿” 挂轴",
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "96式150cm探照灯",
            "masterId": 140,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      287,
      673,
      674
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "5-3",
        "5-4"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "比叡",
          "flagship": true
        }
      ]
    }
  },
  {
    "id": 291,
    "wikiId": "B134",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "艦隊司令部の強化 【実施段階】",
    "detail": "艦隊司令部強化：「大淀」を旗艦、随伴艦に「明石」または水上機母艦を含む艦隊を編成、同艦隊で東部オリョール海、アルフォンシーノ方面、西方ジャム島沖に反復出撃、敵艦隊を捕捉撃滅せよ！",
    "materialRewards": [
      1200,
      1200,
      1200,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "家具箱（大）",
            "itemId": 12,
            "amount": 8
          },
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      },
      {
        "kind": "special",
        "name": "司令部要員",
        "amount": 1
      }
    ],
    "prerequisites": [
      431
    ],
    "requirements": {
      "category": "sortie",
      "times": 2,
      "map": [
        "2-3",
        "3-3",
        "4-1"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "大淀",
          "flagship": true
        },
        {
          "ship": [
            "明石",
            "水上機母艦"
          ]
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 292,
    "wikiId": "B133",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "重改装高速戦艦「金剛改二丙」、南方突入！",
    "detail": "南方海域出撃任務：「金剛改二丙」を旗艦、随伴艦に金剛型1隻、駆逐艦2隻以上を含む艦隊で、南方海域前面、サブ島沖海域、サーモン海域、同海域北方に反復突入、各海域の敵を撃滅せよ！",
    "materialRewards": [
      1944,
      2019,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      },
      {
        "kind": "equipment",
        "name": "35.6cm連装砲改二",
        "masterId": 329,
        "amount": 1
      }
    ],
    "prerequisites": [
      290
    ],
    "requirements": {
      "category": "sortie",
      "times": 2,
      "map": [
        "5-1",
        "5-3",
        "5-4",
        "5-5"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "金剛改二丙",
          "flagship": true
        },
        {
          "ship": [
            "比叡",
            "榛名",
            "霧島"
          ],
          "select": 1
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 293,
    "wikiId": "B53",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第三航空戦隊」南西諸島防衛線に出撃！",
    "detail": "編成した「第三航空戦隊」を南西諸島防衛線に展開、敵侵攻艦隊を捕捉撃滅せよ！",
    "materialRewards": [
      0,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      164
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-4",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "瑞鶴改",
          "flagship": true
        },
        {
          "ship": "瑞鳳"
        },
        {
          "ship": "千歳航",
          "note": "軽母"
        },
        {
          "ship": "千代田航",
          "note": "軽母"
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 294,
    "wikiId": "B54",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「小沢艦隊」出撃せよ！",
    "detail": "「小沢艦隊」を沖ノ島海域前面に展開し、侵攻する敵機動部隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      300,
      0,
      300,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "零戦52型丙(六〇一空)",
        "masterId": 109,
        "amount": 1
      }
    ],
    "prerequisites": [
      166
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-4",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "瑞鶴改",
          "flagship": true
        },
        {
          "ship": "瑞鳳改"
        },
        {
          "ship": "千歳航",
          "note": "軽母"
        },
        {
          "ship": "千代田航",
          "note": "軽母"
        },
        {
          "ship": "伊勢改"
        },
        {
          "ship": "日向改"
        }
      ]
    }
  },
  {
    "id": 295,
    "wikiId": "B55",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十六戦隊(第二次)」出撃せよ！",
    "detail": "「第十六戦隊(第二次)」をオリョール海に展開、敵主力艦隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      320,
      0,
      320,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      168
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "名取",
          "flagship": true
        },
        {
          "ship": "五十鈴"
        },
        {
          "ship": "鬼怒"
        },
        {
          "ship": "艦",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 296,
    "wikiId": "B56",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編成航空戦隊、北方へ進出せよ！",
    "detail": "「新編成航空戦隊」をアルフォンシーノ方面へ進出、敵泊地の機動部隊を撃滅せよ！",
    "materialRewards": [
      0,
      400,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      169
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "空母",
          "amount": 2
        },
        {
          "ship": [
            "航巡",
            "航戦"
          ],
          "amount": 2
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 297,
    "wikiId": "B57",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「礼号作戦」実施せよ！",
    "detail": "精強な「水上反撃部隊」で、南西諸島沖ノ島沖に突入！同海域の敵戦力を撃滅せよ！",
    "materialRewards": [
      300,
      700,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      }
    ],
    "prerequisites": [
      170,
      265
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "霞",
          "flagship": true
        },
        {
          "ship": "足柄"
        },
        {
          "ship": "大淀"
        },
        {
          "ship": "朝霜"
        },
        {
          "ship": "清霜"
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 298,
    "wikiId": "B124",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第七駆逐隊」、南西諸島を駆ける！",
    "detail": "「曙」「潮」「漣」「朧」からなる「第七駆逐隊」2隻以上を含む有力な艦隊を編成、南西諸島近海、バシー海峡、東部オリョール海、沖ノ島海域の敵戦力を撃滅、南西諸島海域の制海権を確保せよ！",
    "materialRewards": [
      700,
      700,
      700,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "12.7cm連装砲B型改二",
            "masterId": 63,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 8
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 5
          },
          {
            "kind": "equipment",
            "name": "零式水中聴音機",
            "masterId": 132,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      239,
      274
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "2-1",
        "2-2",
        "2-3",
        "2-4"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "曙",
            "潮",
            "漣",
            "朧"
          ],
          "select": 2
        }
      ]
    }
  },
  {
    "id": 299,
    "wikiId": "B125",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "近海の警戒監視と哨戒活動を強化せよ！",
    "detail": "軽巡旗艦、駆逐艦または海防艦2隻を含む艦隊を編成、南西諸島沖、製油所地帯沿岸、南西諸島防衛戦、南西諸島近海、バシー海峡を哨戒、敵艦隊を捕捉撃滅、近海の制海権を確立せよ！",
    "materialRewards": [
      800,
      800,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "探照灯",
            "masterId": 74,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      303
    ],
    "requirements": {
      "category": "sortie",
      "map": [
        "1-2",
        "1-3",
        "1-4",
        "2-1",
        "2-2"
      ],
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": [
            "駆逐",
            "海防艦"
          ],
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 301,
    "wikiId": "C01",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "はじめての「演習」！",
    "detail": "他の提督(プレイヤー)の艦隊と「演習」を行おう！",
    "materialRewards": [
      10,
      10,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 1
    }
  },
  {
    "id": 302,
    "wikiId": "C04",
    "category": 3,
    "type": 3,
    "period": "weekly",
    "title": "大規模演習",
    "detail": "今週中に「演習」で他の提督の艦隊に対して20回「勝利」しよう！",
    "materialRewards": [
      200,
      200,
      200,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      }
    ],
    "prerequisites": [
      303
    ],
    "requirements": {
      "category": "excercise",
      "times": 20,
      "victory": true
    }
  },
  {
    "id": 303,
    "wikiId": "C02",
    "category": 3,
    "type": 2,
    "period": "daily",
    "title": "「演習」で練度向上！",
    "detail": "本日中に他の司令官の艦隊に対して3回「演習」を挑もう！",
    "materialRewards": [
      50,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      301
    ],
    "requirements": {
      "category": "excercise",
      "times": 3
    }
  },
  {
    "id": 304,
    "wikiId": "C03",
    "category": 3,
    "type": 2,
    "period": "daily",
    "title": "「演習」で他提督を圧倒せよ！",
    "detail": "本日中に他の司令官の艦隊との「演習」で5回以上「勝利」をおさめよう！",
    "materialRewards": [
      0,
      50,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      303
    ],
    "requirements": {
      "category": "excercise",
      "times": 5,
      "victory": true
    }
  },
  {
    "id": 306,
    "wikiId": "WC01",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "式の準備！(その弐)",
    "detail": "本日中に「演習」で2回以上「勝利」をおさめ、式への気持ちを整理しよう！",
    "materialRewards": [
      0,
      0,
      88,
      88
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      611
    ],
    "requirements": {
      "category": "excercise",
      "times": 2,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 307,
    "wikiId": "C05",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "艦隊の練度向上に努めよ！",
    "detail": "作戦前に艦隊の練度向上を図る！本日中に「演習」で3回以上「勝利」をおさめよう！",
    "materialRewards": [
      0,
      0,
      300,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      152
    ],
    "requirements": {
      "category": "excercise",
      "times": 3,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 308,
    "wikiId": "C06",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "演習を強化、艦隊の練度向上に努めよ！",
    "detail": "艦隊のさらなる練度向上を図る！本日中に「演習」で4回以上「勝利」をおさめよう！",
    "materialRewards": [
      0,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      }
    ],
    "prerequisites": [
      418
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 309,
    "wikiId": "C07",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "北方再突入に備え、練度向上に努めよ！",
    "detail": "艦隊再突入に備え、艦隊練度向上を図る！本日中に「演習」で4回以上「勝利」せよ！",
    "materialRewards": [
      300,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      }
    ],
    "prerequisites": [
      278
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 311,
    "wikiId": "C08",
    "category": 3,
    "type": 6,
    "period": "monthly",
    "title": "精鋭艦隊演習",
    "detail": "同日中に「演習」で7回以上「勝利」をおさめ、我が精鋭艦隊の練度を示そう！",
    "materialRewards": [
      0,
      400,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "戦闘糧食",
        "masterId": 145,
        "amount": 1
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "excercise",
      "times": 7,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 312,
    "wikiId": "C09",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "上陸部隊演習",
    "detail": "島嶼攻略部隊の練度向上のため、本日中に演習で4回以上「勝利」せよ！",
    "materialRewards": [
      0,
      200,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "戦闘糧食",
        "masterId": 145,
        "amount": 1
      }
    ],
    "prerequisites": [
      216,
      613,
      635
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 315,
    "wikiId": "C30",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "春季大演習",
    "detail": "春季大演習：春の一日中に「演習」で8回以上「勝利」をおさめ、艦隊の練度向上に努めよ！",
    "materialRewards": [
      0,
      0,
      1000,
      300
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 8,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 316,
    "wikiId": "C13",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "輸送部隊の練度向上に努めよ！",
    "detail": "演習任務：輸送部隊の練度向上を図る！本日中に演習で4回以上「勝利」せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      }
    ],
    "prerequisites": [
      218,
      418
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 317,
    "wikiId": "C15",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "甲型駆逐艦の戦力整備計画",
    "detail": "甲型駆逐艦整備任務：甲型駆逐艦【夕雲型/陽炎型】を2隻以上配備した第一艦隊で演習で3回「勝利」、<br>その後、同艦隊を南西諸島海域に投入。各出撃で得られた戦訓を艦隊型駆逐艦戦力整備に活用せよ！",
    "materialRewards": [
      0,
      350,
      0,
      350
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 5
          },
          {
            "kind": "useitem",
            "name": "戦闘糧食",
            "itemId": 66,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      673
    ],
    "requirements": {
      "category": "then",
      "list": [
        {
          "category": "excercise",
          "times": 3,
          "victory": true,
          "daily": true,
          "groups": [
            {
              "shipclass": [
                "夕雲",
                "陽炎"
              ],
              "amount": 2
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "2-2",
            "2-3",
            "2-4",
            "2-5"
          ],
          "boss": true,
          "result": "A",
          "groups": [
            {
              "shipclass": [
                "夕雲",
                "陽炎"
              ],
              "amount": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 318,
    "wikiId": "C16",
    "category": 3,
    "type": 6,
    "period": "monthly",
    "title": "給糧艦「伊良湖」の支援",
    "detail": "伊良湖支援任務：軽巡を2隻以上配備した第一艦隊で本日中に演習で3回「勝利」、その後、<br>第一艦隊旗艦に戦闘糧食を二つ装備せよ！　※任務達成後、同戦闘糧食は消費します",
    "materialRewards": [
      100,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 2
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      676
    ],
    "requirements": {
      "category": "then",
      "list": [
        {
          "category": "excercise",
          "times": 3,
          "victory": true,
          "daily": true,
          "groups": [
            {
              "ship": "軽巡",
              "amount": 2
            }
          ]
        },
        {
          "category": "modelconversion",
          "secretary": "艦",
          "equipment": [
            "戦闘糧食",
            "戦闘糧食"
          ]
        }
      ]
    }
  },
  {
    "id": 319,
    "wikiId": "C17",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "精鋭「第二一駆」、猛特訓！",
    "detail": "駆逐隊演習任務：精鋭「第二一駆逐隊」3隻を含む艦隊を編成。作戦に先立ち、猛特訓を開始する！<br>同艦隊で、本日中に演習で4回勝利せよ！",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 6
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      190
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "若葉改"
        },
        {
          "ship": "初春改二"
        },
        {
          "ship": "初霜改二"
        }
      ]
    }
  },
  {
    "id": 320,
    "wikiId": "C18",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "駆逐隊、特訓始め！",
    "detail": "駆逐隊演習任務：駆逐艦4隻で編成される駆逐隊。この駆逐隊を含む艦隊を編成。特訓を開始する！同艦隊で本日中に演習にて4回以上勝利せよ！",
    "materialRewards": [
      100,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 3
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 2
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "駆逐",
          "amount": 4
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 322,
    "wikiId": "C20",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "海防艦、演習始め！",
    "detail": "海防艦演習任務：海防艦を旗艦に配備し、随伴艦に駆逐艦2隻以上を配した演習艦隊を編成。本演習艦隊で、本日中に演習で2回以上勝利せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "furniture",
        "name": "「択捉型海防艦」掛け軸",
        "furnitureId": 382,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      682
    ],
    "requirements": {
      "category": "excercise",
      "times": 2,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "海防艦",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 323,
    "wikiId": "C21",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "最精鋭甲型駆逐艦、特訓始め！",
    "detail": "甲型駆逐隊演習任務：練度70以上の甲型駆逐艦【陽炎型/夕雲型】駆逐艦4隻で編成される駆逐隊。この精鋭駆逐隊を含む艦隊を編成。演習を開始する！同艦隊で本日中に演習にて4回以上勝利せよ！",
    "materialRewards": [
      400,
      0,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 4
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      193
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "shipclass": [
            "陽炎",
            "夕雲"
          ],
          "amount": 4,
          "lv": [
            70,
            999
          ]
        }
      ]
    }
  },
  {
    "id": 324,
    "wikiId": "C22",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "戦闘航空母艦一番艦、演習始め！",
    "detail": "改装航空戦艦(戦闘航空母艦)演習任務：旗艦「伊勢改二」、随伴艦に駆逐艦2隻以上を配した航空戦隊を編成。新改装艦の慣熟も兼ねた同航空戦隊の演習で、本日中に3回以上勝利せよ！",
    "materialRewards": [
      0,
      0,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "彗星",
            "masterId": 24,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "瑞雲",
            "masterId": 26,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "二式艦上偵察機",
            "masterId": 61,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "22号対水上電探",
            "masterId": 28,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "12cm30連装噴進砲",
            "masterId": 51,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      247
    ],
    "requirements": {
      "category": "excercise",
      "times": 3,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "伊勢改二",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 2
        },
        {
          "ship": "艦",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 325,
    "wikiId": "C23",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "改夕雲型、演習始め！",
    "detail": "改夕雲型演習任務：改夕雲型駆逐艦「夕雲改二」「長波改二」の精鋭駆逐艦2隻を含む艦隊を編成。改夕雲型駆逐隊の慣熟演習を開始する！同艦隊で本日中に演習にて4回以上勝利せよ！",
    "materialRewards": [
      400,
      400,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "給糧艦「伊良湖」",
            "itemId": 59,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "二式爆雷",
            "masterId": 227,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      323,
      875
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "夕雲改二"
        },
        {
          "ship": "長波改二"
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 326,
    "wikiId": "C24",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "夏季大演習",
    "detail": "夏季大演習：夏季期間の一日中に「演習」で8回以上「勝利」をおさめ、艦隊の練度向上に努めよ！暑さに負けるな！　艦隊、抜錨！",
    "materialRewards": [
      0,
      300,
      0,
      1000
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      }
    ],
    "prerequisites": [
      303
    ],
    "requirements": {
      "category": "excercise",
      "times": 8,
      "victory": true,
      "daily": true
    }
  },
  {
    "id": 327,
    "wikiId": "C25",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "朝潮型集合！特訓始め！",
    "detail": "朝潮型演習任務：朝潮型駆逐艦4隻による駆逐隊を含む艦隊を編成。同艦隊で本日中に演習にて4回以上勝利せよ！朝潮型駆逐艦、前へ！",
    "materialRewards": [
      300,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          },
          {
            "kind": "equipment",
            "name": "三式爆雷投射機",
            "masterId": 45,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      210
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "shipclass": [
            "朝潮"
          ],
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 328,
    "wikiId": "C27",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "精強「十七駆」、猛特訓！",
    "detail": "駆逐隊演習任務：精強「第十七駆逐隊」4隻を含む艦隊を編成。新改装精強駆逐隊による猛特訓を開始する！同艦隊で、本日中に演習で4回以上勝利せよ！",
    "materialRewards": [
      170,
      170,
      170,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "二式爆雷",
            "masterId": 227,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      195
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "磯風乙改"
        },
        {
          "ship": "浜風乙改"
        },
        {
          "ship": "浦風丁改"
        },
        {
          "ship": "谷風丁改"
        }
      ]
    }
  },
  {
    "id": 330,
    "wikiId": "C29",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "空母機動部隊、演習始め！",
    "detail": "空母機動部隊演習任務：航空母艦旗艦他1隻計2隻以上及び駆逐艦2隻を含む空母機動部隊を編成。 機動部隊各艦の練度向上を図る！同艦隊で、本日中に演習で4回以上勝利せよ！",
    "materialRewards": [
      0,
      400,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "九九式艦爆",
            "masterId": 23,
            "amount": 4
          },
          {
            "kind": "equipment",
            "name": "彗星",
            "masterId": 24,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 3
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "零式艦戦21型",
            "masterId": 20,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "零式艦戦52型",
            "masterId": 21,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "空母",
          "flagship": true,
          "amount": 2
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 331,
    "wikiId": "C31",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "艦載機演習",
    "detail": "艦載機演習任務：正規空母旗艦他1隻計2隻以上及び駆逐艦2隻を含む空母機動部隊を編成。艦載機の練度向上と装備充実を図る！同機動部隊で、本日中に演習を【A判定】以上3回勝利せよ！",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "彗星一二型甲",
        "masterId": 57,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "彗星",
            "masterId": 24,
            "amount": 3
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 6
          }
        ]
      }
    ],
    "prerequisites": [
      330
    ],
    "requirements": {
      "category": "excercise",
      "times": 3,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "空母",
          "flagship": true,
          "amount": 2
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 332,
    "wikiId": "C32",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "六周年記念演習",
    "detail": "六周年記念演習：軽巡クラス1隻と駆逐艦または海防艦計3隻以上を含む6隻編成の特務艦隊を編成。同艦隊による演習で本日中に【S判定】以上4回勝利せよ！",
    "materialRewards": [
      600,
      600,
      600,
      600
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 6
          },
          {
            "kind": "material",
            "name": "高速建造材",
            "material": "buildKit",
            "amount": 6
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "零式艦戦52型",
            "masterId": 21,
            "amount": 6
          },
          {
            "kind": "equipment",
            "name": "35.6cm連装砲",
            "masterId": 7,
            "amount": 6
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": [
            "軽巡",
            "練習巡洋艦",
            "重雷装巡洋艦"
          ],
          "amount": 1
        },
        {
          "ship": [
            "駆逐",
            "海防艦"
          ],
          "amount": 3
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 333,
    "wikiId": "C33",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "航空戦隊演習(その壱)",
    "detail": "航空戦隊演習任務：航空母艦3隻以上及び駆逐艦2隻以上を含む航空戦隊を編成。艦隊戦演習により、戦技及び練度向上を図る。同航空戦隊で、本日中に演習を【S判定】勝利3回以上達成せよ！",
    "materialRewards": [
      0,
      300,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 3
          },
          {
            "kind": "material",
            "name": "高速建造材",
            "material": "buildKit",
            "amount": 3
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "九七式艦攻",
            "masterId": 16,
            "amount": 3
          },
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 3,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "空母",
          "amount": 3
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 334,
    "wikiId": "C34",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "航空戦隊演習(その弐)",
    "detail": "航空戦隊演習任務：航空母艦3隻以上及び駆逐艦2隻以上を含む航空戦隊を編成。大規模演習により、さらなる戦技及び練度向上を図る。同航空戦隊で、本日中に演習を【S判定】勝利6回以上達成せよ！",
    "materialRewards": [
      500,
      0,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "13号対空電探",
            "masterId": 27,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "special",
            "name": "彩雲★+2",
            "amount": 1
          },
          {
            "kind": "special",
            "name": "天山★+2",
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      333
    ],
    "requirements": {
      "category": "excercise",
      "times": 6,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "空母",
          "amount": 3
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 335,
    "wikiId": "C35",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "新しき盾",
    "detail": "「新しき盾」演習任務：重巡「摩耶」及び重巡「羽黒」を擁する艦隊による演習「新しき盾」を実施する。本「新しき盾」演習において、本日中に【S判定】勝利3回以上達成せよ！",
    "materialRewards": [
      0,
      179,
      0,
      180
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "新型航空兵装資材",
        "itemId": 77,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          },
          {
            "kind": "equipment",
            "name": "25mm三連装機銃",
            "masterId": 40,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "12cm30連装噴進砲",
            "masterId": 51,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 3,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "摩耶"
        },
        {
          "ship": "羽黒"
        }
      ]
    }
  },
  {
    "id": 336,
    "wikiId": "C37",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "輸送船団演習",
    "detail": "輸送船団演習任務：補給艦または揚陸艦、海防艦を計2隻以上含む輸送船団を編成、同輸送船団及び護衛艦艇による演習で、本日中に【A判定】勝利4回以上達成せよ。",
    "materialRewards": [
      150,
      150,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "九四式爆雷投射機",
            "masterId": 44,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "二式12cm迫撃砲改",
            "masterId": 346,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "九五式爆雷",
            "masterId": 226,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      201,
      335
    ],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": [
            "補給艦",
            "揚陸艦",
            "海防艦"
          ],
          "amount": [
            2,
            99
          ]
        }
      ]
    }
  },
  {
    "id": 337,
    "wikiId": "C38",
    "category": 3,
    "type": 7,
    "period": "quarterly",
    "title": "「十八駆」演習！",
    "detail": "駆逐艦演習任務：第十八駆逐艦『霞』『霰』『陽炎』『不知火』の4隻を含む演習艦隊を編成。同艦隊で本日中に演習で『S判定』勝利3回以上を達成せよ！精鋭十八駆に落ち度など無し！",
    "materialRewards": [
      180,
      180,
      180,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "12cm30連装噴進砲",
            "masterId": 51,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 3
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 3,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "霞"
        },
        {
          "ship": "霰"
        },
        {
          "ship": "陽炎"
        },
        {
          "ship": "不知火"
        }
      ]
    }
  },
  {
    "id": 338,
    "wikiId": "C39",
    "category": 3,
    "type": 1,
    "period": "once",
    "title": "睦月型集合！演習始め！",
    "detail": "睦月型演習任務：睦月型駆逐艦4隻による駆逐隊を含む演習艦隊を編成。同艦隊で本日中に演習にて4回以上勝利せよ！睦月型、がんばるにゃしぃ！",
    "materialRewards": [
      200,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 5
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型噴進装備開発資材",
            "itemId": 92,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "excercise",
      "times": 4,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "shipclass": "睦月",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 339,
    "wikiId": "C42",
    "category": 3,
    "type": 7,
    "period": "quarterly",
    "title": "「十九駆」演習！",
    "detail": "駆逐艦演習任務：第十九駆逐隊「磯波」「浦波」「綾波」「敷波」の4隻を含む演習艦隊を編成。<br>同艦隊で本日中に演習で【S判定】勝利3回以上を達成せよ！精鋭十九駆、じゃ、見ててよね！",
    "materialRewards": [
      190,
      190,
      190,
      100
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "給糧艦「間宮」",
            "itemId": 54,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 3
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "三式爆雷投射機",
            "masterId": 45,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "12.7cm連装砲B型改二",
            "masterId": 63,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 8
          }
        ]
      }
    ],
    "prerequisites": [
      177,
      337
    ],
    "requirements": {
      "category": "excercise",
      "times": 3,
      "victory": true,
      "daily": true,
      "groups": [
        {
          "ship": "綾波"
        },
        {
          "ship": "敷波"
        },
        {
          "ship": "磯波"
        },
        {
          "ship": "浦波"
        }
      ]
    }
  },
  {
    "id": 401,
    "wikiId": "D01",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "はじめての「遠征」！",
    "detail": "艦隊を「遠征」に出発させよう！",
    "materialRewards": [
      30,
      30,
      30,
      30
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（小）",
        "itemId": 10,
        "amount": 1
      }
    ],
    "prerequisites": [
      105
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1
        }
      ]
    }
  },
  {
    "id": 402,
    "wikiId": "D02",
    "category": 4,
    "type": 2,
    "period": "daily",
    "title": "「遠征」を３回成功させよう！",
    "detail": "本日中に「遠征」３回成功させよう！",
    "materialRewards": [
      100,
      100,
      100,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      401
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 3
        }
      ]
    }
  },
  {
    "id": 403,
    "wikiId": "D03",
    "category": 4,
    "type": 2,
    "period": "daily",
    "title": "「遠征」を１０回成功させよう！",
    "detail": "本日中に「遠征」10回成功させよう！",
    "materialRewards": [
      150,
      300,
      300,
      150
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（小）",
        "itemId": 10,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      402
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 10
        }
      ]
    }
  },
  {
    "id": 404,
    "wikiId": "D04",
    "category": 4,
    "type": 3,
    "period": "weekly",
    "title": "大規模遠征作戦、発令！",
    "detail": "今週中に「遠征」30回成功させよう！",
    "materialRewards": [
      300,
      500,
      500,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      }
    ],
    "prerequisites": [
      401
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 30
        }
      ]
    }
  },
  {
    "id": 405,
    "wikiId": "D05",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "第一次潜水艦派遣作戦",
    "detail": "はじめての潜水艦派遣作戦を成功させよう！",
    "materialRewards": [
      0,
      0,
      10,
      10
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "応急修理要員",
        "masterId": 42,
        "amount": 1
      }
    ],
    "prerequisites": [
      127
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 30
        }
      ]
    }
  },
  {
    "id": 406,
    "wikiId": "D06",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "第二次潜水艦派遣作戦",
    "detail": "第二次潜水艦派遣作戦を成功させよう！",
    "materialRewards": [
      0,
      0,
      10,
      10
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "Ju87C改",
        "masterId": 64,
        "amount": 1
      }
    ],
    "prerequisites": [
      405
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 30
        }
      ]
    }
  },
  {
    "id": 408,
    "wikiId": "D07",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "潜水艦派遣作戦による技術入手の継続！",
    "detail": "第三次及び第四次潜水艦派遣作戦を成功させ、他国製技術の導入に努めよ！",
    "materialRewards": [
      0,
      0,
      0,
      800
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "Ju87C改",
        "masterId": 64,
        "amount": 1
      }
    ],
    "prerequisites": [
      406
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 2,
          "id": 30
        }
      ]
    }
  },
  {
    "id": 409,
    "wikiId": "D08",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "潜水艦派遣による海外艦との接触作戦",
    "detail": "有力な潜水艦隊派遣による海外艦との接触作戦を成功させよ！",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "ship",
        "name": "Z1",
        "masterId": 174,
        "amount": 1
      }
    ],
    "prerequisites": [
      408
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 31
        }
      ]
    }
  },
  {
    "id": 410,
    "wikiId": "D09",
    "category": 4,
    "type": 3,
    "period": "weekly",
    "title": "南方への輸送作戦を成功させよ！",
    "detail": "激戦海域である南方海域への「東京急行」系遠征を敢行、これを成功させよ！",
    "materialRewards": [
      150,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（小）",
        "itemId": 10,
        "amount": 1
      }
    ],
    "prerequisites": [
      130
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": [
            37,
            38
          ]
        }
      ]
    }
  },
  {
    "id": 411,
    "wikiId": "D11",
    "category": 4,
    "type": 3,
    "period": "weekly",
    "title": "南方への鼠輸送を継続実施せよ！",
    "detail": "今週中に「東京急行」系遠征を継続的に実施、同種作戦を7回成功させよう！",
    "materialRewards": [
      400,
      0,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      }
    ],
    "prerequisites": [
      410
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 7,
          "id": [
            37,
            38
          ]
        }
      ]
    }
  },
  {
    "id": 412,
    "wikiId": "D10",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "航空火力艦の運用を強化せよ！",
    "detail": "「航空戦艦運用演習」を実施し、航空火力艦の運用の強化に努めよ！",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "瑞雲(六三四空)",
        "masterId": 79,
        "amount": 1
      }
    ],
    "prerequisites": [
      239
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 23
        }
      ]
    }
  },
  {
    "id": 413,
    "wikiId": "D12",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "(続)航空火力艦の運用を強化せよ！",
    "detail": "「航空戦艦運用演習」を継続実施し、航空火力艦の運用の強化に引き続き努めよ！",
    "materialRewards": [
      0,
      0,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "瑞雲(六三四空)",
        "masterId": 79,
        "amount": 1
      }
    ],
    "prerequisites": [
      412
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 3,
          "id": 23
        }
      ]
    }
  },
  {
    "id": 414,
    "wikiId": "D13",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "遠洋潜水艦作戦を実施せよ！",
    "detail": "「遠洋潜水艦作戦」を実施し、潜水艦隊の練度向上と敵艦隊漸減に努めよ！",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "潜水艦53cm艦首魚雷(8門)",
        "masterId": 95,
        "amount": 1
      }
    ],
    "prerequisites": [
      139
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 39
        }
      ]
    }
  },
  {
    "id": 415,
    "wikiId": "D14",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "遠洋潜水艦作戦の成果を拡大せよ！",
    "detail": "「遠洋潜水艦作戦」を継続実施し、潜水艦隊の練度向上と敵艦隊漸減に努めよ！",
    "materialRewards": [
      0,
      400,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "潜水艦53cm艦首魚雷(8門)",
        "masterId": 95,
        "amount": 1
      }
    ],
    "prerequisites": [
      414
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 2,
          "id": 39
        }
      ]
    }
  },
  {
    "id": 416,
    "wikiId": "D15",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "防空射撃演習を実施せよ！",
    "detail": "「防空射撃演習」を複数回実施し、艦隊の防空能力を高めよ！",
    "materialRewards": [
      0,
      200,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "25mm三連装機銃",
        "masterId": 40,
        "amount": 1
      }
    ],
    "prerequisites": [
      207
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 3,
          "id": 6
        }
      ]
    }
  },
  {
    "id": 417,
    "wikiId": "D16",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "囮機動部隊支援作戦を実施せよ！",
    "detail": "「囮機動部隊支援作戦」を実施し、これを成功させよ！",
    "materialRewards": [
      400,
      0,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "91式高射装置",
        "masterId": 120,
        "amount": 1
      }
    ],
    "prerequisites": [
      272
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 15
        }
      ]
    }
  },
  {
    "id": 418,
    "wikiId": "D17",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "観艦式予行を実施せよ！",
    "detail": "観艦式を実施する。予行として「観艦式予行」を複数回実施し、これを2回成功させよ！",
    "materialRewards": [
      150,
      0,
      0,
      150
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      137
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 2,
          "id": 7
        }
      ]
    }
  },
  {
    "id": 419,
    "wikiId": "D18",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "観艦式を敢行せよ！",
    "detail": "練度の高い艦隊で観艦式本番を実施する。「観艦式」を実施し、これを成功させよ！",
    "materialRewards": [
      300,
      300,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      },
      {
        "kind": "special",
        "name": "司令部要員",
        "amount": 1
      }
    ],
    "prerequisites": [
      308
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 8
        }
      ]
    }
  },
  {
    "id": 420,
    "wikiId": "D19",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "機動部隊の運用を強化せよ！",
    "detail": "機動部隊遠征を実施、「MO作戦」及び「敵母港空襲作戦」を展開、これを成功させよ！",
    "materialRewards": [
      200,
      200,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "家具箱（大）",
        "itemId": 12,
        "amount": 1
      }
    ],
    "prerequisites": [
      287,
      410
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 26
        },
        {
          "times": 1,
          "id": 35
        }
      ]
    }
  },
  {
    "id": 422,
    "wikiId": "D20",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "潜水艦派遣作戦による航空機技術入手",
    "detail": "潜水艦派遣作戦により、新型航空機技術の導入に努めよ！",
    "materialRewards": [
      0,
      100,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "新型航空機設計図",
        "itemId": 74,
        "amount": 1
      }
    ],
    "prerequisites": [
      406
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 30
        },
        {
          "times": 1,
          "id": 31
        }
      ]
    }
  },
  {
    "id": 423,
    "wikiId": "D21",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "潜水艦派遣作戦による噴式技術の入手",
    "detail": "鉄鋼5,000及びボーキサイト1,500を準備して、潜水艦派遣作戦により<br>噴式エンジン技術の導入に努めよ！※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      100,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "special",
        "name": "ネ式エンジン",
        "amount": 1
      }
    ],
    "prerequisites": [
      422,
      839
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 30
        },
        {
          "times": 1,
          "id": 31
        }
      ],
      "resources": [
        0,
        0,
        5000,
        1500
      ]
    }
  },
  {
    "id": 424,
    "wikiId": "D22",
    "category": 4,
    "type": 6,
    "period": "monthly",
    "title": "輸送船団護衛を強化せよ！",
    "detail": "遠征任務：「海上護衛任務」を反復実施し、輸送船団の護衛に務めよ！",
    "materialRewards": [
      1000,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 2
      }
    ],
    "prerequisites": [
      402,
      419
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 4,
          "id": 5
        }
      ]
    }
  },
  {
    "id": 425,
    "wikiId": "D23",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "海上護衛総隊、遠征開始！",
    "detail": "遠征任務：遠征任務「対潜警戒任務」「海上護衛任務」「タンカー護衛任務」を実施、<br>軽巡、駆逐艦、海防艦などから編成された護衛艦隊で各遠征を成功させよ！",
    "materialRewards": [
      700,
      700,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      424,
      662
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 4
        },
        {
          "times": 1,
          "id": 5
        },
        {
          "times": 1,
          "id": 9
        }
      ],
      "groups": [
        {
          "ship": [
            "軽巡",
            "駆逐艦",
            "海防艦"
          ]
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 426,
    "wikiId": "D24",
    "category": 4,
    "type": 7,
    "period": "quarterly",
    "title": "海上通商航路の警戒を厳とせよ！",
    "detail": "遠征任務：遠征任務「警備任務」「対潜警戒任務」「海上護衛任務」「強行偵察任務」<br>を実施し、敵の通商破壊部隊を制圧、海上通商航路の安全を確保せよ！",
    "materialRewards": [
      800,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 2
      }
    ],
    "prerequisites": [
      810
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 3
        },
        {
          "times": 1,
          "id": 4
        },
        {
          "times": 1,
          "id": 5
        },
        {
          "times": 1,
          "id": 10
        }
      ]
    }
  },
  {
    "id": 427,
    "wikiId": "D25",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "遠征「補給」支援体制を強化せよ！",
    "detail": "遠征補給支援体制の強化：鋼材800を用意し、遠征任務「兵站強化任務」を実施。<br>同遠征任務を成功させ、艦隊遠征時における「補給」支援体制の拡充に努めよ！",
    "materialRewards": [
      200,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "遠征「臨時補給」開放",
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 2
      }
    ],
    "prerequisites": [
      869
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": "A1"
        }
      ],
      "resources": [
        0,
        0,
        800,
        0
      ]
    }
  },
  {
    "id": 428,
    "wikiId": "D26",
    "category": 4,
    "type": 7,
    "period": "quarterly",
    "title": "近海に侵入する敵潜を制圧せよ！",
    "detail": "敵潜制圧任務：遠征任務「対潜警戒任務」「海峡警備行動」「長時間対潜警戒」を<br>それぞれ複数回実施し、近海に潜り込む敵潜部隊を制圧、我が領海から叩き出せ！",
    "materialRewards": [
      0,
      1000,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "九五式爆雷",
        "masterId": 226,
        "amount": 1
      }
    ],
    "prerequisites": [
      426,
      427
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 2,
          "id": 4
        },
        {
          "times": 2,
          "id": "A2"
        },
        {
          "times": 2,
          "id": "A3"
        }
      ]
    }
  },
  {
    "id": 429,
    "wikiId": "D27",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "「捷一号作戦」、発動準備！",
    "detail": "捷一号作戦準備任務：遠征任務「警備任務」「兵站強化任務」及び「南西方面航空偵察作戦」<br>を実施。これを無事完遂し、南西方面での作戦準備にあたれ！",
    "materialRewards": [
      0,
      600,
      0,
      600
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "洋上補給",
        "itemId": 67,
        "amount": 2
      }
    ],
    "prerequisites": [
      402,
      870
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 3
        },
        {
          "times": 1,
          "id": "A1"
        },
        {
          "times": 1,
          "id": "B1"
        }
      ]
    }
  },
  {
    "id": 430,
    "wikiId": "D28",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "「海防艦」、進発せよ！",
    "detail": "海上護衛任務：遠征任務「兵站強化任務」「海峡警備行動」「海上護衛任務」「タンカー護衛任務」を海防艦、駆逐艦などを主軸とした護衛艦隊で実施せよ！",
    "materialRewards": [
      800,
      0,
      0,
      600
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 8
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          }
        ]
      }
    ],
    "prerequisites": [
      682
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": "A1"
        },
        {
          "times": 1,
          "id": "A2"
        },
        {
          "times": 1,
          "id": 5
        },
        {
          "times": 1,
          "id": 9
        }
      ],
      "groups": [
        {
          "ship": "海防艦"
        },
        {
          "ship": "駆逐艦"
        }
      ]
    }
  },
  {
    "id": 431,
    "wikiId": "D29",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "艦隊司令部の強化 【準備段階】",
    "detail": "艦隊司令部強化の準備：遠征任務「敵地偵察作戦」「海峡警備行動」「南西方面航空偵察作戦」「兵站強化任務」を海防艦や水雷戦隊、水上機母艦等を投入、同遠征任務群を成功させよ！",
    "materialRewards": [
      0,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 5
          },
          {
            "kind": "equipment",
            "name": "零式水上偵察機11型乙",
            "masterId": 238,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "紫雲",
            "masterId": 118,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      413,
      430
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": "A1"
        },
        {
          "times": 1,
          "id": "A2"
        },
        {
          "times": 1,
          "id": "B1"
        },
        {
          "times": 1,
          "id": 17
        }
      ]
    }
  },
  {
    "id": 432,
    "wikiId": "D30",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "警備及び哨戒偵察を強化せよ！",
    "detail": "警備哨戒任務：遠征「海峡警備行動」「強行偵察任務」「南西方面航空偵察作戦」を実施、南方戦線遠征の前段作戦として、内地及び南西諸島方面の警備及び哨戒偵察を実施せよ！",
    "materialRewards": [
      500,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "給糧艦「間宮」",
            "itemId": 54,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "7.7mm機銃",
            "masterId": 37,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      416
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": "A2"
        },
        {
          "times": 1,
          "id": "B1"
        },
        {
          "times": 1,
          "id": 10
        }
      ]
    }
  },
  {
    "id": 433,
    "wikiId": "D31",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "南方戦線遠征を実施せよ！",
    "detail": "南方戦線遠征：南方海域の作戦を援護する南方作戦遠征作戦を実施する。南方海域遠征「東京急行」「東京急行(弐)」「水上機基地建設」「水上機前線輸送」「MO作戦」を実施せよ！",
    "materialRewards": [
      0,
      0,
      750,
      750
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 2
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 6
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "12.7mm単装機銃",
            "masterId": 38,
            "amount": 3
          }
        ]
      }
    ],
    "prerequisites": [
      432,
      425
    ],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "times": 1,
          "id": 35
        },
        {
          "times": 1,
          "id": 36
        },
        {
          "times": 1,
          "id": 37
        },
        {
          "times": 1,
          "id": 38
        },
        {
          "times": 1,
          "id": 40
        }
      ]
    }
  },
  {
    "id": 434,
    "wikiId": "D32",
    "category": 4,
    "type": 1,
    "period": "once",
    "title": "特設護衛船団司令部、活動開始！",
    "detail": "海上護衛任務：遠征任務「警備任務」「海上護衛任務」「兵站強化任務」「海峡警備行動」<br>「タンカー護衛任務」の各任務を、海防艦・駆逐艦などを主軸とした護衛艦艇で実施せよ！",
    "materialRewards": [
      1000,
      0,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "給糧艦「伊良湖」",
            "itemId": 59,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 5
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 3
          },
          {
            "kind": "special",
            "name": "緊急修理資材",
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "expedition",
      "objects": [
        {
          "id": [
            3,
            5,
            9,
            "A1",
            "A2"
          ],
          "times": 1
        }
      ]
    }
  },
  {
    "id": 501,
    "wikiId": "E01",
    "category": 5,
    "type": 1,
    "period": "once",
    "title": "はじめての「補給」！",
    "detail": "補給は大事です！燃料・弾薬を艦に「補給」しよう！",
    "materialRewards": [
      0,
      20,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      203
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "resupply",
      "times": 1
    }
  },
  {
    "id": 502,
    "wikiId": "E02",
    "category": 5,
    "type": 1,
    "period": "once",
    "title": "はじめての「入渠」！",
    "detail": "戦闘で傷ついた艦を「入渠」させて修理して、次の出撃に備えよう！",
    "materialRewards": [
      0,
      0,
      30,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      203
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "repair",
      "times": 1
    }
  },
  {
    "id": 503,
    "wikiId": "E03",
    "category": 5,
    "type": 2,
    "period": "daily",
    "title": "艦隊大整備！",
    "detail": "各艦隊から整備が必要な艦を5隻以上ドック入りさせ、大規模な整備をしよう！",
    "materialRewards": [
      30,
      30,
      30,
      30
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 2
      }
    ],
    "prerequisites": [
      502
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "repair",
      "times": 5
    }
  },
  {
    "id": 504,
    "wikiId": "E04",
    "category": 5,
    "type": 2,
    "period": "daily",
    "title": "艦隊酒保祭り！",
    "detail": "艦隊酒保祭り！各艦に延べ15回以上の補給を実施しよう！",
    "materialRewards": [
      50,
      50,
      50,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      503
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "resupply",
      "times": 15
    }
  },
  {
    "id": 601,
    "wikiId": "F01",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "はじめての「建造」！",
    "detail": "「工廠」で鋼材などの資材を使って新しい艦を「建造」しよう！",
    "materialRewards": [
      50,
      50,
      50,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "simple",
      "subcategory": "ship",
      "times": 1
    }
  },
  {
    "id": 602,
    "wikiId": "F02",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "はじめての「開発」！",
    "detail": "「工廠」でボーキサイトなどの資材を使って新しい装備アイテムを「開発」しよう！",
    "materialRewards": [
      100,
      100,
      100,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      601
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "equipment",
      "times": 1
    }
  },
  {
    "id": 603,
    "wikiId": "F03",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "はじめての「解体」！",
    "detail": "「工廠」で不要な艦を「解体」してみよう！",
    "materialRewards": [
      60,
      60,
      60,
      60
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      602
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapship",
      "times": 1
    }
  },
  {
    "id": 604,
    "wikiId": "F04",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "はじめての「廃棄」！",
    "detail": "「工廠」で装備アイテムを「廃棄」してみよう！",
    "materialRewards": [
      80,
      80,
      80,
      80
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      603
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 1,
      "batch": false
    }
  },
  {
    "id": 605,
    "wikiId": "F05",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "新装備「開発」指令",
    "detail": "「工廠」で装備アイテムを新たに「開発」しよう(失敗もOK)！",
    "materialRewards": [
      40,
      40,
      40,
      40
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      602
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "equipment",
      "times": 1
    }
  },
  {
    "id": 606,
    "wikiId": "F06",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "新造艦「建造」指令",
    "detail": "「工廠」で艦娘を本日中に新たに「建造」しよう！",
    "materialRewards": [
      50,
      50,
      50,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      605
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "ship",
      "times": 1
    }
  },
  {
    "id": 607,
    "wikiId": "F07",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "装備「開発」集中強化！",
    "detail": "「工廠」で装備アイテムを本日中に3回「開発」しよう(失敗もOK)！",
    "materialRewards": [
      100,
      100,
      100,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      606
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "equipment",
      "times": 3
    }
  },
  {
    "id": 608,
    "wikiId": "F08",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "艦娘「建造」艦隊強化！",
    "detail": "艦隊強化のため、「工廠」で艦娘を本日中に3隻「建造」しよう！",
    "materialRewards": [
      200,
      200,
      300,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      607
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "ship",
      "times": 3
    }
  },
  {
    "id": 609,
    "wikiId": "F09",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "軍縮条約対応！",
    "detail": "少し艦隊規模が大きくなりすぎました！「工廠」で不要な艦を2隻「解体」してください！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      608
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapship",
      "times": 2
    }
  },
  {
    "id": 610,
    "wikiId": "F10",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「大型艦建造」の準備！(その弐)",
    "detail": "大型艦建造の準備をします！「工廠」で装備アイテムを4回「廃棄」してみてください！",
    "materialRewards": [
      800,
      800,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "大型艦建造開放",
        "amount": 1
      }
    ],
    "prerequisites": [
      704
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 4,
      "batch": false
    }
  },
  {
    "id": 611,
    "wikiId": "WF01",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "式の準備！(その壱)",
    "detail": "式の準備をします！「工廠」で装備アイテムを2回「廃棄」して身の回りの整理を！",
    "materialRewards": [
      88,
      88,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      118
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 2,
      "batch": false
    }
  },
  {
    "id": 612,
    "wikiId": "F11",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "輸送用ドラム缶の準備",
    "detail": "「工廠」で装備アイテムを3回「廃棄」して、輸送用のドラム缶を準備します。",
    "materialRewards": [
      0,
      0,
      30,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "ドラム缶(輸送用)",
        "masterId": 75,
        "amount": 3
      }
    ],
    "prerequisites": [
      105
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 3,
      "batch": false
    }
  },
  {
    "id": 613,
    "wikiId": "F12",
    "category": 6,
    "type": 3,
    "period": "weekly",
    "title": "資源の再利用",
    "detail": "「工廠」で余剰の装備アイテムをなるべく多く「廃棄」して、鋼材の再利用に努めよう！",
    "materialRewards": [
      0,
      0,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "ドラム缶(輸送用)",
        "masterId": 75,
        "amount": 1
      }
    ],
    "prerequisites": [
      228
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 24,
      "batch": false
    }
  },
  {
    "id": 614,
    "wikiId": "F13",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換",
    "detail": "「九七式艦攻(友永隊)」搭載空母を秘書艦にした状態で新たに「天山」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "天山一二型(友永隊)",
        "masterId": 94,
        "amount": 1
      }
    ],
    "prerequisites": [
      250
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "九七式艦攻(友永隊)",
      "scraps": [
        {
          "name": "天山",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 615,
    "wikiId": "F14",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換",
    "detail": "「九九式艦爆(江草隊)」搭載空母を秘書艦にした状態で新たに「彗星」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "彗星(江草隊)",
        "masterId": 100,
        "amount": 1
      }
    ],
    "prerequisites": [
      250
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "九九式艦爆(江草隊)",
      "scraps": [
        {
          "name": "彗星",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 616,
    "wikiId": "F15",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換",
    "detail": "「零戦52型丙(六〇一空)」搭載空母を秘書艦にした状態で新たに「烈風」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "烈風(六〇一空)",
        "masterId": 110,
        "amount": 1
      }
    ],
    "prerequisites": [
      253
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零戦52型丙(六〇一空)",
      "scraps": [
        {
          "name": "試製烈風 後期型",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 617,
    "wikiId": "F16",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「伊良湖」の準備",
    "detail": "「工廠」で不要な装備アイテムをいくつか「廃棄」して、新型給糧艦召喚の準備をしましょう！",
    "materialRewards": [
      100,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 4
      }
    ],
    "prerequisites": [
      608
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 10,
      "batch": false
    }
  },
  {
    "id": 618,
    "wikiId": "F17",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "はじめての「装備改修」！",
    "detail": "「改修工廠」で「装備」を改修してみましょう！明石さん、お願いします！",
    "materialRewards": [
      0,
      0,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 7
      }
    ],
    "prerequisites": [
      146
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "improvement",
      "times": 1
    }
  },
  {
    "id": 619,
    "wikiId": "F18",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "装備の改修強化",
    "detail": "「改修工廠」で「装備」の改修強化に努めます。",
    "materialRewards": [
      0,
      50,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      }
    ],
    "prerequisites": [
      608,
      618
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "improvement",
      "times": 1
    }
  },
  {
    "id": 620,
    "wikiId": "F88",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "一航戦精鋭「流星改」隊の編成",
    "detail": "一航戦任務：旗艦「赤城改二（改二戊）」第一装備スロに「流星改（一航戦）」※連度maxを搭載し、「流星改」×4「彩雲」×1「九七艦攻」×2廃棄、弾薬×2800、ボーキ9000、熟練搭乗員×2を準備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "流星改(一航戦/熟練)",
        "masterId": 343,
        "amount": 1
      }
    ],
    "prerequisites": [
      283,
      623
    ],
    "requirements": {
      "category": "modelconversion",
      "use_skilled_crew": true,
      "secretary": [
        "赤城改二",
        "赤城改二戊"
      ],
      "slots": [
        {
          "slot": 1,
          "equipment": "流星改(一航戦)",
          "fullyskilled": true
        }
      ],
      "scraps": [
        {
          "name": "流星改",
          "amount": 4
        },
        {
          "name": "彩雲",
          "amount": 1
        },
        {
          "name": "九七式艦攻",
          "amount": 2
        }
      ],
      "resources": [
        0,
        2800,
        0,
        9000
      ]
    }
  },
  {
    "id": 621,
    "wikiId": "F89",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "陸戦用装備の艦載運用研究",
    "detail": "第一艦隊旗艦軽巡級の第一装備スロに「7.7mm機銃」装備。「25mm単装機銃」×2、「ドラム缶(輸送用)」×2、「12cm30連装噴進砲」×1を廃棄。弾薬1,700、開発資材×30、高速建造材×10を準備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "二式12cm迫撃砲改",
        "masterId": 346,
        "amount": 1
      }
    ],
    "prerequisites": [
      605
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "軽巡",
      "slots": [
        {
          "slot": 1,
          "equipment": "7.7mm機銃"
        }
      ],
      "scraps": [
        {
          "name": "25mm単装機銃",
          "amount": 2
        },
        {
          "name": "ドラム缶(輸送用)",
          "amount": 2
        },
        {
          "name": "12cm30連装噴進砲",
          "amount": 1
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 30
        },
        {
          "name": "高速建造材",
          "amount": 10
        }
      ],
      "resources": [
        0,
        1700,
        0,
        0
      ]
    }
  },
  {
    "id": 622,
    "wikiId": "F19",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換",
    "detail": "「九七式艦攻(村田隊)」搭載「翔鶴」を秘書艦にして、新たに「天山」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "天山一二型(村田隊)",
        "masterId": 144,
        "amount": 1
      }
    ],
    "prerequisites": [
      287
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "九七式艦攻(村田隊)",
      "secretary": "翔鶴",
      "scraps": [
        {
          "name": "天山",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 623,
    "wikiId": "F20",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "精鋭「九七式艦攻」部隊の編成",
    "detail": "「翔鶴」または「赤城」を秘書艦にした状態で新たに「九七式艦攻」を3つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "九七式艦攻(村田隊)",
        "masterId": 143,
        "amount": 1
      }
    ],
    "prerequisites": [
      287
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": [
        "赤城",
        "翔鶴"
      ],
      "scraps": [
        {
          "name": "九七式艦攻",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 624,
    "wikiId": "F21",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "試作艤装の準備",
    "detail": "「工廠」で装備アイテムを7つ「廃棄」して、「試製甲板カタパルト」を準備します。",
    "materialRewards": [
      0,
      0,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "試製甲板カタパルト",
        "amount": 1
      }
    ],
    "prerequisites": [
      420
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 7,
      "batch": true
    }
  },
  {
    "id": 625,
    "wikiId": "F23",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "試製航空艤装の追加試作",
    "detail": "「工廠」で装備アイテムを9つ「廃棄」して、「試製甲板カタパルト」を追加試作します。",
    "materialRewards": [
      0,
      0,
      100,
      50
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "試製甲板カタパルト",
        "amount": 1
      }
    ],
    "prerequisites": [
      294
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 9,
      "batch": true
    }
  },
  {
    "id": 626,
    "wikiId": "F22",
    "category": 6,
    "type": 6,
    "period": "monthly",
    "title": "精鋭「艦戦」隊の新編成",
    "detail": "要熟練搭乗員：練度max「零戦21型」搭載「鳳翔」秘書艦で「零戦21型」x2「九六艦戦」x1廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零式艦戦21型(熟練)",
        "masterId": 96,
        "amount": 1
      }
    ],
    "prerequisites": [
      114,
      264
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零式艦戦21型",
      "secretary": "鳳翔",
      "scraps": [
        {
          "name": "零式艦戦21型",
          "amount": 2
        },
        {
          "name": "九六式艦戦",
          "amount": 1
        }
      ],
      "fullyskilled": true,
      "use_skilled_crew": true
    }
  },
  {
    "id": 627,
    "wikiId": "F24",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換",
    "detail": "「零戦21型(熟練)」搭載空母を秘書艦にして、新たに「零戦52型」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零式艦戦52型(熟練)",
        "masterId": 152,
        "amount": 1
      }
    ],
    "prerequisites": [
      626
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零式艦戦21型(熟練)",
      "scraps": [
        {
          "name": "零式艦戦52型",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 628,
    "wikiId": "F25",
    "category": 6,
    "type": 6,
    "period": "monthly",
    "title": "機種転換",
    "detail": "練度max「零戦21型(熟練)」搭載空母を秘書艦にして、新たに「零戦52型」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零式艦戦52型(熟練)",
        "masterId": 152,
        "amount": 1
      }
    ],
    "prerequisites": [
      265,
      627
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零式艦戦21型(熟練)",
      "scraps": [
        {
          "name": "零式艦戦52型",
          "amount": 2
        }
      ],
      "fullyskilled": true
    }
  },
  {
    "id": 629,
    "wikiId": "F26",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「艦戦」隊の再編成",
    "detail": "練度max「零戦52型(熟練)」搭載「瑞鶴」秘書艦で「零戦52型丙(六〇一空)」を廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零戦52型丙(付岩井小隊)",
        "masterId": 153,
        "amount": 1
      }
    ],
    "prerequisites": [
      293,
      624,
      627
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零式艦戦52型(熟練)",
      "secretary": "瑞鶴",
      "scraps": [
        {
          "name": "零戦52型丙(六〇一空)",
          "amount": 1
        }
      ],
      "fullyskilled": true
    }
  },
  {
    "id": 630,
    "wikiId": "F28",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「艦戦」隊の再編成",
    "detail": "練度max「零戦21型(熟練)」搭載「瑞鶴」が秘書の状態で、「零戦21型」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零戦21型(付岩本小隊)",
        "masterId": 155,
        "amount": 1
      }
    ],
    "prerequisites": [
      166,
      626
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零式艦戦21型(熟練)",
      "secretary": "瑞鶴",
      "scraps": [
        {
          "name": "零式艦戦21型",
          "amount": 2
        }
      ],
      "fullyskilled": true
    }
  },
  {
    "id": 631,
    "wikiId": "F27",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換＆部隊再編",
    "detail": "練度max「零戦52型丙(付岩井小隊)」搭載「瑞鶴」秘書艦で、「零戦62型(爆戦)」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零戦62型(爆戦/岩井隊)",
        "masterId": 154,
        "amount": 1
      }
    ],
    "prerequisites": [
      294,
      629
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零戦52型丙(付岩井小隊)",
      "secretary": "瑞鶴",
      "scraps": [
        {
          "name": "零式艦戦62型(爆戦)",
          "amount": 2
        }
      ],
      "fullyskilled": true
    }
  },
  {
    "id": 632,
    "wikiId": "F29",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換",
    "detail": "練度max「零戦21型(付岩本小隊)」搭載「瑞鶴」秘書艦で、「零戦52型」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零戦52型甲(付岩本小隊)",
        "masterId": 156,
        "amount": 1
      }
    ],
    "prerequisites": [
      625,
      630
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零戦21型(付岩本小隊)",
      "secretary": "瑞鶴",
      "scraps": [
        {
          "name": "零式艦戦52型",
          "amount": 2
        }
      ],
      "fullyskilled": true
    }
  },
  {
    "id": 633,
    "wikiId": "F30",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "機種転換＆部隊再編",
    "detail": "部隊を再編する！練度max「零戦52型甲(付岩本小隊)」搭載「瑞鶴」秘書艦で、「彩雲」を2つ廃棄！",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零式艦戦53型(岩本隊)",
        "masterId": 157,
        "amount": 1
      }
    ],
    "prerequisites": [
      167
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "零戦52型甲(付岩本小隊)",
      "secretary": "瑞鶴",
      "scraps": [
        {
          "name": "彩雲",
          "amount": 2
        }
      ],
      "fullyskilled": true
    }
  },
  {
    "id": 634,
    "wikiId": "F31",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新家具の準備",
    "detail": "「工廠」で装備アイテムを9つ「廃棄」して、新家具の準備をします。",
    "materialRewards": [
      0,
      0,
      90,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 9,
      "batch": true
    }
  },
  {
    "id": 635,
    "wikiId": "F32",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新装備の準備",
    "detail": "「工廠」で装備アイテムを5つ「廃棄」して、新装備配備の準備をします。",
    "materialRewards": [
      0,
      0,
      50,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      113,
      220
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "scrapequipment",
      "times": 5,
      "batch": true
    }
  },
  {
    "id": 636,
    "wikiId": "F33",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "上陸戦用新装備の調達",
    "detail": "「工廠」で「7.7mm機銃」及び「12.7mm単装機銃」を二つずつ廃棄！",
    "materialRewards": [
      50,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "特二式内火艇",
        "masterId": 167,
        "amount": 1
      }
    ],
    "prerequisites": [
      278,
      312
    ],
    "requirements": {
      "category": "scrapequipment",
      "list": [
        {
          "name": "7.7mm機銃",
          "amount": 2
        },
        {
          "name": "12.7mm単装機銃",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 637,
    "wikiId": "F35",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "「熟練搭乗員」養成",
    "detail": "勲章x2消費：「鳳翔」秘書艦に練度max及び改修max「九六式艦戦」を搭載、熟練搭乗員を養成せよ！<br>(任務達成後、部隊は消滅します)",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "熟練搭乗員",
        "itemId": 70,
        "amount": 1
      }
    ],
    "prerequisites": [
      638
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": "九六式艦戦",
      "secretary": "鳳翔",
      "fullyskilled": true,
      "maxmodified": true,
      "consumptions": [
        {
          "name": "勲章",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 638,
    "wikiId": "F34",
    "category": 6,
    "type": 3,
    "period": "weekly",
    "title": "対空機銃量産",
    "detail": "「機銃」系装備を量産し、工廠で6個廃棄！ 「装備改修」強化をサポートせよ！",
    "materialRewards": [
      0,
      100,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 1
      }
    ],
    "prerequisites": [
      619
    ],
    "requirements": {
      "category": "scrapequipment",
      "list": [
        {
          "name": "対空機銃",
          "amount": 6
        }
      ]
    }
  },
  {
    "id": 639,
    "wikiId": "F36",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新型魚雷兵装の開発",
    "detail": "勲章x2消費：「島風」秘書艦に改修max「61cm五連装(酸素)魚雷」と<br>改修max「61cm三連装(酸素)魚雷」を装備！(任務達成後、各装備は消滅します)",
    "materialRewards": [
      0,
      600,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 6
      },
      {
        "kind": "equipment",
        "name": "試製61cm六連装(酸素)魚雷",
        "masterId": 179,
        "amount": 1
      }
    ],
    "prerequisites": [
      638,
      818
    ],
    "requirements": {
      "category": "modelconversion",
      "equipment": [
        "61cm五連装(酸素)魚雷",
        "61cm三連装(酸素)魚雷"
      ],
      "secretary": "島風",
      "maxmodified": true,
      "consumptions": [
        {
          "name": "勲章",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 641,
    "wikiId": "F37",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「航空基地設営」事前準備",
    "detail": "「航空基地設営」の事前準備を開始する。「ドラム缶(輸送用)」を二つ「工廠」で廃棄し、「7.7mm機銃」及び「九六式艦戦」を各二つずつ用意せよ！(任務達成後、用意した必要装備は消滅します)",
    "materialRewards": [
      200,
      0,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "九六式陸攻",
        "masterId": 168,
        "amount": 1
      }
    ],
    "prerequisites": [
      296
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "7.7mm機銃",
          "amount": 2
        },
        {
          "name": "九六式艦戦",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "ドラム缶(輸送用)",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 642,
    "wikiId": "F38",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「陸攻」隊の増勢",
    "detail": "「基地航空隊」開設に向け、「陸攻」の追加調達を行う。「7.7mm機銃」及び<br>「九九式艦爆」を各二つずつ準備せよ！(任務達成後、同装備は消滅します)",
    "materialRewards": [
      0,
      200,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "九六式陸攻",
        "masterId": 168,
        "amount": 1
      }
    ],
    "prerequisites": [
      641,
      825
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "7.7mm機銃",
          "amount": 2
        },
        {
          "name": "九九式艦爆",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 643,
    "wikiId": "F39",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "主力「陸攻」の調達",
    "detail": "主力陸上攻撃機「一式陸攻」の新規調達を行う。「零式艦戦21型」を二つ「工廠」で廃棄し、<br>「九六式陸攻」一つと「九七式艦攻」二つを準備せよ！(任務達成後、用意した必要装備は消滅します)",
    "materialRewards": [
      250,
      250,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "一式陸攻",
        "masterId": 169,
        "amount": 1
      }
    ],
    "prerequisites": [
      410,
      642
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "九六式陸攻",
          "amount": 1
        },
        {
          "name": "九七式艦攻",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "零式艦戦21型",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 644,
    "wikiId": "F40",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「一式陸攻」性能向上型の調達",
    "detail": "「一式陸攻」性能向上型の配備を行う。「一式陸攻」一つと「天山」二つを準備せよ！<br>(任務達成後、用意した必要装備は消滅します/「一式陸攻」の熟練度は継承されます)",
    "materialRewards": [
      0,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "一式陸攻 二二型甲",
        "masterId": 180,
        "amount": 1
      }
    ],
    "prerequisites": [
      643
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "一式陸攻",
          "amount": 1
        },
        {
          "name": "天山",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 645,
    "wikiId": "F41",
    "category": 6,
    "type": 6,
    "period": "monthly",
    "title": "「洋上補給」物資の調達",
    "detail": "「三式弾」一つを廃棄し、燃料750及び弾薬750と「ドラム缶(輸送用)」二つと「九一式徹甲弾」一つを<br>用意せよ！※任務達成後、用意した資源及び必要装備(徹甲弾は改修値の低いもの優先)は消滅します。",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "洋上補給",
        "itemId": 67,
        "amount": 1
      }
    ],
    "prerequisites": [
      228,
      294
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "ドラム缶(輸送用)",
          "amount": 2
        },
        {
          "name": "九一式徹甲弾",
          "amount": 1
        }
      ],
      "scraps": [
        {
          "name": "三式弾",
          "amount": 1
        }
      ],
      "resources": [
        750,
        750,
        0,
        0
      ]
    }
  },
  {
    "id": 646,
    "wikiId": "F42",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「特注家具」の調達",
    "detail": "「25mm単装機銃」一つを廃棄、家具コイン5,000と「25mm連装機銃」及び「25mm三連装機銃」を各<br>二つ準備せよ！　※任務達成後、用意した家具コイン及び必要装備(改修値の低いもの優先)は消滅します。",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      110,
      302,
      604
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "25mm連装機銃",
          "amount": 2
        },
        {
          "name": "25mm三連装機銃",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "25mm単装機銃",
          "amount": 1
        }
      ],
      "consumptions": [
        {
          "name": "家具コイン",
          "amount": 5000
        }
      ]
    }
  },
  {
    "id": 647,
    "wikiId": "F43",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "中部海域「基地航空隊」展開！",
    "detail": "「ドラム缶(輸送用)」二つを廃棄、燃料1200及びボーキサイト3000、さらに「設営隊」一つを準備せよ！<br>※任務達成後、用意した資源及び「設営隊」は消滅します。",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "中部海域「基地航空隊」開放",
        "amount": 1
      }
    ],
    "prerequisites": [
      642,
      809
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "ドラム缶(輸送用)",
          "amount": 2
        }
      ],
      "resources": [
        1200,
        0,
        0,
        3000
      ],
      "consumptions": [
        {
          "name": "設営隊",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 648,
    "wikiId": "F44",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「特注家具」の調達",
    "detail": "「12.7cm連装高角砲」二つを廃棄し、家具コイン5,000と「14cm単装砲」及び「15.2cm単装砲」を各二つずつ準備せよ！　※任務達成後、用意した家具コイン及び必要装備(低改修を優先)は消費します。",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      303,
      646
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "14cm単装砲",
          "amount": 2
        },
        {
          "name": "15.2cm単装砲",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "12.7cm連装高角砲",
          "amount": 2
        }
      ],
      "consumptions": [
        {
          "name": "家具コイン",
          "amount": 5000
        }
      ]
    }
  },
  {
    "id": 649,
    "wikiId": "F45",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新機軸偵察機の開発",
    "detail": "新機軸の偵察機の調達を行う。「零式水上偵察機」を二つ「工廠」で廃棄し、<br>「一式陸攻」一つと「彩雲」二つを準備せよ！(任務達成後、用意した必要装備は消費します)",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "試製景雲(艦偵型)",
        "masterId": 151,
        "amount": 1
      }
    ],
    "prerequisites": [
      167,
      647
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "一式陸攻",
          "amount": 1
        },
        {
          "name": "彩雲",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "零式水上偵察機",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 650,
    "wikiId": "F46",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "噴式戦闘爆撃機の開発",
    "detail": "ネ式エンジンを搭載した新型戦闘爆撃機の開発を行う。「紫電改二」三つを「工廠」で廃棄し、「新型航空機設計図」二つと「ネ式エンジン」一つを準備せよ！(任務達成後、用意した必要アイテムは消費します)",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "橘花改",
        "masterId": 200,
        "amount": 1
      }
    ],
    "prerequisites": [
      304,
      649
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "紫電改二",
          "amount": 3
        }
      ],
      "consumptions": [
        {
          "name": "新型航空機設計図",
          "amount": 2
        },
        {
          "name": "ネ式エンジン",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 651,
    "wikiId": "F47",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "ネ式エンジンの増産",
    "detail": "噴式航空機生産のため、ネ式エンジンの増産を行う。「零式艦戦52型」三つを「工廠」で廃棄し、「流星」「烈風」各二つと鉄鋼8,000を準備せよ！※任務達成後、用意した必要装備と資源は消費します。",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "ネ式エンジン",
        "amount": 1
      }
    ],
    "prerequisites": [
      423,
      649
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "流星",
          "amount": 2
        },
        {
          "name": "試製烈風 後期型",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "零式艦戦52型",
          "amount": 3
        }
      ],
      "resources": [
        0,
        0,
        8000,
        0
      ]
    }
  },
  {
    "id": 652,
    "wikiId": "F48",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「特注家具」の調達",
    "detail": "主砲「12.7cm連装砲」を二つ廃棄、家具コイン5,000と「7.7mm機銃」及び「九六式艦戦」各二つずつ<br>準備せよ！　※任務達成後、用意した家具コイン及び必要装備(低改修値のもの優先)は消費します。",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      604,
      648
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "7.7mm機銃",
          "amount": 2
        },
        {
          "name": "九六式艦戦",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "12.7cm連装砲",
          "amount": 2
        }
      ],
      "consumptions": [
        {
          "name": "家具コイン",
          "amount": 5000
        }
      ]
    }
  },
  {
    "id": 653,
    "wikiId": "F90",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "工廠稼働！次期作戦準備！",
    "detail": "「14㎝単装砲」x6廢棄、家具コイン6000と「35.6㎝連装砲」「九六式艦戦」各三つを準備せよ！※任務達成後、用意した家具コイン及び必要装備（低改修値のもの優先）は消費します。",
    "materialRewards": [
      0,
      0,
      600,
      600
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "零式艦戦21型",
            "masterId": 20,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "九六式陸攻",
            "masterId": 168,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "九四式爆雷投射機",
            "masterId": 44,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "12cm30連装噴進砲",
            "masterId": 51,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "二式12cm迫撃砲改",
            "masterId": 346,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "35.6cm連装砲",
          "amount": 3
        },
        {
          "name": "九六式艦戦",
          "amount": 3
        }
      ],
      "scraps": [
        {
          "name": "14cm単装砲",
          "amount": 6
        }
      ],
      "consumptions": [
        {
          "name": "家具コイン",
          "amount": 6000
        }
      ]
    }
  },
  {
    "id": 656,
    "wikiId": "F49",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "六三一空「晴嵐」隊の編成",
    "detail": "秘書艦に「伊401」または「伊14」または「伊13」を配備。「晴嵐」を一番スロットに搭載。「瑞雲(六三一空)」を二番スロットに搭載。「晴嵐(六三一空)」を新編せよ！　※任務達成後瑞雲は消滅します。",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "晴嵐(六三一空)",
        "masterId": 208,
        "amount": 1
      }
    ],
    "prerequisites": [
      828,
      846
    ],
    "requirements": {
      "category": "modelconversion",
      "slots": [
        {
          "slot": 1,
          "equipment": "試製晴嵐"
        },
        {
          "slot": 2,
          "equipment": "瑞雲(六三一空)"
        }
      ],
      "secretary": [
        "伊401",
        "伊14",
        "伊13"
      ]
    }
  },
  {
    "id": 658,
    "wikiId": "F50",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "潜水艦武装の強化",
    "detail": "「61cm三連装魚雷」を四つ廃棄、開発資材x120と「61cm四連装(酸素)魚雷」「九三式水中聴音機」各三つを準備せよ！　※任務達成後、用意した開発資材及び必要装備(低改修値のもの優先)は消費します。",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "後期型艦首魚雷(6門)",
        "masterId": 213,
        "amount": 1
      }
    ],
    "prerequisites": [
      619,
      846
    ],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "61cm四連装(酸素)魚雷",
          "amount": 3
        },
        {
          "name": "九三式水中聴音機",
          "amount": 3
        }
      ],
      "scraps": [
        {
          "name": "61cm三連装魚雷",
          "amount": 4
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 120
        }
      ]
    }
  },
  {
    "id": 659,
    "wikiId": "F51",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "精鋭「水戦」隊の新編成",
    "detail": "精鋭飛行隊の新編成：練度max及び改修maxの「二式水戦改」を一番スロットに搭載した秘書艦で、<br>「零式艦戦21型」x2「瑞雲」x2を廃棄！　※新飛行隊を編成する「熟練搭乗員」が必要です。",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "二式水戦改(熟練)",
        "masterId": 216,
        "amount": 1
      }
    ],
    "prerequisites": [
      607,
      839
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "艦",
      "use_skilled_crew": true,
      "slots": [
        {
          "slot": 1,
          "equipment": "二式水戦改",
          "fullyskilled": true,
          "maxmodified": true
        }
      ],
      "scraps": [
        {
          "name": "零式艦戦21型",
          "amount": 2
        },
        {
          "name": "瑞雲",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 660,
    "wikiId": "F52",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "精鋭「水戦」隊の増勢",
    "detail": "精鋭飛行隊の増勢：練度max及び改修maxの「二式水戦改」を一番スロットに搭載した秘書艦で、<br>「零式艦戦21型」x2「瑞雲」x2を廃棄！　※新飛行隊を編成する「熟練搭乗員」が必要です。",
    "materialRewards": [
      0,
      0,
      0,
      50
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "二式水戦改(熟練)",
        "masterId": 216,
        "amount": 1
      }
    ],
    "prerequisites": [
      659,
      850
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "艦",
      "use_skilled_crew": true,
      "slots": [
        {
          "slot": 1,
          "equipment": "二式水戦改",
          "fullyskilled": true,
          "maxmodified": true
        }
      ],
      "scraps": [
        {
          "name": "零式艦戦21型",
          "amount": 2
        },
        {
          "name": "瑞雲",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 661,
    "wikiId": "F53",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新型砲墳兵装、戦力化開始！",
    "detail": "工廠任務：新型砲墳兵装の開発及び同戦力化を開始する。「副砲」系装備x10を廃棄、<br>鉄鋼6,000を準備せよ！　※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      0,
      400,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "新型砲熕兵装資材",
        "itemId": 75,
        "amount": 1
      }
    ],
    "prerequisites": [
      607,
      612
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "副砲",
          "amount": 10
        }
      ],
      "resources": [
        0,
        0,
        6000,
        0
      ]
    }
  },
  {
    "id": 662,
    "wikiId": "F54",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新型艤装の開発研究",
    "detail": "工廠任務：新型艤装の開発研究を実施する。「中口径主砲」系装備x10を廃棄、鉄鋼12,000を準備せよ！<br>※任務達成後、準備した資源は消費します。「勲章」と「新型砲墳兵装資材」の獲得選択が可能です。",
    "materialRewards": [
      0,
      500,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      618,
      661
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "中口径主砲",
          "amount": 10
        }
      ],
      "resources": [
        0,
        0,
        12000,
        0
      ]
    }
  },
  {
    "id": 663,
    "wikiId": "F55",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "新型艤装の継続研究",
    "detail": "工廠任務：新型艤装の開発を継続実施する。「大口径主砲」系装備x10を廃棄、鉄鋼18,000を準備せよ！<br>※任務達成後、準備した資源は消費します。「勲章」と「新型砲熕兵装資材」の獲得選択が可能です。",
    "materialRewards": [
      0,
      600,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      }
    ],
    "prerequisites": [
      425
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "大口径主砲",
          "amount": 10
        }
      ],
      "resources": [
        0,
        0,
        18000,
        0
      ]
    }
  },
  {
    "id": 664,
    "wikiId": "F56",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "電探技術の射撃装置への活用",
    "detail": "工廠任務：電探技術の射撃装置への活用を研究する。「電探」系装備x10を廃棄、弾薬及び鉄鋼を各8,000<br>準備せよ！※任務達成後、準備した資源は消費します。「勲章」と「兵装資材」の獲得選択が可能です。",
    "materialRewards": [
      0,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      }
    ],
    "prerequisites": [
      661
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "電探",
          "amount": 10
        }
      ],
      "resources": [
        0,
        8000,
        8000,
        0
      ]
    }
  },
  {
    "id": 665,
    "wikiId": "F57",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "民生産業への協力",
    "detail": "工廠任務：軍需物資を放出し、民生産業に協力する。「小口径主砲」系装備x16を廃棄、燃料12,000を<br>準備せよ！※任務達成後、準備した資源は消費します。「勲章」と「兵装資材」の獲得選択が可能です。",
    "materialRewards": [
      0,
      0,
      600,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      664
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "小口径主砲",
          "amount": 16
        }
      ],
      "resources": [
        12000,
        0,
        0,
        0
      ]
    }
  },
  {
    "id": 666,
    "wikiId": "F58",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "精鋭「瑞雲」隊の編成",
    "detail": "秘書艦「日向改」の四番スロットに改修max「瑞雲(六三四空)」を搭載して、ドラム缶(輸送用)x2を廃棄。<br>さらに「九九式艦爆」x2「瑞雲」x2を用意せよ！　※新飛行隊を編成する「熟練搭乗員」が必要です。",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "瑞雲(六三四空/熟練)",
        "masterId": 237,
        "amount": 1
      }
    ],
    "prerequisites": [
      607,
      859
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "日向改",
      "use_skilled_crew": true,
      "slots": [
        {
          "slot": 4,
          "equipment": "瑞雲(六三四空)",
          "maxmodified": true
        }
      ],
      "consumptions": [
        {
          "name": "九九式艦爆",
          "amount": 2
        },
        {
          "name": "瑞雲",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "ドラム缶(輸送用)",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 667,
    "wikiId": "F59",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "民生産業への協力を継続せよ！",
    "detail": "工廠任務：軍需物資を放出し、民生産業への協力を継続する。「機銃」系装備x10を廃棄、鉄鋼15,000を<br>準備せよ！※任務達成後、準備した資源は消費します。「特注家具職人」と「勲章」の獲得選択が可能。",
    "materialRewards": [
      0,
      0,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 2
      }
    ],
    "prerequisites": [
      665
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "対空機銃",
          "amount": 10
        }
      ],
      "resources": [
        0,
        0,
        15000,
        0
      ]
    }
  },
  {
    "id": 668,
    "wikiId": "F60",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新型戦闘糧食の試作",
    "detail": "料理任務：手軽に食事をとることができて、なおかつ美味しく腹にがっつりたまる新型の戦闘糧食を<br>開発する。「戦闘糧食」x2と燃料800及びボーキサイト150を用意せよ！油入れ送気開始！調理始め！",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "戦闘糧食(特別なおにぎり)",
        "masterId": 241,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "equipexchange",
      "equipments": [
        {
          "name": "戦闘糧食",
          "amount": 2
        }
      ],
      "scraps": [],
      "resources": [
        800,
        0,
        0,
        150
      ]
    }
  },
  {
    "id": 669,
    "wikiId": "F61",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "夜戦型艦上戦闘機の開発",
    "detail": "練度&改修maxの「F6F-3」を秘書艦一番スロットに搭載、 「13号対空電探」x2 「22号対水上電探」x2<br>を廃棄、開発資材x30、改修資材x6、ボーキサイト5,000、「新型航空兵装資材」x1を準備せよ！",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "F6F-3N",
        "masterId": 254,
        "amount": 1
      }
    ],
    "prerequisites": [
      185,
      608
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "艦",
      "slots": [
        {
          "slot": 1,
          "equipment": "F6F-3",
          "fullyskilled": true,
          "maxmodified": true
        }
      ],
      "scraps": [
        {
          "name": "13号対空電探",
          "amount": 2
        },
        {
          "name": "22号対水上電探",
          "amount": 2
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 30
        },
        {
          "name": "改修資材",
          "amount": 6
        },
        {
          "name": "新型航空兵装資材",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        0,
        5000
      ]
    }
  },
  {
    "id": 670,
    "wikiId": "F63",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "夜戦型艦上戦闘機の性能強化",
    "detail": "練度&改修maxの「F6F-5」を秘書艦一番スロットに搭載、 「13号対空電探」x2 「22号対水上電探」x2<br>を廃棄、開発資材x40、改修資材x8、ボーキサイト6,000、「新型航空兵装資材」x1を準備せよ！",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "F6F-5N",
        "masterId": 255,
        "amount": 1
      }
    ],
    "prerequisites": [
      669,
      864
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "艦",
      "slots": [
        {
          "slot": 1,
          "equipment": "F6F-5",
          "fullyskilled": true,
          "maxmodified": true
        }
      ],
      "scraps": [
        {
          "name": "13号対空電探",
          "amount": 2
        },
        {
          "name": "22号対水上電探",
          "amount": 2
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 40
        },
        {
          "name": "改修資材",
          "amount": 8
        },
        {
          "name": "新型航空兵装資材",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        0,
        6000
      ]
    }
  },
  {
    "id": 671,
    "wikiId": "F62",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "夜間作戦型艦上攻撃機の開発",
    "detail": "「TBF」を秘書艦一番スロットに搭載、「13号対空電探」x2「22号対水上電探」x2廃棄、開発資材x40<br>改修資材x10、弾薬5,000、ボーキサイト8,000、「新型航空兵装資材」x1、「熟練搭乗員」を用意せよ！",
    "materialRewards": [
      100,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "TBM-3D",
        "masterId": 257,
        "amount": 1
      }
    ],
    "prerequisites": [
      638,
      669
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "艦",
      "use_skilled_crew": true,
      "slots": [
        {
          "slot": 1,
          "equipment": "TBF"
        }
      ],
      "scraps": [
        {
          "name": "13号対空電探",
          "amount": 2
        },
        {
          "name": "22号対水上電探",
          "amount": 2
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 40
        },
        {
          "name": "改修資材",
          "amount": 10
        },
        {
          "name": "新型航空兵装資材",
          "amount": 1
        }
      ],
      "resources": [
        0,
        5000,
        0,
        8000
      ]
    }
  },
  {
    "id": 672,
    "wikiId": "F64",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「遊撃部隊」艦隊司令部の創設",
    "detail": "遊撃部隊任務：「遊撃部隊 艦隊司令部」を創設する。「艦隊司令部施設」を秘書艦一番スロットに搭載、 <br>電探系装備x3を廃棄、開発資材x10、鋼材x2,000、そして「戦闘詳報」x2を準備せよ！",
    "materialRewards": [
      0,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "遊撃部隊 艦隊司令部",
        "masterId": 272,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "modelconversion",
      "secretary": "艦",
      "slots": [
        {
          "slot": 1,
          "equipment": "艦隊司令部施設"
        }
      ],
      "scraps": [
        {
          "name": "電探",
          "amount": 3
        },
        {
          "name": "開発資材",
          "amount": 10
        }
      ],
      "consumptions": [
        {
          "name": "戦闘詳報",
          "amount": 2
        }
      ],
      "resources": [
        0,
        0,
        2000,
        0
      ]
    }
  },
  {
    "id": 673,
    "wikiId": "F65",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "装備開発力の整備",
    "detail": "工廠整備任務：装備開発力を整備する。「小口径主砲」系装備x4を廃棄せよ！",
    "materialRewards": [
      0,
      0,
      100,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      607
    ],
    "requirements": {
      "category": "scrapequipment",
      "list": [
        {
          "name": "小口径主砲",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 674,
    "wikiId": "F66",
    "category": 6,
    "type": 2,
    "period": "daily",
    "title": "工廠環境の整備",
    "detail": "工廠整備任務：工廠環境の重整備を実施する。「機銃」系装備x3を廃棄、鋼材300を準備せよ！<br>※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      673
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "対空機銃",
          "amount": 3
        }
      ],
      "resources": [
        0,
        0,
        300,
        0
      ]
    }
  },
  {
    "id": 675,
    "wikiId": "F67",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "運用装備の統合整備",
    "detail": "運用装備統合任務：装備の統合整備を実施する。「艦上戦闘機」系装備x6、「機銃」系装備x4を廃棄、<br>ボーキサイト800を準備(本任務は時局により更新されます)。　※任務達成後、準備資源を消費します。",
    "materialRewards": [
      200,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "一式戦 隼II型",
            "masterId": 221,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "紫電一一型",
            "masterId": 201,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          }
        ]
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      }
    ],
    "prerequisites": [
      674
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "艦上戦闘機",
          "amount": 6
        },
        {
          "name": "対空機銃",
          "amount": 4
        }
      ],
      "resources": [
        0,
        0,
        0,
        800
      ]
    }
  },
  {
    "id": 676,
    "wikiId": "F68",
    "category": 6,
    "type": 3,
    "period": "weekly",
    "title": "装備開発力の集中整備",
    "detail": "工廠環境の集中整備を実施する！「中口径主砲」系装備x3、「副砲」系装備x3、「ドラム缶(輸送用)」x1<br>を廃棄、鋼材2,400を準備せよ！　※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 7
      },
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      674
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "中口径主砲",
          "amount": 3
        },
        {
          "name": "副砲",
          "amount": 3
        },
        {
          "name": "ドラム缶(輸送用)",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        2400,
        0
      ]
    }
  },
  {
    "id": 677,
    "wikiId": "F69",
    "category": 6,
    "type": 3,
    "period": "weekly",
    "title": "継戦支援能力の整備",
    "detail": "艦娘の継戦支援体制の整備強化を実施する！「大口径主砲」系装備x4、「水上偵察機」系装備x2、<br>「魚雷」系装備x3を廃棄、鋼材3,600を準備せよ！　※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      0,
      500,
      0,
      150
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 5
      }
    ],
    "prerequisites": [
      674
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "大口径主砲",
          "amount": 4
        },
        {
          "name": "水上偵察機",
          "amount": 2
        },
        {
          "name": "魚雷",
          "amount": 3
        }
      ],
      "resources": [
        0,
        0,
        3600,
        0
      ]
    }
  },
  {
    "id": 678,
    "wikiId": "F70",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "主力艦上戦闘機の更新",
    "detail": "艦上戦闘機「九六式艦戦」x3、「零式艦戦21型」x5を廃棄。秘書艦の一番及び二番装備スロットに<br>「零式艦戦52型」を装備。ボーキサイト4,000を準備せよ。※任務達成後、準備資源は消費します。",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "紫電改二",
        "masterId": 55,
        "amount": 2
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 8
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      216,
      676,
      702
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "modelconversion",
          "secretary": "艦",
          "slots": [
            {
              "slot": 1,
              "equipment": "零式艦戦52型"
            },
            {
              "slot": 2,
              "equipment": "零式艦戦52型"
            }
          ],
          "scraps": [
            {
              "name": "九六式艦戦",
              "amount": 3
            },
            {
              "name": "零式艦戦21型",
              "amount": 5
            }
          ]
        },
        {
          "category": "equipexchange",
          "resources": [
            0,
            0,
            0,
            4000
          ]
        }
      ]
    }
  },
  {
    "id": 679,
    "wikiId": "F71",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "対空兵装の拡充",
    "detail": "対空兵装の整備拡充を実施する！「中口径主砲」系装備x6、「副砲」系装備x3を廃棄、<br>ボーキサイト900を準備せよ！　※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "25mm三連装機銃",
            "masterId": 40,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "12cm30連装噴進砲",
            "masterId": 51,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      605
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "中口径主砲",
          "amount": 6
        },
        {
          "name": "副砲",
          "amount": 3
        }
      ],
      "resources": [
        0,
        0,
        0,
        900
      ]
    }
  },
  {
    "id": 680,
    "wikiId": "F72",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "対空兵装の整備拡充",
    "detail": "対空兵装の整備拡充を継続実施する!「機銃」系装備x4、「電探」系装備x4を廃棄、ボーキサイト1,500を準備せよ!※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "10cm連装高角砲",
            "masterId": 3,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "12cm30連装噴進砲",
            "masterId": 51,
            "amount": 2
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "8cm高角砲",
            "masterId": 66,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 6
          }
        ]
      }
    ],
    "prerequisites": [
      605,
      679
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "対空機銃",
          "amount": 4
        },
        {
          "name": "電探",
          "amount": 4
        }
      ],
      "resources": [
        0,
        0,
        0,
        1500
      ]
    }
  },
  {
    "id": 682,
    "wikiId": "F73",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「海防艦」整備計画",
    "detail": "大型艦兵装を整理削減、警備及び海上護衛用小艦艇「海防艦」を整備する。「中口径主砲」x4、「大口径主砲」x4を破棄し、燃料500を準備せよ！※任務達成後、準備した資材は消費します。",
    "materialRewards": [
      200,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "ship",
            "name": "択捉",
            "masterId": 524,
            "amount": 1
          },
          {
            "kind": "ship",
            "name": "松輪",
            "masterId": 525,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "中口径主砲",
          "amount": 4
        },
        {
          "name": "大口径主砲",
          "amount": 4
        }
      ],
      "resources": [
        500,
        0,
        0,
        0
      ]
    }
  },
  {
    "id": 683,
    "wikiId": "F74",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "航空戦艦用強化型新主砲の研究",
    "detail": "秘書艦「伊勢改二」一番スロに「試製41cm三連装砲」改修max搭載、「41cm連装砲」×3「22号対水上電探」×2を廃棄、開発資材×40、高速建造材×50、鋼材4500、新型砲熕兵装資材×2を準備せよ！",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "41cm三連装砲改二",
        "masterId": 290,
        "amount": 1
      }
    ],
    "prerequisites": [
      324,
      664
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "伊勢改二",
      "slots": [
        {
          "slot": 1,
          "equipment": "試製41cm三連装砲",
          "maxmodified": true
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 40
        },
        {
          "name": "高速建造材",
          "amount": 50
        },
        {
          "name": "新型砲熕兵装資材",
          "amount": 2
        }
      ],
      "scraps": [
        {
          "name": "41cm連装砲",
          "amount": 3
        },
        {
          "name": "22号対水上電探",
          "amount": 2
        }
      ],
      "resources": [
        0,
        0,
        4500,
        0
      ]
    }
  },
  {
    "id": 684,
    "wikiId": "F75",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "精鋭「航空戦艦」彗星隊の編成",
    "detail": "精鋭彗星隊編成：旗艦「伊勢改二」第三スロに「彗星二二型(六三四空)」搭載、熟練搭載員、開発資材×30、新型航空兵装資材を用意、「九九艦爆」「彗星」各×3廃棄、ボーキサイト一定量確保せよ！",
    "materialRewards": [
      0,
      634,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "彗星二二型(六三四空/熟練)",
        "masterId": 292,
        "amount": 1
      }
    ],
    "prerequisites": [
      886
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": "伊勢改二",
      "slots": [
        {
          "slot": 3,
          "equipment": "彗星二二型(六三四空)"
        }
      ],
      "use_skilled_crew": true,
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 30
        },
        {
          "name": "新型航空兵装資材",
          "amount": 1
        }
      ],
      "scraps": [
        {
          "name": "九九式艦爆",
          "amount": 3
        },
        {
          "name": "彗星",
          "amount": 3
        }
      ],
      "resources": [
        0,
        0,
        0,
        3000
      ]
    }
  },
  {
    "id": 685,
    "wikiId": "F76",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "駆逐艦主砲兵装の戦時改修",
    "detail": "旗艦特型駆逐艦の第一スロに「12.7cm連装砲A型改二」改修maxを装備、 「10cm連装高角砲」x4 「94式高射装置」x1を廃棄、開発資材x30、鋼材900、新型砲熕兵装資材x1を準備せよ！",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "12.7cm連装砲A型改三(戦時改修)+高射装置",
        "masterId": 295,
        "amount": 1
      }
    ],
    "prerequisites": [
      682
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": [
        "吹雪",
        "白雪",
        "初雪",
        "深雪",
        "叢雲",
        "磯波",
        "浦波"
      ],
      "slots": [
        {
          "slot": 1,
          "equipment": "12.7cm連装砲A型改二",
          "maxmodified": true
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 30
        },
        {
          "name": "新型砲熕兵装資材",
          "amount": 1
        }
      ],
      "scraps": [
        {
          "name": "10cm連装高角砲",
          "amount": 4
        },
        {
          "name": "94式高射装置",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        900,
        0
      ]
    }
  },
  {
    "id": 686,
    "wikiId": "F77",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "戦時改修A型高角砲の量産",
    "detail": "旗艦特型駆逐艦の第一スロに「12.7cm連装砲A型改二」改修maxを装備、「10cm連装高角砲」x4、「94式高射装置」x1を廃棄、開発資材x30、鋼材900、新型砲熕兵装資材x1を再び準備せよ！",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "12.7cm連装砲A型改三(戦時改修)+高射装置",
        "masterId": 295,
        "amount": 1
      }
    ],
    "prerequisites": [
      680,
      685
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": [
        "吹雪",
        "白雪",
        "初雪",
        "深雪",
        "叢雲",
        "磯波",
        "浦波"
      ],
      "slots": [
        {
          "slot": 1,
          "equipment": "12.7cm連装砲A型改二",
          "maxmodified": true
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 30
        },
        {
          "name": "新型砲熕兵装資材",
          "amount": 1
        }
      ],
      "scraps": [
        {
          "name": "10cm連装高角砲",
          "amount": 4
        },
        {
          "name": "94式高射装置",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        900,
        0
      ]
    }
  },
  {
    "id": 687,
    "wikiId": "F78",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "駆逐艦主砲兵装の戦時改修【II】",
    "detail": "旗艦「夕立改二」または「時雨改二」第一スロに「12.7cm連装砲B型改二」改修max装備、「10cm連装高角砲」×5及び「94式高射装置」×1廃棄、開発資材×50、鋼材1200、新型砲熕兵装資材×1を準備せよ！",
    "materialRewards": [
      0,
      220,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "12.7cm連装砲B型改四(戦時改修)+高射装置",
        "masterId": 296,
        "amount": 1
      }
    ],
    "prerequisites": [
      685
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": [
        "夕立改二",
        "時雨改二"
      ],
      "slots": [
        {
          "slot": 1,
          "equipment": "12.7cm連装砲B型改二",
          "maxmodified": true
        }
      ],
      "consumptions": [
        {
          "name": "開発資材",
          "amount": 50
        },
        {
          "name": "新型砲熕兵装資材",
          "amount": 1
        }
      ],
      "scraps": [
        {
          "name": "10cm連装高角砲",
          "amount": 5
        },
        {
          "name": "94式高射装置",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        1200,
        0
      ]
    }
  },
  {
    "id": 688,
    "wikiId": "F79",
    "category": 6,
    "type": 7,
    "period": "quarterly",
    "title": "航空戦力の強化",
    "detail": "航空戦力強化任務：「艦戦」「艦爆」「艦攻」「水偵」を各3装備ずつ破棄、さらに熟練搭乗員x1、及びボーキサイト1,800を準備せよ！（任務達成後、熟練搭乗員x1及びボーキサイト1,800は消滅します）",
    "materialRewards": [
      100,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "零式艦戦32型(熟練)",
            "masterId": 182,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "一式戦 隼II型",
            "masterId": 221,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "瑞雲(六三一空)",
            "masterId": 207,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      674
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "艦上戦闘機",
          "amount": 3
        },
        {
          "name": "艦上爆撃機",
          "amount": 3
        },
        {
          "name": "艦上攻撃機",
          "amount": 3
        },
        {
          "name": "水上偵察機",
          "amount": 3
        }
      ],
      "equipments": [
        {
          "name": "熟練搭乗員",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        0,
        1800
      ]
    }
  },
  {
    "id": 689,
    "wikiId": "F80",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "戦闘機隊戦力の拡充",
    "detail": "戦闘機拡充任務：「艦戦」「水偵」各×4、「艦偵」×2装備を廃棄、熟練搭乗員×1、新型航空兵装資材×1、ボーキサイト3,000を準備せよ！（任務達成後、準備した資源・熟練搭乗員・新型航空兵装資材は消費）",
    "materialRewards": [
      0,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "烈風 一一型",
            "masterId": 53,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "三式戦 飛燕",
            "masterId": 176,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "Spitfire Mk.I",
            "masterId": 250,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      204,
      225,
      303,
      619,
      673,
      702
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "艦上戦闘機",
          "amount": 4
        },
        {
          "name": "水上偵察機",
          "amount": 4
        },
        {
          "name": "艦上偵察機",
          "amount": 2
        }
      ],
      "equipments": [
        {
          "name": "熟練搭乗員",
          "amount": 1
        },
        {
          "name": "新型航空兵装資材",
          "amount": 1
        }
      ],
      "resources": [
        0,
        0,
        0,
        3000
      ]
    }
  },
  {
    "id": 690,
    "wikiId": "F81",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "基地航空隊戦力の拡充",
    "detail": "基地航空隊拡充任務：「艦戦」「艦爆」「艦攻」各×4装備を廃棄、熟練搭乗員×1、新型航空兵装資材×2、ボーキサイト4,800を準備せよ！（任務達成後、準備した資源・熟練搭乗員・新型航空兵装資材は消費）",
    "materialRewards": [
      0,
      200,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "雷電",
            "masterId": 175,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "試製東海",
            "masterId": 269,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "紫電一一型",
            "masterId": 201,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      641,
      689
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "艦上戦闘機",
          "amount": 4
        },
        {
          "name": "艦上爆撃機",
          "amount": 4
        },
        {
          "name": "艦上攻撃機",
          "amount": 4
        }
      ],
      "equipments": [
        {
          "name": "熟練搭乗員",
          "amount": 1
        },
        {
          "name": "新型航空兵装資材",
          "amount": 2
        }
      ],
      "resources": [
        0,
        0,
        0,
        4800
      ]
    }
  },
  {
    "id": 691,
    "wikiId": "F82",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "提督室のリフォーム",
    "detail": "提督室のリフォームを実施する！まずは装備の整理から！「中口径主砲」系装備x4、「副砲」系装備x4、「機銃」系装備x4を廃棄、ボーキサイト1,600を準備せよ！",
    "materialRewards": [
      200,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 5
          },
          {
            "kind": "special",
            "name": "家具箱(中)",
            "amount": 3
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "special",
            "name": "家具箱(大)",
            "amount": 3
          }
        ]
      }
    ],
    "prerequisites": [
      303
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "中口径主砲",
          "amount": 4
        },
        {
          "name": "副砲",
          "amount": 4
        },
        {
          "name": "対空機銃",
          "amount": 4
        }
      ],
      "resources": [
        0,
        0,
        0,
        1600
      ]
    }
  },
  {
    "id": 692,
    "wikiId": "F83",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "水上艦艇装備工廠の整備",
    "detail": "水上艦艇装備工廠の整備を実施する！「小口径主砲」系装備x5、「大口径主砲」系装備x5、「水偵」系装備x5を廃棄、鋼材3,000を準備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 2
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 5
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "増設バルジ(中型艦)",
            "masterId": 72,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "増設バルジ(大型艦)",
            "masterId": 73,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "小口径主砲",
          "amount": 5
        },
        {
          "name": "大口径主砲",
          "amount": 5
        },
        {
          "name": "水上偵察機",
          "amount": 5
        }
      ],
      "resources": [
        0,
        0,
        3000,
        0
      ]
    }
  },
  {
    "id": 693,
    "wikiId": "F84",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "回転翼機の開発",
    "detail": "回転翼機装備の研究開発を実施する。「水偵」系装備x4、「艦戦」系装備x3、「艦攻」系装備x2を廃棄、ボーキサイト3,000、開発資材x20を準備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "オ号観測機改",
            "masterId": 324,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      605,
      682
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "水上偵察機",
          "amount": 4
        },
        {
          "name": "艦上戦闘機",
          "amount": 3
        },
        {
          "name": "艦上攻撃機",
          "amount": 2
        },
        {
          "name": "開発資材",
          "amount": 20
        }
      ],
      "resources": [
        0,
        0,
        0,
        3000
      ]
    }
  },
  {
    "id": 694,
    "wikiId": "F85",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "新型航空艤装の研究",
    "detail": "艦艇の航空運用能力を高める新型航空艤装の研究を行う。「瑞雲」x4、「彗星」x4、「流星」x2を廃棄、鋼材8,500、ボーキサイト4,000、開発資材x60を準備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "special",
            "name": "試製甲板カタパルト",
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 3
          }
        ]
      }
    ],
    "prerequisites": [
      303,
      693
    ],
    "requirements": {
      "category": "equipexchange",
      "scraps": [
        {
          "name": "瑞雲",
          "amount": 4
        },
        {
          "name": "彗星",
          "amount": 4
        },
        {
          "name": "流星",
          "amount": 2
        },
        {
          "name": "開発資材",
          "amount": 60
        }
      ],
      "resources": [
        0,
        0,
        8500,
        4000
      ]
    }
  },
  {
    "id": 695,
    "wikiId": "F86",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "「彗星」艦爆の新運用研究",
    "detail": "三号爆弾運用：旗艦「伊勢改二」または「日向改二」第一スロに「彗星一二型甲」搭載、 「彗星」x4、「九九式艦爆」x3、「瑞雲」x2廃棄、弾薬x2,500、ボーキ5,000、新型航空兵装資材x1を準備せよ！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "彗星一二型(六三四空/三号爆弾搭載機)",
        "masterId": 319,
        "amount": 1
      }
    ],
    "prerequisites": [
      331,
      693
    ],
    "requirements": {
      "category": "modelconversion",
      "secretary": [
        "伊勢改二",
        "日向改二"
      ],
      "slots": [
        {
          "slot": 1,
          "equipment": "彗星一二型甲"
        }
      ],
      "scraps": [
        {
          "name": "彗星",
          "amount": 4
        },
        {
          "name": "九九式艦爆",
          "amount": 3
        },
        {
          "name": "瑞雲",
          "amount": 2
        },
        {
          "name": "新型航空兵装資材",
          "amount": 1
        }
      ],
      "resources": [
        0,
        2500,
        0,
        5000
      ]
    }
  },
  {
    "id": 696,
    "wikiId": "F87",
    "category": 6,
    "type": 1,
    "period": "once",
    "title": "最精鋭「瑞雲」隊の編成",
    "detail": "旗艦「伊勢改二」「日向改二」 第一ス口に「瑞雲改二(六三四空)」※改修max。「瑞雲」x6「彗星」x3、「試製烈風 後期型」x1廃棄、弾薬2,000、ボ一キ8,000、新型航空兵装資材x1、熟練搭乗員x2を準備！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "瑞雲改二(六三四空/熟練)",
        "masterId": 323,
        "amount": 1
      }
    ],
    "prerequisites": [
      695,
      897
    ],
    "requirements": {
      "category": "modelconversion",
      "use_skilled_crew": true,
      "slots": [
        {
          "slot": 1,
          "equipment": "瑞雲改二(六三四空)",
          "maxmodified": true
        }
      ],
      "secretary": [
        "伊勢改二",
        "日向改二"
      ],
      "scraps": [
        {
          "name": "瑞雲",
          "amount": 6
        },
        {
          "name": "彗星",
          "amount": 3
        },
        {
          "name": "試製烈風 後期型",
          "amount": 1
        }
      ],
      "consumptions": [
        {
          "name": "新型航空兵装資材",
          "amount": 1
        }
      ],
      "resources": [
        0,
        2000,
        0,
        8000
      ]
    }
  },
  {
    "id": 701,
    "wikiId": "G01",
    "category": 7,
    "type": 1,
    "period": "once",
    "title": "はじめての「近代化改修」！",
    "detail": "任意の艦を近代化改修(合成)して、強化せよ！",
    "materialRewards": [
      0,
      0,
      50,
      50
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "simple",
      "subcategory": "modernization",
      "times": 1
    }
  },
  {
    "id": 702,
    "wikiId": "G02",
    "category": 7,
    "type": 2,
    "period": "daily",
    "title": "艦の「近代化改修」を実施せよ！",
    "detail": "近代化改修を実施して、２回以上これを成功させよ！",
    "materialRewards": [
      20,
      20,
      50,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 1
      }
    ],
    "prerequisites": [
      701
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "modernization",
      "times": 2
    }
  },
  {
    "id": 703,
    "wikiId": "G03",
    "category": 7,
    "type": 3,
    "period": "weekly",
    "title": "「近代化改修」を進め、戦備を整えよ！",
    "detail": "一週間の間に、近代化改修を１5回成功させよ！",
    "materialRewards": [
      200,
      200,
      300,
      100
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速建造材",
        "material": "buildKit",
        "amount": 1
      },
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 2
      }
    ],
    "prerequisites": [
      702
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "modernization",
      "times": 15
    }
  },
  {
    "id": 704,
    "wikiId": "G04",
    "category": 7,
    "type": 1,
    "period": "once",
    "title": "「大型艦建造」の準備！(その壱)",
    "detail": "大型艦/新型艦建造のための準備を行う。任意の艦で近代化改修を4回成功させよ！",
    "materialRewards": [
      0,
      0,
      400,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 1
      }
    ],
    "prerequisites": [
      109
    ],
    "requirements": {
      "category": "simple",
      "subcategory": "modernization",
      "times": 4
    }
  },
  {
    "id": 705,
    "wikiId": "G05",
    "category": 7,
    "type": 1,
    "period": "once",
    "title": "航空艤装の近代化改修",
    "detail": "鉄鋼5,500及びボーキサイト2,500を準備して、任意の正規空母の近代化改修を<br>[航空母艦]x5隻同時使用により2回成功させよ！※任務達成後、準備した資源は消費します。",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "新型航空機設計図",
        "itemId": 74,
        "amount": 1
      }
    ],
    "prerequisites": [
      703,
      838
    ],
    "requirements": {
      "category": "modernization",
      "times": 2,
      "ship": "空母",
      "consumptions": [
        {
          "ship": [
            "軽母",
            "空母"
          ],
          "amount": 5
        }
      ],
      "resources": [
        0,
        0,
        5500,
        2500
      ]
    }
  },
  {
    "id": 805,
    "wikiId": "B58",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "旗艦「霞」北方海域を哨戒せよ！",
    "detail": "旗艦「霞改二」で駆逐艦4隻を含む艦隊を北方海域に投入し、モーレイ海哨戒を実施せよ！",
    "materialRewards": [
      300,
      0,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "13号対空電探改",
        "masterId": 106,
        "amount": 1
      }
    ],
    "prerequisites": [
      132,
      303
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-1",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": "霞改二",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 3
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 806,
    "wikiId": "B59",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "旗艦「霞」出撃！敵艦隊を撃滅せよ！",
    "detail": "旗艦「霞改二」で駆逐艦3隻を含む艦隊で南西諸島沖ノ島沖に突入！敵主力を撃滅せよ！",
    "materialRewards": [
      500,
      500,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "25mm三連装機銃 集中配備",
        "masterId": 131,
        "amount": 1
      }
    ],
    "prerequisites": [
      402,
      805
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "霞改二",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 2
        },
        {
          "ship": "艦",
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 807,
    "wikiId": "B60",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第三十一戦隊」出撃せよ！",
    "detail": "第三十一戦隊(第一次)を鎮守府近海航路に出撃させ、同航路の安全確保に努めよ！",
    "materialRewards": [
      0,
      0,
      600,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "菱餅",
        "itemId": 58,
        "amount": 1
      }
    ],
    "prerequisites": [
      171,
      201
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-6",
      "times": 1,
      "groups": [
        {
          "ship": "五十鈴改二",
          "flagship": true
        },
        {
          "ship": "皐月改二"
        },
        {
          "ship": "卯月改"
        },
        {
          "ship": "艦",
          "amount": 3
        }
      ],
      "result": "クリア"
    }
  },
  {
    "id": 808,
    "wikiId": "B61",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第二七駆逐隊」出撃せよ！",
    "detail": "「白露改」旗艦の第二七戦隊を含む艦隊をオリョール海に展開、同海域の敵艦隊を撃滅せよ！",
    "materialRewards": [
      500,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "furniture",
        "name": "「春の一番」掛け軸",
        "furnitureId": 277,
        "amount": 1
      }
    ],
    "prerequisites": [
      172
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "白露改",
          "flagship": true
        },
        {
          "ship": "時雨"
        },
        {
          "ship": "春雨"
        },
        {
          "ship": "五月雨"
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 809,
    "wikiId": "B62",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "強襲上陸作戦用戦力を増強せよ！",
    "detail": "中部海域における航空偵察「K作戦」を実施しつつ、強襲上陸作戦用戦力の強化を図れ！",
    "materialRewards": [
      0,
      600,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "equipment",
        "name": "大発動艇",
        "masterId": 68,
        "amount": 1
      }
    ],
    "prerequisites": [
      243,
      420
    ],
    "requirements": {
      "category": "sortie",
      "map": "6-3",
      "boss": true,
      "result": "B",
      "times": 1
    }
  },
  {
    "id": 810,
    "wikiId": "B63",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "製油所地帯を防衛せよ！",
    "detail": "水雷戦隊を製油所地帯沿岸に展開！同海域に出没する敵艦隊を三回以上撃滅せよ！",
    "materialRewards": [
      400,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "勲章",
        "itemId": 57,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-3",
      "boss": true,
      "result": "S",
      "times": 3,
      "groups": [
        {
          "ship": "軽巡",
          "amount": 1
        },
        {
          "ship": "駆逐"
        }
      ],
      "disallowed": "他の艦"
    }
  },
  {
    "id": 811,
    "wikiId": "B64",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "南西諸島防衛線を強化せよ！",
    "detail": "南西諸島防衛線に有力な艦隊を展開、同方面に来襲する敵艦隊を五回以上撃滅せよ！",
    "materialRewards": [
      0,
      0,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      }
    ],
    "prerequisites": [
      634,
      810
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-4",
      "boss": true,
      "result": "S",
      "times": 5
    }
  },
  {
    "id": 812,
    "wikiId": "B65",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "オリョール海の制海権を確保せよ！",
    "detail": "大潮を旗艦とする艦隊を東部オリョール海に反復出撃、同方面敵艦隊を完全撃滅せよ！",
    "materialRewards": [
      0,
      400,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "勲章",
        "itemId": 57,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      239,
      811
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 6,
      "groups": [
        {
          "ship": "大潮",
          "flagship": true
        },
        {
          "ship": "艦",
          "amount": 5
        }
      ]
    }
  },
  {
    "id": 813,
    "wikiId": "B66",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "旗艦「大潮」出撃せよ！",
    "detail": "「大潮改二」旗艦の有力な艦隊を北方AL海域に展開、北方海域戦闘哨戒を実施せよ！",
    "materialRewards": [
      500,
      500,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      }
    ],
    "prerequisites": [
      806,
      812
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "大潮改二",
          "flagship": true
        },
        {
          "ship": "艦",
          "amount": 5
        }
      ]
    }
  },
  {
    "id": 814,
    "wikiId": "B68",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "強行高速輸送部隊、出撃せよ！",
    "detail": "「江風改二」「時雨改二」「川内改二」他駆逐2隻を含む艦隊で、ジャム島攻略作戦を実施せよ！",
    "materialRewards": [
      500,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      173
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-1",
      "boss": true,
      "result": "A",
      "times": 1,
      "groups": [
        {
          "ship": "川内改二",
          "flagship": true
        },
        {
          "ship": "江風改二"
        },
        {
          "ship": "時雨改二"
        },
        {
          "ship": "駆逐",
          "amount": 2
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 815,
    "wikiId": "B69",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第一航空戦隊」西へ！",
    "detail": "旗艦「赤城」同僚艦「加賀」を中核とする艦隊で、深海東洋艦隊漸減作戦を貫徹せよ！",
    "materialRewards": [
      0,
      800,
      0,
      800
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "熟練搭乗員",
        "itemId": 70,
        "amount": 1
      }
    ],
    "prerequisites": [
      636,
      814
    ],
    "requirements": {
      "category": "sortie",
      "map": "4-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "赤城",
          "flagship": true
        },
        {
          "ship": "加賀"
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 816,
    "wikiId": "B67",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "艦隊、三周年！",
    "detail": "三周年を記念しバシー島沖及び東部オリョール海に出撃、同海域の敵艦隊を撃滅せよ！",
    "materialRewards": [
      1000,
      1000,
      1000,
      0
    ],
    "rewards": [
      {
        "kind": "furniture",
        "name": "「三周年記念」掛け軸",
        "furnitureId": 286,
        "amount": 1
      }
    ],
    "prerequisites": [
      105,
      206
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "2-2",
          "boss": true,
          "result": "S"
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-3",
          "boss": true,
          "result": "S"
        }
      ]
    }
  },
  {
    "id": 817,
    "wikiId": "B70",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編艦隊、南西諸島防衛線へ急行せよ！",
    "detail": "水雷戦隊を含む新編艦隊を南西諸島防衛線に展開、同方面に来襲する敵艦隊を撃破せよ！",
    "materialRewards": [
      300,
      300,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      174
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-4",
      "boss": true,
      "result": "A",
      "times": 1,
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 4
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 818,
    "wikiId": "B71",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "鎮守府近海航路の安全確保を強化せよ！",
    "detail": "水雷戦隊を含む新編艦隊を鎮守府近海航路に出撃させ、同航路の安全確保に努めよ！",
    "materialRewards": [
      0,
      900,
      900,
      900
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      817
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-6",
      "times": 1,
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 4
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ],
      "result": "クリア"
    }
  },
  {
    "id": 819,
    "wikiId": "B72",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第三十一戦隊」敵潜を制圧せよ！",
    "detail": "第三十一戦隊(第一次)を鎮守府近海航路に再投入！反復出撃し、敵潜を制圧せよ！",
    "materialRewards": [
      310,
      310,
      0,
      310
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "equipment",
        "name": "三式水中探信儀",
        "masterId": 47,
        "amount": 1
      }
    ],
    "prerequisites": [
      171,
      228
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-6",
      "times": 2,
      "groups": [
        {
          "ship": "五十鈴改二",
          "flagship": true
        },
        {
          "ship": "皐月改二"
        },
        {
          "ship": "卯月改"
        },
        {
          "ship": "艦",
          "amount": 3
        }
      ],
      "result": "クリア"
    }
  },
  {
    "id": 820,
    "wikiId": "B73",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「第八駆逐隊」出撃せよ！",
    "detail": "新編「第八駆逐隊」を含む艦隊を鎮守府近海航路に出撃させ、同航路の安全確保に努めよ！",
    "materialRewards": [
      400,
      400,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "探照灯",
        "masterId": 74,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "大発動艇",
        "masterId": 68,
        "amount": 1
      }
    ],
    "prerequisites": [
      175
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-6",
      "times": 1,
      "groups": [
        {
          "ship": "朝潮改二",
          "flagship": true
        },
        {
          "ship": "大潮"
        },
        {
          "ship": "満潮"
        },
        {
          "ship": "荒潮"
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ],
      "result": "クリア"
    }
  },
  {
    "id": 821,
    "wikiId": "B74",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「八駆第一小隊」対潜哨戒！",
    "detail": "「第八駆逐隊第一小隊」を含む艦隊で鎮守府正面対潜哨戒を反復実施！敵潜を圧倒せよ！",
    "materialRewards": [
      0,
      800,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      },
      {
        "kind": "equipment",
        "name": "四式水中聴音機",
        "masterId": 149,
        "amount": 1
      }
    ],
    "prerequisites": [
      176
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "S",
      "times": 2,
      "groups": [
        {
          "ship": "朝潮改二丁"
        },
        {
          "ship": "大潮改二"
        }
      ]
    }
  },
  {
    "id": 822,
    "wikiId": "Bq01",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "沖ノ島海域迎撃戦",
    "detail": "有力な艦隊を沖ノ島海域前面に反復投入、侵攻する敵機動部隊を迎撃、これを撃滅せよ！",
    "materialRewards": [
      800,
      800,
      800,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 5
      },
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      233,
      264
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-4",
      "boss": true,
      "result": "S",
      "times": 2
    }
  },
  {
    "id": 823,
    "wikiId": "B75",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "水雷戦隊、南西防衛線に反復出撃せよ！",
    "detail": "軽巡級旗艦と駆逐艦4隻の水雷戦隊を基幹とした艦隊を編成、<br>南西諸島防衛線に反復出撃し、同海域の制海権確保に努めよ！",
    "materialRewards": [
      0,
      350,
      0,
      350
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      817
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-4",
      "boss": true,
      "result": "A",
      "times": 2,
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 4
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 824,
    "wikiId": "B76",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "製油所地帯沿岸の哨戒を実施せよ！",
    "detail": "軽空母旗艦と駆逐艦3隻を基幹とした護衛艦隊を編成、<br>製油所地帯沿岸に展開し、同海域の哨戒を実施、同海域の安全を確保せよ！",
    "materialRewards": [
      600,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      209
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "軽母",
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 3
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 825,
    "wikiId": "B77",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "水雷戦隊、南西諸島海域を哨戒せよ！",
    "detail": "水雷戦隊を基幹とした有力な艦隊で南西諸島海域バシー島沖及び東部オリョール海を哨戒、<br>同海域に遊弋する敵艦隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      600,
      600,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      303
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "2-2",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "軽巡",
              "flagship": true
            },
            {
              "ship": "駆逐",
              "amount": 4
            },
            {
              "ship": "艦",
              "amount": 1
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-3",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "軽巡",
              "flagship": true
            },
            {
              "ship": "駆逐",
              "amount": 4
            },
            {
              "ship": "艦",
              "amount": 1
            }
          ]
        }
      ]
    }
  },
  {
    "id": 826,
    "wikiId": "B78",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十九駆逐隊」出撃せよ！",
    "detail": "特型駆逐艦4隻による「第十九駆逐隊」を鎮守府近海に展開！<br>鎮守府正面対潜哨戒を実施し、跳梁する敵潜部隊の制圧に努めよ！",
    "materialRewards": [
      300,
      300,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      177
    ],
    "requirements": {
      "category": "sortie",
      "map": "1-5",
      "boss": true,
      "result": "A",
      "times": 1,
      "groups": [
        {
          "ship": "磯波"
        },
        {
          "ship": "浦波"
        },
        {
          "ship": "綾波"
        },
        {
          "ship": "敷波"
        }
      ]
    }
  },
  {
    "id": 827,
    "wikiId": "B79",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十九駆逐隊」敵主力に突入せよ！",
    "detail": "「第十九駆逐隊」を含む有力な艦隊を編成し、南西諸島海域沖ノ島沖に展開！<br>同方面に遊弋する敵主力を捕捉、これを撃破せよ！",
    "materialRewards": [
      600,
      600,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "洋上補給",
        "itemId": 67,
        "amount": 1
      }
    ],
    "prerequisites": [
      826
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-5",
      "boss": true,
      "result": "A",
      "times": 1,
      "groups": [
        {
          "ship": "磯波"
        },
        {
          "ship": "浦波"
        },
        {
          "ship": "綾波"
        },
        {
          "ship": "敷波"
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 828,
    "wikiId": "B80",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "飛行場設営の準備を実施せよ！",
    "detail": "中部海域における航空偵察「K作戦」を再度実施、さらに同方面に遊弋する敵艦隊を撃滅し、<br>中部海域における飛行場設営の準備を実施せよ！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "設営隊",
        "amount": 1
      }
    ],
    "prerequisites": [
      273,
      809
    ],
    "requirements": {
      "category": "sortie",
      "map": "6-3",
      "boss": true,
      "result": "S",
      "times": 1
    }
  },
  {
    "id": 829,
    "wikiId": "B81",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "夜間突入！敵上陸部隊を叩け！",
    "detail": "南方サブ島沖海域へ精鋭艦隊を突入！敵艦隊の邀撃を突破し、同方面の敵上陸部隊を叩け！",
    "materialRewards": [
      0,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "設営隊",
        "amount": 1
      }
    ],
    "prerequisites": [
      828
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-3",
      "boss": true,
      "result": "A",
      "times": 1
    }
  },
  {
    "id": 830,
    "wikiId": "B82",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "夜の海を照らす「灯り」を入手せよ！",
    "detail": "有力な艦隊をカムラン半島に投入、同方面に出没する敵艦隊を捕捉、これを撃滅せよ！<br>そして、夜を照らす「灯り」を入手せよ！　ある季節は夜戦以外にも使い道があるようだ！",
    "materialRewards": [
      100,
      100,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "探照灯",
        "masterId": 74,
        "amount": 1
      }
    ],
    "prerequisites": [
      206
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-1",
      "boss": true,
      "result": "S",
      "times": 1
    }
  },
  {
    "id": 833,
    "wikiId": "B139",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "陸戦用装備の艦載運用実戦研究",
    "detail": "陸戦用装備の艦載運用研究：水上機母艦または揚陸艦を含む艦隊を編成、西方海域カレー洋リランカ島沖及び中部北海域ピーコック島沖の各作戦において、敵地上戦力と交戦、これを複数回撃破せよ！",
    "materialRewards": [
      0,
      500,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "二式12cm迫撃砲改",
            "masterId": 346,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "艦載型 四式20cm対地噴進砲",
            "masterId": 348,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      621,
      828
    ],
    "requirements": {
      "category": "sortie",
      "times": 2,
      "map": [
        "4-5",
        "6-4"
      ],
      "boss": true,
      "result": "A",
      "groups": [
        {
          "ship": [
            "水上機母艦",
            "揚陸艦"
          ],
          "amount": [
            1,
            99
          ]
        }
      ]
    }
  },
  {
    "id": 834,
    "wikiId": "B83",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "南西諸島防衛線を増強せよ！",
    "detail": "水上機母艦または航空巡洋艦を旗艦とする有力な艦隊を南西諸島防衛線に投入、<br>水上機戦力によって同防衛線を強化、同方面の敵艦隊を撃滅せよ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "家具箱（中）",
        "itemId": 11,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "map": "1-4",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": [
            "航巡",
            "水母"
          ],
          "flagship": true
        }
      ]
    }
  },
  {
    "id": 835,
    "wikiId": "B84",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第十六戦隊(第三次)」出撃せよ！",
    "detail": "「第十六戦隊(第三次)」を沖ノ島海域前面に展開、敵主力艦隊を捕捉、これを撃破せよ！",
    "materialRewards": [
      400,
      0,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "furniture",
        "name": "艦娘座布団の床",
        "furnitureId": 30,
        "amount": 1
      }
    ],
    "prerequisites": [
      178
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-4",
      "boss": true,
      "result": "A",
      "times": 1,
      "groups": [
        {
          "ship": "鬼怒"
        },
        {
          "ship": "青葉"
        },
        {
          "ship": "北上"
        },
        {
          "ship": "大井"
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 836,
    "wikiId": "B85",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「第十六戦隊」突入せよ！",
    "detail": "再編成を完了した精鋭「第十六戦隊」を南西諸島海域沖ノ島沖に展開、<br>同方面に遊弋する敵主力を捕捉、これを撃破せよ！",
    "materialRewards": [
      600,
      600,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "特大発動艇",
        "masterId": 193,
        "amount": 1
      }
    ],
    "prerequisites": [
      179
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-5",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "鬼怒改二",
          "flagship": true
        },
        {
          "ship": [
            "北上改二",
            "大井改二",
            "球磨改",
            "青葉改",
            "浦波改",
            "敷波改"
          ],
          "select": 5
        }
      ]
    }
  },
  {
    "id": 837,
    "wikiId": "B86",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "輸送作戦を成功させ、帰還せよ！",
    "detail": "「鬼怒改二」を旗艦、僚艦に「浦波改」他駆逐艦3隻の計5隻の艦隊で<br>バシー島沖における柳輸送作戦を実施、同輸送作戦を完全成功させ、帰還せよ！",
    "materialRewards": [
      1000,
      0,
      1000,
      3000
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 5
      },
      {
        "kind": "useitem",
        "name": "洋上補給",
        "itemId": 67,
        "amount": 1
      }
    ],
    "prerequisites": [
      827,
      836
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-2",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "鬼怒改二",
          "flagship": true
        },
        {
          "ship": "浦波改"
        },
        {
          "ship": "駆逐",
          "amount": 3
        },
        {
          "ship": "艦",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 838,
    "wikiId": "B87",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "重巡戦隊、抜錨せよ！",
    "detail": "重巡4隻を基幹戦力とした重巡旗艦の艦隊を南西諸島海域東部オリョール海に展開し、<br>同海域の敵艦隊を撃滅、制海権を確保せよ！",
    "materialRewards": [
      400,
      400,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "furniture",
        "name": "手編みとフローリング",
        "furnitureId": 11,
        "amount": 1
      }
    ],
    "prerequisites": [
      116
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": [
            "重巡",
            "航巡"
          ],
          "flagship": true
        },
        {
          "ship": [
            "重巡",
            "航巡"
          ],
          "amount": 3
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 839,
    "wikiId": "B88",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "戦艦戦隊、出撃せよ！",
    "detail": "戦艦2隻を中核戦力とする戦艦旗艦の艦隊を北方海域アルフォンシーノ方面に進出させ、<br>同海域の敵艦隊を撃滅、北方海域の制海権確保に努めよ！",
    "materialRewards": [
      0,
      800,
      0,
      200
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 2
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "二式水戦改",
            "masterId": 165,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "PBY-5A Catalina",
            "masterId": 178,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      838
    ],
    "requirements": {
      "category": "sortie",
      "map": "3-3",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": [
            "戦艦",
            "航戦"
          ],
          "flagship": true
        },
        {
          "ship": [
            "戦艦",
            "航戦"
          ],
          "amount": 1
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 842,
    "wikiId": "B89",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "主力戦艦戦隊、抜錨せよ！",
    "detail": "戦艦または航空戦艦2隻以上からなる強力な戦艦戦隊を中核とした艦隊を沖ノ島海域前面に展開、<br>侵攻する敵艦隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      0,
      800,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "改良型艦本式タービン",
            "masterId": 33,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "強化型艦本式缶",
            "masterId": 34,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      233
    ],
    "requirements": {
      "category": "sortie",
      "map": "2-4",
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": [
            "低速戦艦",
            "航戦"
          ],
          "amount": 2
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 844,
    "wikiId": "B90",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「第八駆逐隊」突入せよ！",
    "detail": "「荒潮改二」を旗艦とし、僚艦に「第八駆逐隊」から1隻を配備した精鋭第1艦隊で<br>サーモン海域北方に突入、同方面に接近する有力な敵艦隊を捕捉、同方面の敵戦力の漸減に努めよ！",
    "materialRewards": [
      800,
      800,
      0,
      800
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "補強増設",
        "itemId": 64,
        "amount": 1
      }
    ],
    "prerequisites": [
      820,
      829
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-5",
      "boss": true,
      "result": "A",
      "times": 2,
      "groups": [
        {
          "ship": "荒潮改二",
          "flagship": true
        },
        {
          "ship": [
            "朝潮",
            "大潮",
            "満潮"
          ],
          "select": 1
        }
      ]
    }
  },
  {
    "id": 845,
    "wikiId": "Bq12",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "発令！「西方海域作戦」",
    "detail": "大規模出撃任務：「西方海域作戦」が発令された！有力な艦隊を編成し、西方海域全海域に出撃、同海域に展開する敵戦力を完全撃破、これを殲滅せよ！艦隊、西へ！",
    "materialRewards": [
      0,
      0,
      2400,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "戦果330",
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "新型噴進装備開発資材",
            "itemId": 92,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      247,
      284
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "4-1",
        "4-2",
        "4-3",
        "4-4",
        "4-5"
      ],
      "boss": true,
      "result": "S"
    }
  },
  {
    "id": 846,
    "wikiId": "B91",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "潜水艦隊、中部海域の哨戒を実施せよ！",
    "detail": "潜水艦を旗艦とし、4隻以上の有力な潜水艦を配備した第一艦隊、精鋭潜水艦隊で<br>中部海域哨戒線に進出、回航中の敵空母を捕捉、これを襲撃せよ！",
    "materialRewards": [
      300,
      300,
      300,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [
      218,
      815
    ],
    "requirements": {
      "category": "sortie",
      "map": "6-1",
      "boss": true,
      "result": "B",
      "times": 1,
      "groups": [
        {
          "ship": [
            "潜水艦",
            "潜水空母"
          ],
          "flagship": true
        },
        {
          "ship": [
            "潜水艦",
            "潜水空母"
          ],
          "amount": 3
        }
      ]
    }
  },
  {
    "id": 848,
    "wikiId": "B92",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "重装甲巡洋艦、鉄底海峡に突入せよ！",
    "detail": "第一艦隊旗艦に「Zara due」を配備、同艦隊で南方サブ島沖海域へ突入！同方面の敵艦隊群を突破し、鉄底海峡に展開する敵戦力を撃破せよ！",
    "materialRewards": [
      0,
      0,
      700,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "艦本新設計 増設バルジ(中型艦)",
        "masterId": 203,
        "amount": 1
      }
    ],
    "prerequisites": [
      846
    ],
    "requirements": {
      "category": "sortie",
      "map": "5-3",
      "boss": true,
      "result": "A",
      "times": 1,
      "groups": [
        {
          "ship": "Zara due",
          "flagship": true
        }
      ]
    }
  },
  {
    "id": 849,
    "wikiId": "B93",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "南西諸島方面の敵艦隊を撃破せよ！",
    "detail": "軽巡を旗艦とした艦隊を編成し、南西諸島防衛線、バシー島沖及び<br>東部オリョール海に展開、同海域に遊弋する敵艦隊を撃破せよ！",
    "materialRewards": [
      300,
      0,
      300,
      300
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "1-4",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "軽巡",
              "flagship": true
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-2",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "軽巡",
              "flagship": true
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-3",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "軽巡",
              "flagship": true
            }
          ]
        }
      ]
    }
  },
  {
    "id": 850,
    "wikiId": "B94",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "洋上航空戦力を拡充せよ！",
    "detail": "航空母艦、または水上機母艦を旗艦とした有力な艦隊を編成、北方AL海域、<br>西方海域カスガダマ沖 、中部海域MS諸島沖に展開し、各海域の敵艦隊を撃滅せよ！",
    "materialRewards": [
      500,
      500,
      0,
      1000
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 5
      },
      {
        "kind": "useitem",
        "name": "熟練搭乗員",
        "itemId": 70,
        "amount": 1
      }
    ],
    "prerequisites": [
      846,
      849
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "3-5",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "空母",
                "水母"
              ],
              "flagship": true
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "4-4",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "空母",
                "水母"
              ],
              "flagship": true
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "6-2",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "空母",
                "水母"
              ],
              "flagship": true
            }
          ]
        }
      ]
    }
  },
  {
    "id": 851,
    "wikiId": "B95",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "改装航空巡洋艦、出撃！",
    "detail": "改装航空巡洋艦「鈴谷改二」を旗艦とした精強な艦隊を編成、同艦隊を南方海域に展開、<br>南方海域前面、及びサブ島沖海域に遊弋する敵艦隊群を捕捉、これを撃破せよ！",
    "materialRewards": [
      300,
      300,
      300,
      700
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "強風改",
            "masterId": 217,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "艦本新設計 増設バルジ(中型艦)",
            "masterId": 203,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      287,
      838
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "5-1",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "鈴谷改二",
              "flagship": true
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "5-3",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "鈴谷改二",
              "flagship": true
            }
          ]
        }
      ]
    }
  },
  {
    "id": 852,
    "wikiId": "B96",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "改装攻撃型軽空母、前線展開せよ！",
    "detail": "改装航空母艦「鈴谷航改二」を旗艦とした精強な機動部隊を編成、同艦隊を中部海域に進出。<br>MS諸島沖、KW環礁沖海域に展開し、同海域の敵機動部隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      0,
      1000,
      0,
      1000
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "零式艦戦63型(爆戦)",
        "masterId": 219,
        "amount": 1
      },
      {
        "kind": "equipment",
        "name": "8cm高角砲改+増設機銃",
        "masterId": 220,
        "amount": 1
      }
    ],
    "prerequisites": [
      851
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "6-2",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "鈴谷航改二",
              "flagship": true
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "6-5",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "鈴谷航改二",
              "flagship": true
            }
          ]
        }
      ]
    }
  },
  {
    "id": 853,
    "wikiId": "B97",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "鎮守府海域警戒を厳とせよ！",
    "detail": "巡洋艦クラスを旗艦に配備、2隻以上の駆逐艦を擁する警戒艦隊を編成せよ。同警戒艦隊を以て、<br>鎮守府海域(南西諸島/製油所地帯沿岸/南西諸島防衛線/鎮守府近海)の警戒任務にあたれ！",
    "materialRewards": [
      400,
      400,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 2
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      839
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-2",
        "1-3",
        "1-4",
        "1-5"
      ],
      "boss": true,
      "result": "A",
      "groups": [
        {
          "ship": [
            "軽巡洋艦",
            "練習巡洋艦",
            "重雷装巡洋艦",
            "航空巡洋艦",
            "重巡洋艦"
          ],
          "flagship": true
        },
        {
          "ship": "駆逐",
          "amount": 2
        },
        {
          "ship": "艦"
        }
      ]
    }
  },
  {
    "id": 854,
    "wikiId": "Bq02",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "戦果拡張任務！「Z作戦」前段作戦",
    "detail": "戦果拡張作戦：我が第一艦隊に精鋭艦艇を集中配備、同精鋭艦隊を以て、南西諸島の沖ノ島海域、<br>中部海域哨戒線、グアノ環礁沖の敵艦隊を撃破、中部北海域ピーコック島の敵戦力を破砕殲滅せよ！",
    "materialRewards": [
      0,
      2000,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 3
      },
      {
        "kind": "special",
        "name": "戦果350",
        "amount": 1
      }
    ],
    "prerequisites": [
      220,
      846
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "2-4",
          "boss": true,
          "result": "A"
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "6-1",
          "boss": true,
          "result": "A"
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "6-3",
          "boss": true,
          "result": "A"
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "6-4",
          "boss": true,
          "result": "S"
        }
      ]
    }
  },
  {
    "id": 855,
    "wikiId": "B98",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "海上護衛体制の強化に努めよ！",
    "detail": "海上護衛作戦：駆逐艦または海防艦3隻以上を含む護衛艦隊を編成し、鎮守府海域の製油所地帯沿岸、<br>南西諸島防衛線、鎮守府近海、鎮守府近海航路にそれぞれ展開、各海域における作戦を成功させよ！",
    "materialRewards": [
      400,
      0,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "特注家具職人",
        "itemId": 52,
        "amount": 1
      }
    ],
    "prerequisites": [
      216
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "1-3",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 3
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "1-4",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 3
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "1-5",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 3
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "1-6",
          "boss": true,
          "groups": [
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 3
            }
          ],
          "result": "クリア"
        }
      ]
    }
  },
  {
    "id": 856,
    "wikiId": "B99",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「第一戦隊」、抜錨せよ！",
    "detail": "新編「第一戦隊」出撃任務：戦艦「長門改二」を旗艦、二番艦に「陸奥改」を配備した第一艦隊で出撃！<br>カレー洋リランカ島沖、サーモン海域北方に展開し、同海域の敵艦隊主力を捕捉、これを撃滅せよ！",
    "materialRewards": [
      0,
      880,
      880,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      },
      {
        "kind": "equipment",
        "name": "艦本新設計 増設バルジ(大型艦)",
        "masterId": 204,
        "amount": 1
      }
    ],
    "prerequisites": [
      180,
      855
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "4-5",
        "5-5"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "長門改二",
          "flagship": true
        },
        {
          "ship": "陸奥改",
          "place": 2
        }
      ]
    }
  },
  {
    "id": 857,
    "wikiId": "B100",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "増強海上護衛総隊、抜錨せよ！",
    "detail": "出撃任務：軽巡1隻以上、駆逐艦または海防艦2隻以上、さらに航空巡洋艦または軽空母で増強した<br>第一護衛艦隊を第一艦隊に編成、南西諸島海域の各海域に展開、敵艦隊を撃破、各作戦を成功させよ！",
    "materialRewards": [
      700,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 3
      }
    ],
    "prerequisites": [
      228,
      855
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "2-2",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "軽巡",
              "amount": 1
            },
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 2
            },
            {
              "ship": [
                "航巡",
                "軽母"
              ],
              "amount": 1
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-3",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "軽巡",
              "amount": 1
            },
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 2
            },
            {
              "ship": [
                "航巡",
                "軽母"
              ],
              "amount": 1
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-4",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "軽巡",
              "amount": 1
            },
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 2
            },
            {
              "ship": [
                "航巡",
                "軽母"
              ],
              "amount": 1
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-5",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "軽巡",
              "amount": 1
            },
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": 2
            },
            {
              "ship": [
                "航巡",
                "軽母"
              ],
              "amount": 1
            }
          ]
        }
      ]
    }
  },
  {
    "id": 858,
    "wikiId": "B101",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「第七戦隊」、出撃せよ！",
    "detail": "出撃任務：新編「第七戦隊」を出撃！　カレー洋リランカ島沖「深海東洋艦隊漸減作戦」、<br>MS諸島沖「MS諸島防衛戦」において、敵艦隊主力を捕捉、これを撃滅せよ！",
    "materialRewards": [
      0,
      0,
      1000,
      500
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "零式艦戦63型(爆戦)",
            "masterId": 219,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      }
    ],
    "prerequisites": [
      181,
      303
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "4-5",
            "6-2"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "熊野改二",
              "flagship": true
            },
            {
              "ship": "鈴谷改二",
              "place": 2
            },
            {
              "ship": "最上改"
            },
            {
              "ship": "三隈改"
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 859,
    "wikiId": "B102",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「第四航空戦隊」、抜錨せよ！",
    "detail": "精鋭「第四航空戦隊」出撃任務：精鋭航空戦艦を主戦力に再編された「第四航空戦隊」、抜錨せよ！<br>沖ノ島沖戦闘哨戒及び北方AL海域戦闘哨戒を実施、同方面の敵艦隊主力を捕捉、これを撃破せよ！",
    "materialRewards": [
      500,
      0,
      500,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          }
        ]
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      }
    ],
    "prerequisites": [
      182
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "2-5",
        "3-5"
      ],
      "boss": true,
      "result": "A",
      "groups": [
        {
          "ship": [
            "伊勢改",
            "日向改"
          ],
          "flagship": true,
          "lv": [
            50,
            999
          ]
        },
        {
          "ship": [
            "伊勢改",
            "日向改"
          ],
          "place": 2,
          "lv": [
            50,
            999
          ]
        },
        {
          "ship": "軽巡",
          "amount": 1
        },
        {
          "ship": "駆逐",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 860,
    "wikiId": "B103",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "旗艦「由良」、抜錨！",
    "detail": "出撃任務：旗艦に「由良改二」、随伴艦に二駆「村雨」「夕立」「春雨」「五月雨」及び「秋月」から<br>二隻以上を配備した第一艦隊を展開、東部オリョール海及び南方海域前面の敵戦力を撃滅せよ！",
    "materialRewards": [
      400,
      400,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          }
        ]
      },
      {
        "kind": "useitem",
        "name": "熟練搭乗員",
        "itemId": 70,
        "amount": 1
      }
    ],
    "prerequisites": [
      183
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "2-3",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "由良改二",
              "flagship": true
            },
            {
              "ship": [
                "村雨",
                "夕立",
                "春雨",
                "五月雨",
                "秋月"
              ],
              "select": 2
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "5-1",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "由良改二",
              "flagship": true
            },
            {
              "ship": [
                "村雨",
                "夕立",
                "春雨",
                "五月雨",
                "秋月"
              ],
              "select": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 861,
    "wikiId": "Bq03",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "強行輸送艦隊、抜錨！",
    "detail": "航路護衛任務：航空戦艦(または補給艦でも可)2隻を中核とした艦隊で、鎮守府近海航路における<br>輸送船団護衛作戦を実施。同輸送護衛作戦を2回成功させよ！",
    "materialRewards": [
      1000,
      400,
      400,
      0
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "高速修復材",
        "material": "repairKit",
        "amount": 4
      },
      {
        "kind": "useitem",
        "name": "洋上補給",
        "itemId": 67,
        "amount": 1
      }
    ],
    "prerequisites": [
      217
    ],
    "requirements": {
      "category": "sortie",
      "times": 2,
      "map": "1-6",
      "groups": [
        {
          "ship": [
            "航空戦艦",
            "補給艦"
          ],
          "amount": 2
        }
      ],
      "result": "クリア"
    }
  },
  {
    "id": 862,
    "wikiId": "Bq04",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "前線の航空偵察を実施せよ！",
    "detail": "偵察任務：水上機母艦1隻と軽巡2隻を中核とした偵察艦隊を、中部海域グアノ環礁沖海域に展開、<br>航空偵察作戦「K作戦」を反復実施せよ！さらに同方面の敵艦隊を捕捉、敵戦力の撃破に努めよ！",
    "materialRewards": [
      0,
      800,
      0,
      1000
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 8
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      }
    ],
    "prerequisites": [
      846,
      861
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 2,
          "map": "6-3",
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "水上機母艦",
              "amount": 1
            },
            {
              "ship": "軽巡洋艦",
              "amount": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 863,
    "wikiId": "B104",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「第二二駆逐隊」出撃せよ！",
    "detail": "出撃任務：再編した精鋭「第二二駆逐隊」を含む精強な水雷戦隊で北方海域キス島沖に出撃、<br>キス島撤退作戦を完全成功させよ！",
    "materialRewards": [
      0,
      700,
      0,
      100
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 2
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      184,
      303
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "3-2",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "文月改二"
            },
            {
              "ship": "皐月改二"
            },
            {
              "ship": "水無月改"
            },
            {
              "ship": "長月改"
            }
          ]
        }
      ]
    }
  },
  {
    "id": 864,
    "wikiId": "B105",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精強大型航空母艦、抜錨！",
    "detail": "出撃任務：「Saratoga Mk.II」または同「Mod.2」を旗艦とした「任務部隊」で、南方海域サーモン海域<br>北方及び中部海域MS諸島沖に展開、同海域敵戦力を捕捉撃滅、「MS諸島防衛戦」を成功させよ！",
    "materialRewards": [
      0,
      0,
      700,
      700
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "F6F-3",
            "masterId": 205,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "TBF",
            "masterId": 256,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "夜間作戦航空要員",
            "masterId": 258,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      185,
      216
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "5-5",
        "6-2"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "Saratoga Mk.II",
            "Saratoga Mk.II Mod.2"
          ],
          "flagship": true
        },
        {
          "ship": "軽巡洋艦",
          "amount": 1
        },
        {
          "ship": "駆逐艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 865,
    "wikiId": "B106",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "夜間作戦空母、前線に出撃せよ！",
    "detail": "出撃任務：「Saratoga Mk.II」を旗艦とした第一艦隊を KW環礁沖海域に展開、敵機動部隊を迎撃！<br>「空母機動部隊迎撃戦」を見事成功させよ！　夜戦作戦空母、抜錨！　前線に出撃せよ！",
    "materialRewards": [
      0,
      0,
      0,
      1000
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "TBF",
            "masterId": 256,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "夜間作戦航空要員+熟練甲板員",
            "masterId": 259,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "補強増設",
            "itemId": 64,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      846,
      864
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": "6-5",
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "Saratoga Mk.II",
          "flagship": true
        }
      ]
    }
  },
  {
    "id": 869,
    "wikiId": "B107",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "補給線の安全を確保せよ！",
    "detail": "軽巡クラスの艦隊旗艦と2隻以上の駆逐艦または海防艦を中核とした警戒艦隊を編成、同艦隊で<br>鎮守府海域(製油所地帯沿岸/南西諸島防衛線/鎮守府近海)の警戒と補給線安全確保にあたれ！",
    "materialRewards": [
      300,
      300,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "洋上補給",
        "itemId": 67,
        "amount": 1
      },
      {
        "kind": "useitem",
        "name": "給糧艦「伊良湖」",
        "itemId": 59,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-3",
        "1-4",
        "1-5"
      ],
      "boss": true,
      "result": "A",
      "groups": [
        {
          "ship": "軽巡",
          "flagship": true
        },
        {
          "ship": [
            "駆逐",
            "海防艦"
          ],
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 870,
    "wikiId": "B108",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「第八駆逐隊」、南西へ！",
    "detail": "第八駆逐隊任務：「第八駆逐隊」を含む艦隊で、鎮守府海域南西諸島沖、及び南西諸島海域バシー島沖に<br>展開！同海域に跳梁する敵艦隊戦力を捕捉、これを撃滅せよ！",
    "materialRewards": [
      0,
      250,
      250,
      250
    ],
    "rewards": [
      {
        "kind": "material",
        "name": "開発資材",
        "material": "devmat",
        "amount": 3
      },
      {
        "kind": "useitem",
        "name": "給糧艦「間宮」",
        "itemId": 54,
        "amount": 1
      }
    ],
    "prerequisites": [
      839
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "1-2",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "朝潮"
            },
            {
              "ship": "満潮"
            },
            {
              "ship": "大潮"
            },
            {
              "ship": "荒潮"
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "2-2",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "朝潮"
            },
            {
              "ship": "満潮"
            },
            {
              "ship": "大潮"
            },
            {
              "ship": "荒潮"
            }
          ]
        }
      ]
    }
  },
  {
    "id": 871,
    "wikiId": "B109",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "最精鋭「第八駆逐隊」、全力出撃！",
    "detail": "第八駆逐隊任務：最精鋭「第八駆逐隊」を中核戦力とした艦隊を編成、北方海域キス島沖、及び<br>南方海域サーモン海域に突入！同海域の敵艦隊を撃滅、第八駆逐隊による完全勝利を刻め！",
    "materialRewards": [
      800,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "12.7cm連装砲C型改二",
            "masterId": 266,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "22号対水上電探",
            "masterId": 28,
            "amount": 2
          }
        ]
      },
      {
        "kind": "material",
        "name": "改修資材",
        "material": "screw",
        "amount": 4
      }
    ],
    "prerequisites": [
      186,
      429
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": "3-2",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "朝潮改二",
                "朝潮改二丁"
              ]
            },
            {
              "ship": "満潮改二"
            },
            {
              "ship": "大潮改二"
            },
            {
              "ship": "荒潮改二"
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "5-4",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "朝潮改二",
                "朝潮改二丁"
              ]
            },
            {
              "ship": "満潮改二"
            },
            {
              "ship": "大潮改二"
            },
            {
              "ship": "荒潮改二"
            }
          ]
        }
      ]
    }
  },
  {
    "id": 872,
    "wikiId": "Bq10",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "戦果拡張任務！「Z作戦」後段作戦",
    "detail": "戦果拡張作戦：我が第一艦隊に精鋭艦艇を集中配備、同精鋭艦隊を以て、南西海域タウイタウイ泊地沖、南方海域サーモン海域北方、中部海域MS諸島沖及びKW環礁沖海域の敵艦隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      0,
      0,
      2000,
      2000
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          },
          {
            "kind": "useitem",
            "name": "給糧艦「伊良湖」",
            "itemId": 59,
            "amount": 3
          },
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 4
          }
        ]
      },
      {
        "kind": "special",
        "name": "戦果400",
        "amount": 1
      }
    ],
    "prerequisites": [
      854
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "7-2-P2",
        "5-5",
        "6-2",
        "6-5"
      ],
      "boss": true,
      "result": "S"
    }
  },
  {
    "id": 873,
    "wikiId": "Bq05",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "北方海域警備を実施せよ！",
    "detail": "北方海域警備任務：北方海域の警備を実施する。軽巡を1隻以上含む艦隊で、北方海域モーレイ海、<br>キス島沖、アルフォンシーノ方面に艦隊を展開、北方海域方面の警備と制海権確保に努めよ！",
    "materialRewards": [
      500,
      500,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "special",
            "name": "12.7cm連装砲C型改二★+3",
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      },
      {
        "kind": "useitem",
        "name": "戦闘糧食",
        "itemId": 66,
        "amount": 1
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "3-1",
        "3-2",
        "3-3"
      ],
      "boss": true,
      "result": "A",
      "groups": [
        {
          "ship": "軽巡洋艦",
          "amount": 1
        },
        {
          "ship": "艦",
          "amount": 5
        }
      ]
    }
  },
  {
    "id": 874,
    "wikiId": "B110",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "北方海域戦闘哨戒を実施せよ！",
    "detail": "北方海域戦闘哨戒任務：北方AL海域に軽空母と水上機母艦及び軽巡を基幹戦力とした精鋭艦隊を投入。<br>北方戦闘哨戒を反復実施、同方面の敵増援部隊主力を捕捉、これを撃滅し、北方海域戦線を防衛せよ！",
    "materialRewards": [
      0,
      1000,
      0,
      700
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "紫電改二",
            "masterId": 55,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          }
        ]
      },
      {
        "kind": "useitem",
        "name": "プレゼント箱",
        "itemId": 60,
        "amount": 1
      }
    ],
    "prerequisites": [
      873
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 2,
          "map": "3-5",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "軽空母",
              "amount": 1
            },
            {
              "ship": "水上機母艦",
              "amount": 1
            },
            {
              "ship": "軽巡",
              "amount": 1
            }
          ]
        }
      ]
    }
  },
  {
    "id": 875,
    "wikiId": "Bq06",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "精鋭「三一駆」、鉄底海域に突入せよ！",
    "detail": "強行東京急行任務：精鋭「三一駆」第一小隊を護衛戦力とした突入艦隊を編成、南方サーモン海域に投入。<br>鉄底海峡に突入し、同海域に展開する敵艦艇を実力で排除、強行鼠輸送作戦を反復完遂せよ！",
    "materialRewards": [
      310,
      310,
      0,
      310
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "13号対空電探",
            "masterId": 27,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "22号対水上電探",
            "masterId": 28,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "プレゼント箱",
            "itemId": 60,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      188,
      873
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 2,
          "map": "5-4",
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "長波改二"
            },
            {
              "ship": [
                "高波改",
                "沖波改",
                "朝霜改"
              ],
              "select": 1
            }
          ]
        }
      ]
    }
  },
  {
    "id": 876,
    "wikiId": "B111",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "松輸送作戦、開始せよ！",
    "detail": "防衛ラインの強化のため、艦隊旗艦「龍田改二」または「龍田改」、3隻以上の駆逐艦または海防艦を<br>含む輸送護衛艦隊を編成、南西諸島防衛線及び鎮守府近海航路における作戦を複数回成功させよ！",
    "materialRewards": [
      200,
      200,
      200,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      255,
      673
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "map": "1-4",
          "times": 2,
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": [
                "龍田改",
                "龍田改二"
              ],
              "flagship": true
            },
            {
              "ship": [
                "駆逐艦",
                "海防艦"
              ],
              "amount": 3
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ]
        },
        {
          "category": "sortie",
          "map": "1-6",
          "times": 2,
          "groups": [
            {
              "ship": [
                "龍田改",
                "龍田改二"
              ],
              "flagship": true
            },
            {
              "ship": [
                "駆逐艦",
                "海防艦"
              ],
              "amount": 3
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ],
          "result": "クリア"
        }
      ]
    }
  },
  {
    "id": 877,
    "wikiId": "B112",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「四水戦」、南方海域に展開せよ！",
    "detail": "「村雨改二」旗艦含む精鋭四水戦(4Sd)より4隻(他主力艦2隻)計6隻の精鋭艦隊を南方海域に展開。<br>南方海域前面、サブ島沖海域、サーモン海域に突入、同南方海域方面の敵艦隊を撃破せよ！",
    "materialRewards": [
      400,
      400,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "12.7cm連装砲C型改二",
            "masterId": 266,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "22号対水上電探",
            "masterId": 28,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "12.7cm連装砲B型改二",
            "masterId": 63,
            "amount": 2
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "ドラム缶(輸送用)",
            "masterId": 75,
            "amount": 3
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          }
        ]
      }
    ],
    "prerequisites": [
      189
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "map": [
            "5-1",
            "5-3",
            "5-4"
          ],
          "times": 1,
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "村雨改二",
              "flagship": true
            },
            {
              "ship": [
                "由良改二",
                "夕立改二",
                "春雨改",
                "五月雨改",
                "秋月改"
              ],
              "select": 3
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 878,
    "wikiId": "B113",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "松輸送作戦、継続実施せよ！",
    "detail": "「艦隊旗艦に軽巡級または駆逐艦、さらに3隻以上の駆逐艦または海防艦を含む輸送護衛艦隊を編成、<br>防衛ラインの強化のため、南西諸島防衛線及び鎮守府近海航路における作戦を継続的に成功させよ！",
    "materialRewards": [
      300,
      300,
      0,
      300
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 3
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "12cm30連装噴進砲",
            "masterId": 51,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      876
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "map": "1-4",
          "times": 3,
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "軽巡",
                "駆逐"
              ],
              "flagship": true
            },
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": [
                3,
                99
              ]
            }
          ]
        },
        {
          "category": "sortie",
          "map": "1-6",
          "times": 3,
          "groups": [
            {
              "ship": [
                "軽巡",
                "駆逐"
              ],
              "flagship": true
            },
            {
              "ship": [
                "駆逐",
                "海防艦"
              ],
              "amount": [
                3,
                99
              ]
            }
          ],
          "result": "クリア"
        }
      ]
    }
  },
  {
    "id": 879,
    "wikiId": "B114",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「四航戦」、全力出撃！",
    "detail": "「航空戦艦「伊勢改」「日向改」及び軽巡「大淀改」と1隻以上の駆逐艦を含む新編第四航空戦隊を編成、<br>鎮守府近海航路、沖ノ島沖及び北方AL海域戦闘哨戒、カレー洋リランカ島沖の作戦に投入せよ！",
    "materialRewards": [
      400,
      400,
      400,
      400
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "12cm30連装噴進砲改二",
        "masterId": 274,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      165,
      247
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "map": "1-6",
          "times": 1,
          "groups": [
            {
              "ship": "伊勢改"
            },
            {
              "ship": "日向改"
            },
            {
              "ship": "大淀改"
            },
            {
              "ship": "駆逐",
              "amount": [
                1,
                99
              ]
            }
          ],
          "result": "クリア"
        },
        {
          "category": "sortie",
          "map": [
            "2-5",
            "3-5",
            "4-5"
          ],
          "times": 1,
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "伊勢改"
            },
            {
              "ship": "日向改"
            },
            {
              "ship": "大淀改"
            },
            {
              "ship": "駆逐",
              "amount": [
                1,
                99
              ]
            }
          ]
        }
      ]
    }
  },
  {
    "id": 880,
    "wikiId": "B115",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭駆逐隊、獅子奮迅！",
    "detail": "十分な装備と練度を誇る駆逐艦4隻からなる精鋭駆逐隊を含む艦隊を編成。鎮守府近海航路、東部オリョール海、北方キス島沖、西方カレー洋に投入、各戦線の作戦展開を成功させよ！",
    "materialRewards": [
      480,
      480,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      320,
      680
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "map": "1-6",
          "times": 1,
          "groups": [
            {
              "ship": "駆逐",
              "amount": 4
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ],
          "result": "クリア"
        },
        {
          "category": "sortie",
          "map": [
            "2-3",
            "3-2",
            "4-2"
          ],
          "times": 1,
          "boss": true,
          "result": "A",
          "groups": [
            {
              "ship": "駆逐",
              "amount": 4
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 881,
    "wikiId": "B116",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「十八駆」、北方海域キス島へ！",
    "detail": "精鋭「第十八駆逐隊」を投入し、北方海域キス島撤退作戦を実施する！同作戦に反復出動し、キス島撤退作戦を完全成功させよ！",
    "materialRewards": [
      0,
      0,
      480,
      480
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "10cm連装高角砲改+増設機銃",
            "masterId": 275,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 5
          }
        ]
      }
    ],
    "prerequisites": [
      192,
      230
    ],
    "requirements": {
      "category": "sortie",
      "times": 2,
      "map": [
        "3-2"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "霰改二",
          "amount": 1
        },
        {
          "ship": [
            "霞改二",
            "霞改二乙"
          ],
          "amount": 1
        },
        {
          "ship": "陽炎改",
          "amount": 1
        },
        {
          "ship": "不知火改",
          "amount": 1
        }
      ]
    }
  },
  {
    "id": 884,
    "wikiId": "B117",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "最精鋭甲型駆逐艦、突入！敵中突破！",
    "detail": "「黒潮改二」「不知火改二」「陽炎改二」のいずれかを旗艦、他2隻の練度75以上の甲型駆逐艦を配備した計6隻艦隊で西方カレー洋、北方キス島沖、南方サブ島沖海域に複数回突入、各作戦を完全成功させよ！",
    "materialRewards": [
      0,
      1000,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 2
          },
          {
            "kind": "special",
            "name": "試製甲板カタパルト",
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "12.7cm連装砲D型改二",
            "masterId": 267,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      323,
      880
    ],
    "requirements": {
      "category": "sortie",
      "times": 2,
      "map": [
        "3-2",
        "4-2",
        "5-3"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "陽炎改二",
            "不知火改二",
            "黒潮改二"
          ],
          "flagship": true
        },
        {
          "shipclass": [
            "陽炎",
            "夕雲"
          ],
          "amount": 2,
          "lv": [
            75,
            999
          ]
        }
      ]
    }
  },
  {
    "id": 885,
    "wikiId": "B118",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "戦闘航空母艦、出撃せよ！",
    "detail": "改装航空戦艦（戦闘航空母艦）一番艦、旗艦「伊勢改二」を中核とした航空火力打撃部隊を編成、北方AL海域戦闘哨戒、カレー洋リランカ島沖及びピーコック島沖の作戦に投入、敵を撃滅せよ！",
    "materialRewards": [
      1000,
      0,
      634,
      634
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "瑞雲(六三四空)",
            "masterId": 79,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "彗星二二型(六三四空)",
            "masterId": 291,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      324
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "3-5",
        "4-5",
        "6-4"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "伊勢改二",
          "flagship": true
        }
      ]
    }
  },
  {
    "id": 886,
    "wikiId": "B119",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「伊勢改二」、敵機動部隊を迎撃せよ！",
    "detail": "旗艦「伊勢改二」随伴駆逐艦2隻の航空戦隊を基幹とする艦隊をKW環礁沖空母機動部隊迎撃戦に投入！同反復出撃によって、同方面に来襲する敵機動部隊を迎撃、完全撃滅せよ！　「伊勢改二」、抜錨！",
    "materialRewards": [
      634,
      0,
      1000,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "九六式艦戦",
            "masterId": 19,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "九九式艦爆",
            "masterId": 23,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "零式艦戦21型",
            "masterId": 20,
            "amount": 2
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "紫電改二",
            "masterId": 55,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      324
    ],
    "requirements": {
      "category": "sortie",
      "times": 3,
      "map": "6-5",
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "伊勢改二",
          "flagship": true
        },
        {
          "ship": "駆逐艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 887,
    "wikiId": "B120",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「第十八戦隊」、展開せよ！",
    "detail": "精鋭「第十八戦隊」随伴駆逐艦2隻を含む艦隊を、鎮守府海域に展開。同南西諸島沖海域、南西諸島防衛線、鎮守府近海、鎮守府近海航路の各作戦を完全成功させよ！改装軽巡「天龍」「龍田」、出撃！",
    "materialRewards": [
      0,
      1000,
      0,
      800
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 5
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "22号対水上電探",
            "masterId": 28,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          }
        ]
      }
    ],
    "prerequisites": [
      194
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "1-2",
            "1-4",
            "1-5"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "天龍"
            },
            {
              "ship": "龍田"
            },
            {
              "ship": "駆逐艦",
              "amount": 2
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "1-6",
          "result": "クリア",
          "groups": [
            {
              "ship": "天龍"
            },
            {
              "ship": "龍田"
            },
            {
              "ship": "駆逐艦",
              "amount": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": 888,
    "wikiId": "Bq07",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "新編成「三川艦隊」、鉄底海峡に突入せよ！",
    "detail": "鉄底海峡戦果拡張：「鳥海」「青葉」「衣笠」「加古」「古鷹」「天龍」「夕張」の中から4隻を含む突入艦隊を編成。南方海域前面及びサブ島沖海域、サーモン海域に突入、敵艦隊を撃滅せよ！",
    "materialRewards": [
      800,
      800,
      800,
      800
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "戦果200",
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 5
          }
        ]
      }
    ],
    "prerequisites": [
      243,
      273
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "5-1",
        "5-3",
        "5-4"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "鳥海",
            "青葉",
            "衣笠",
            "加古",
            "古鷹",
            "天龍",
            "夕張"
          ],
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 889,
    "wikiId": "B121",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「二七駆」第一小隊、出撃せよ！",
    "detail": "「白露改二」及び「時雨改二」から成る精鋭駆逐隊「二七駆」第一小隊を含む有力な艦隊を編成、東部オリョール海、ジャム島攻略作戦、サーモン海域北方、KW環礁沖海域に出撃、敵を撃滅せよ！",
    "materialRewards": [
      1000,
      0,
      1000,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "12.7cm連装砲B型改四(戦時改修)+高射装置",
        "masterId": 296,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 8
          }
        ]
      }
    ],
    "prerequisites": [
      880
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "2-3",
        "4-1",
        "5-5",
        "6-5"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "白露改二"
        },
        {
          "ship": "時雨改二"
        }
      ]
    }
  },
  {
    "id": 890,
    "wikiId": "B122",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「四戦隊」第二小隊、抜錨せよ！",
    "detail": "「摩耶改二」及び「鳥海改二」から成る精鋭「第四戦隊」第二小隊を含む有力な艦隊を編成、南西諸島防衛線、東部オリョール海、アルフォンシーノ方面、カレー洋リランカ島沖に出撃、敵を撃滅せよ！",
    "materialRewards": [
      400,
      400,
      0,
      400
    ],
    "rewards": [
      {
        "kind": "furniture",
        "name": "「摩耶の盾」掛け軸",
        "furnitureId": 393,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "12.7cm連装高角砲(後期型)",
            "masterId": 91,
            "amount": 2
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 8
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      223,
      303
    ],
    "requirements": {
      "category": "sortie",
      "map": [
        "1-4",
        "2-3",
        "3-3",
        "4-5"
      ],
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "鳥海改二"
        },
        {
          "ship": "摩耶改二"
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 891,
    "wikiId": "B123",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精強「十七駆」、北へ、南へ！",
    "detail": "改装甲型駆逐艦「磯風乙改」「浜風乙改」「浦風丁改」「谷風丁改」4隻の精強「十七駆」を含む艦隊で鎮守府近海、キス島沖、ブルネイ泊地沖、南方海域前面に出撃、敵戦力と交戦、これを撃破せよ！",
    "materialRewards": [
      1000,
      1000,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "三式水中探信儀",
            "masterId": 47,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "12.7cm単装高角砲(後期型)",
            "masterId": 229,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "12.7cm連装砲C型改二",
            "masterId": 266,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "61cm四連装(酸素)魚雷後期型",
            "masterId": 286,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      195
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-5",
        "3-2",
        "7-1",
        "5-1"
      ],
      "boss": true,
      "result": "A",
      "groups": [
        {
          "ship": "磯風乙改"
        },
        {
          "ship": "浜風乙改"
        },
        {
          "ship": "浦風丁改"
        },
        {
          "ship": "谷風丁改"
        }
      ]
    }
  },
  {
    "id": 892,
    "wikiId": "B126",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "主力オブ主力、抜錨開始！",
    "detail": "甲型駆逐艦編成任務：夕雲型駆逐艦「夕雲改二」及び「巻雲改二」の2隻から成る精鋭第十駆逐隊を含む有力な艦隊を南方海域に投入、サブ島沖海域、サーモン海域、サーモン海域北方の敵を捕捉撃滅せよ！",
    "materialRewards": [
      500,
      500,
      500,
      1000
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          }
        ]
      }
    ],
    "prerequisites": [
      196,
      201
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "5-3",
        "5-4",
        "5-5"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "夕雲改二"
        },
        {
          "ship": "巻雲改二"
        },
        {
          "ship": "艦",
          "amount": 4
        }
      ]
    }
  },
  {
    "id": 893,
    "wikiId": "Bq08",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "泊地周辺海域の安全確保を徹底せよ！",
    "detail": "泊地近海警戒戦果拡張：有力な泊地哨戒部隊を編成、鎮守府近海、ブルネイ泊地沖、タウイタウイ泊地沖に反復出撃！各周辺海域に出没する敵船を制圧、さらに泊地周辺の脅威となる敵戦力を捕捉撃滅せよ！",
    "materialRewards": [
      2000,
      500,
      0,
      500
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "戦果300",
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "熟練見張員",
            "masterId": 129,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 4
          }
        ]
      }
    ],
    "prerequisites": [
      214,
      299
    ],
    "requirements": {
      "category": "sortie",
      "times": 3,
      "map": [
        "1-5",
        "7-1",
        "7-2-P1",
        "7-2-P2"
      ],
      "boss": true,
      "result": "S"
    }
  },
  {
    "id": 894,
    "wikiId": "Bq09",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "空母戦力の投入による兵站線戦闘哨戒",
    "detail": "空母を含む有力な哨戒艦隊を編成、製油所地帯沿岸、南西諸島防衛戦、南西諸島近海、バシー海峡及び東部オリョール海を戦闘哨戒、各海域の敵艦隊を捕捉撃滅、各海域兵站線の安全を確保せよ！",
    "materialRewards": [
      600,
      0,
      600,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 4
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "彩雲",
            "masterId": 54,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "熟練搭乗員",
            "itemId": 70,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "プレゼント箱",
            "itemId": 60,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-3",
        "1-4",
        "2-1",
        "2-2",
        "2-3"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "軽空母",
            "正規空母",
            "装甲空母"
          ]
        },
        {
          "ship": "艦",
          "amount": 5
        }
      ]
    }
  },
  {
    "id": 895,
    "wikiId": "B127",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "冬季北方海域作戦",
    "detail": "冬季北方作戦：軽巡級を旗艦とする有力な艦隊で、モーレイ海、アルフォンシーノ方面、北方海域全域及び北方AL海域に反復出撃！同海域に遊弋する敵艦隊を捕捉、これを撃滅し、北方海域制海権を確保せよ！",
    "materialRewards": [
      0,
      800,
      0,
      800
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "零式艦戦21型",
            "masterId": 20,
            "amount": 3
          },
          {
            "kind": "equipment",
            "name": "零式艦戦32型",
            "masterId": 181,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          },
          {
            "kind": "equipment",
            "name": "22号対水上電探",
            "masterId": 28,
            "amount": 3
          },
          {
            "kind": "useitem",
            "name": "新型航空兵装資材",
            "itemId": 77,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      894
    ],
    "requirements": {
      "category": "sortie",
      "times": 2,
      "map": [
        "3-1",
        "3-3",
        "3-4",
        "3-5"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": [
            "軽巡洋艦",
            "重雷装巡洋艦",
            "練習巡洋艦"
          ],
          "flagship": true
        },
        {
          "ship": "艦",
          "amount": 5
        }
      ]
    }
  },
  {
    "id": 896,
    "wikiId": "B131",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "航空戦艦戦隊、戦闘哨戒！",
    "detail": "航空戦艦二隻を中核とする艦隊を編成、同艦隊で南西諸島防衛線、鎮守府近海及び東部オリョール海、タウイタウイ泊地沖に展開。同海域の脅威となる敵艦隊主力を捕捉、これを撃滅せよ！",
    "materialRewards": [
      600,
      600,
      0,
      600
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 2
          }
        ]
      },
      {
        "kind": "useitem",
        "name": "勲章",
        "itemId": 57,
        "amount": 1
      }
    ],
    "prerequisites": [
      112,
      606
    ],
    "requirements": {
      "category": "sortie",
      "times": 1,
      "map": [
        "1-4",
        "1-5",
        "2-3",
        "7-2-P2"
      ],
      "boss": true,
      "result": "S",
      "groups": [
        {
          "ship": "航空戦艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 897,
    "wikiId": "B132",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "最精鋭「第四航空戦隊」、出撃せよ！",
    "detail": "｢日向改二」「伊勢改二」の最精鋭「四航戦」を含む第一艦隊で、鎮守府近海航路に反復出撃、さらに、カレー洋リランカ島沖、サーモン海域北方、KW環礁沖海域の敵艦隊を捕捉撃滅せよ！",
    "materialRewards": [
      1000,
      1000,
      1000,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "S-51J",
            "masterId": 326,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 2
          }
        ]
      },
      {
        "kind": "equipment",
        "name": "瑞雲改二(六三四空)",
        "masterId": 322,
        "amount": 1
      }
    ],
    "prerequisites": [
      694,
      896
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 2,
          "map": "1-6",
          "result": "クリア",
          "groups": [
            {
              "ship": "日向改二"
            },
            {
              "ship": "伊勢改二"
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "4-5",
            "5-5",
            "6-5"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "日向改二"
            },
            {
              "ship": "伊勢改二"
            }
          ]
        }
      ]
    }
  },
  {
    "id": 901,
    "wikiId": "B140",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「夕張改二」試してみてもいいかしら？",
    "detail": "改装兵装実験軽巡「夕張改二」型を旗艦にした艦隊で、南西諸島沖ノ島沖、北方アルフォンシーノ方面、南方サブ島沖海域、中部グアノ環礁沖海域に展開！同戦域の敵艦隊主力を捜索、これを捕捉撃滅せよ！",
    "materialRewards": [
      0,
      3000,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "equipment",
        "name": "14cm連装砲改",
        "masterId": 310,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "二式爆雷",
            "masterId": 227,
            "amount": 2
          },
          {
            "kind": "equipment",
            "name": "大発動艇",
            "masterId": 68,
            "amount": 2
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      605,
      219
    ],
    "requirements": {
      "category": "sortie",
      "map": [
        "2-5",
        "3-3",
        "5-3",
        "6-3"
      ],
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": [
            "夕張改二",
            "夕張改二特",
            "夕張改二丁"
          ],
          "flagship": true
        },
        {
          "ship": "艦",
          "amount": 5
        }
      ]
    }
  },
  {
    "id": 902,
    "wikiId": "B141",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "新編「六水戦」出撃！後で感想、聞かせてね！",
    "detail": "改装軽巡「夕張改二」型旗艦を含む第六水雷戦隊４隻以上を擁する艦隊で、鎮守府近海、鎮守府近海航路、さらに南西諸島バシー海峡、北方キス島沖、南西ブルネイ泊地沖の各作戦を、それぞれ完全成功させよ！",
    "materialRewards": [
      3000,
      0,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "useitem",
        "name": "補強増設",
        "itemId": 64,
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 12
          },
          {
            "kind": "equipment",
            "name": "甲標的 丁型改(蛟龍改)",
            "masterId": 364,
            "amount": 1
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 6
          }
        ]
      }
    ],
    "prerequisites": [
      901
    ],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "1-5",
            "2-2",
            "3-2",
            "7-1"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "夕張改二",
                "夕張改二特",
                "夕張改二丁"
              ],
              "flagship": true
            },
            {
              "ship": [
                "睦月",
                "如月",
                "弥生",
                "卯月",
                "菊月",
                "望月"
              ],
              "select": 3
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": "1-6",
          "boss": true,
          "groups": [
            {
              "ship": [
                "夕張改二",
                "夕張改二特",
                "夕張改二丁"
              ],
              "flagship": true
            },
            {
              "ship": [
                "睦月",
                "如月",
                "弥生",
                "卯月",
                "菊月",
                "望月"
              ],
              "select": 3
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ],
          "result": "クリア"
        }
      ]
    }
  },
  {
    "id": 903,
    "wikiId": "Bq13",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "拡張「六水戦」、最前線へ！",
    "detail": "軽巡「夕張改二」型の旗艦に随伴第六水雷戦隊駆逐艦２隻以上または「由良改二」を含む艦隊で、南方海域前面、南方サーモン海域、中部北海域ピーコック島沖、中部KW環礁沖海域に展開、敵戦力を撃滅せよ！",
    "materialRewards": [
      1000,
      1000,
      1000,
      0
    ],
    "rewards": [
      {
        "kind": "special",
        "name": "戦果390",
        "amount": 1
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 10
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [
      902
    ],
    "requirements": {
      "category": "or",
      "list": [
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "5-1",
            "5-4",
            "6-4",
            "6-5"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "夕張改二",
                "夕張改二特",
                "夕張改二丁"
              ],
              "flagship": true
            },
            {
              "ship": [
                "睦月",
                "如月",
                "弥生",
                "卯月",
                "菊月",
                "望月"
              ],
              "select": 2
            },
            {
              "ship": "艦",
              "amount": 3
            }
          ]
        },
        {
          "category": "sortie",
          "times": 1,
          "map": [
            "5-1",
            "5-4",
            "6-4",
            "6-5"
          ],
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": [
                "夕張改二",
                "夕張改二特",
                "夕張改二丁"
              ],
              "flagship": true
            },
            {
              "ship": "由良改二"
            },
            {
              "ship": "艦",
              "amount": 4
            }
          ]
        }
      ]
    }
  },
  {
    "id": 904,
    "wikiId": "By1",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "精鋭「十九駆」、躍り出る！",
    "detail": "改装特II型駆逐艦「綾波改二」及び同「敷波改二」を含む精鋭艦隊を前線に投入、南西諸島海域沖ノ島沖、<br>北方海域全域、西方海域カレー洋リランカ島沖、南方サブ島沖海域に展開、各敵主力を捕捉撃滅せよ！",
    "materialRewards": [
      1900,
      0,
      1900,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "給糧艦「間宮」",
            "itemId": 54,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "家具箱（中）",
            "itemId": 11,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 8
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 10
          },
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "map": [
        "2-5",
        "3-4",
        "4-5",
        "5-3"
      ],
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "綾波改二"
        },
        {
          "ship": "敷波改二"
        }
      ]
    }
  },
  {
    "id": 905,
    "wikiId": "By2",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「海防艦」、海を護る！",
    "detail": "海防艦3隻を含む5隻以下の海上護衛隊を、鎮守府海域に展開。鎮守府正面海域、南西諸島沖海域、製油所<br>地帯沿岸、鎮守府近海、鎮守府近海航路の各海域の安全確保と対潜掃蕩を図れ！海防艦戦隊、抜錨せよ！",
    "materialRewards": [
      1200,
      600,
      600,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 6
          },
          {
            "kind": "material",
            "name": "開発資材",
            "material": "devmat",
            "amount": 8
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "勲章",
            "itemId": 57,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "二式爆雷",
            "masterId": 227,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "特注家具職人",
            "itemId": 52,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "and",
      "list": [
        {
          "category": "sortie",
          "map": "1-6",
          "times": 1,
          "groups": [
            {
              "ship": "海防艦",
              "amount": 3
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ],
          "result": "クリア",
          "disallowed": "他の艦"
        },
        {
          "category": "sortie",
          "map": [
            "1-1",
            "1-2",
            "1-3",
            "1-5"
          ],
          "times": 1,
          "boss": true,
          "result": "S",
          "groups": [
            {
              "ship": "海防艦",
              "amount": 3
            },
            {
              "ship": "艦",
              "amount": 2
            }
          ],
          "disallowed": "他の艦"
        }
      ]
    }
  },
  {
    "id": 911,
    "wikiId": "B142",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "再編「第三一駆逐隊」、抜錨せよ！",
    "detail": "夕雲型駆逐艦「長波」「岸波」「朝霜」、そして「沖波改二」からなる再編第三一駆逐隊を含む艦隊を、製油所地帯沿岸、南西諸島防衛線、鎮守府近海、バシー海峡、東部オリョール海に展開、敵を撃破せよ！",
    "materialRewards": [
      880,
      880,
      880,
      500
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "洋上補給",
            "itemId": 67,
            "amount": 3
          },
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 6
          },
          {
            "kind": "equipment",
            "name": "戦闘糧食(特別なおにぎり)",
            "masterId": 241,
            "amount": 2
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "special",
            "name": "沖に立つ波",
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型噴進装備開発資材",
            "itemId": 92,
            "amount": 1
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "map": [
        "1-3",
        "1-4",
        "1-5",
        "2-2",
        "2-3"
      ],
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "沖波改二"
        },
        {
          "ship": "長波"
        },
        {
          "ship": "岸波"
        },
        {
          "ship": "朝霜"
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 914,
    "wikiId": "By4",
    "category": 2,
    "type": 7,
    "period": "quarterly",
    "title": "重巡戦隊、西へ！",
    "detail": "重巡(航空巡洋艦含まず)3隻以上、駆逐艦1隻以上を中核とした艦隊を編成。同艦隊を西方に展開。西方海域ジャム島沖、カレー洋海域、リランカ島、カスガダマ島の敵戦力と交戦、これを撃破せよ！",
    "materialRewards": [
      0,
      800,
      800,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "高速修復材",
            "material": "repairKit",
            "amount": 5
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 1
          },
          {
            "kind": "equipment",
            "name": "増設バルジ(中型艦)",
            "masterId": 72,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "material",
            "name": "改修資材",
            "material": "screw",
            "amount": 4
          },
          {
            "kind": "equipment",
            "name": "20.3cm(2号)連装砲",
            "masterId": 90,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [],
    "requirements": {
      "category": "sortie",
      "map": [
        "4-1",
        "4-2",
        "4-3",
        "4-4"
      ],
      "boss": true,
      "result": "A",
      "times": 1,
      "groups": [
        {
          "ship": "重巡",
          "amount": 3
        },
        {
          "ship": "駆逐",
          "amount": 1
        },
        {
          "ship": "艦",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": 916,
    "wikiId": "B144",
    "category": 2,
    "type": 1,
    "period": "once",
    "title": "「比叡改二丙」見参！第三戦隊、南方突入！",
    "detail": "「比叡改二丙」含む金剛型高速戦艦2隻以上、軽巡級1隻、駆逐艦1隻以上を含む艦隊を南方海域に投入！南方海域前面、珊瑚諸島沖、サブ島沖海域、サーモン海域、同北方の敵艦隊を捕捉、これを撃滅せよ！",
    "materialRewards": [
      1942,
      2020,
      0,
      0
    ],
    "rewards": [
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "special",
            "name": "艦本新設計 増設バルジ(大型艦)★+2",
            "amount": 1
          },
          {
            "kind": "special",
            "name": "零式水上偵察機11型乙★+2",
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "戦闘詳報",
            "itemId": 78,
            "amount": 1
          }
        ]
      },
      {
        "kind": "choice",
        "choices": [
          {
            "kind": "equipment",
            "name": "35.6cm連装砲改二",
            "masterId": 329,
            "amount": 1
          },
          {
            "kind": "useitem",
            "name": "新型砲熕兵装資材",
            "itemId": 75,
            "amount": 2
          }
        ]
      }
    ],
    "prerequisites": [
      292
    ],
    "requirements": {
      "category": "sortie",
      "map": [
        "5-1",
        "5-2",
        "5-3",
        "5-4",
        "5-5"
      ],
      "boss": true,
      "result": "S",
      "times": 1,
      "groups": [
        {
          "ship": "比叡改二丙"
        },
        {
          "ship": [
            "金剛",
            "榛名",
            "霧島"
          ],
          "select": 1
        },
        {
          "ship": "軽巡",
          "amount": 1
        },
        {
          "ship": "駆逐",
          "amount": [
            1,
            99
          ]
        }
      ]
    }
  }
] as const satisfies readonly QuestDefinition[];
