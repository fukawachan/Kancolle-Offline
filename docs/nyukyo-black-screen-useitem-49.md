# 入渠黑屏：缺失 use item 主数据的定位与修复记录

> Scope: local learning and offline experimentation only. Do not redistribute cached client assets, art, music, voice files, or extracted game data.

## 现象

进入入渠 UI 后画面黑屏，浏览器控制台出现类似错误：

```text
Uncaught TypeError: Cannot read properties of null (reading 'count')
    at ... [as updateNDocks] (main.js:1:4040497)
    at ... [as _onCompleteLoad] (main.js:1:4107651)
```

这个错误看起来像是 `api_get_member/ndock` 的 dock 数据缺字段，但本次根因不是 dock 数组结构，而是客户端入渠界面读取了一个缺失的 use item 模型。

## 核心结论

客户端的 `RepairScene.updateNDocks` 会读取：

```text
model.useItem.get(RepairConst.OPEN_KEY_ITEMID).count
```

当前缓存版本中：

```text
RepairConst.OPEN_KEY_ITEMID = 0x31 = 49
```

如果服务端没有在主数据和持有数据里提供 `api_id: 49`，客户端的 `model.useItem.get(49)` 会返回 `null`，随后读取 `.count` 就会触发黑屏。

最小兼容修复：

- `api_start2/getData.api_mst_useitem` 包含 `api_id: 49` 的主数据。
- `api_get_member/require_info.api_useitem` 包含 `{ api_id: 49, api_count: 0 }`。
- `api_get_member/useitem` 包含 `{ api_id: 49, api_count: 0 }`。

本地离线服初期不实现真实购买或消耗 dock key 时，数量固定为 `0` 即可。这样 UI 可以隐藏或禁用扩张入口，但不会因为模型缺失而崩溃。

## 快速排障流程

### 1. 先确认第一条 JavaScript 异常

不要只看静态资源 404。入渠黑屏时，应优先记录控制台第一条 runtime error，尤其是：

- 函数名：例如 `updateNDocks`
- bundle 位置：例如 `main.js:1:4040497`
- 读取字段：例如 `reading 'count'`

`main.js` 是一行混淆代码，行号通常只有 `1`，列号才是关键定位信息。

### 2. 按列号切片，而不是阅读整个 bundle

```bash
node - <<'NODE'
const fs = require("fs");
const js = fs.readFileSync("cache/kcs2/js/main.js", "utf8");
const at = 4040497;
console.log(js.slice(Math.max(0, at - 1500), at + 1500));
NODE
```

如果切出来仍然都是 `_0x...` 调用，继续按 `Agent.md` 的方法只提取字符串表、旋转逻辑和 decoder。不要执行整个客户端 bundle。

### 3. 解码附近的字符串和常量

本次关键发现是：

```text
RepairConst.OPEN_KEY_ITEMID = 0x31
```

`0x31` 转十进制是：

```bash
node -e 'console.log(0x31)'
```

输出：

```text
49
```

之后继续在切片附近确认读取路径，最终定位为：

```text
model.useItem.get(RepairConst.OPEN_KEY_ITEMID).count
```

这说明服务端必须保证 use item 模型里存在 id 49。

## 服务端检查点

### 主数据

检查 `src/master/data.ts` 中的 `api_mst_useitem`。需要有：

```ts
{
  api_id: 49,
  api_usetype: 2,
  api_category: 1,
  api_name: "ドック開放キー",
  api_description: ["入渠ドックを開放するためのアイテムです。"],
}
```

`api_name` 和 `api_description` 不要留空。客户端 UI 或模型初始化可能会读取这些字段。

### 持有数据

检查 `src/kcsapi/serializers.ts` 中生成 use item 持有数据的逻辑。需要返回：

```ts
{ api_id: 49, api_count: 0 }
```

这个数据至少要覆盖两个入口：

- `api_get_member/require_info.api_useitem`
- `api_get_member/useitem.api_data`

如果以后实现真实 dock 扩张，再把 `api_count` 改成从存档读取，并在 `api_req_nyukyo/open_new_dock` 中消耗。

### 不要优先改 ndock

这类问题容易误判为 dock 数据本身不完整。判断标准：

- 如果异常是 `dock.xxx` 缺字段，再检查 `api_get_member/ndock`。
- 如果异常是 `useItem.get(...).count`，优先检查 use item 主数据和持有数据。

本次 `api_get_member/ndock` 的 dock 数组结构保持不变。

## 回归测试建议

在 `tests/api.test.ts` 中锁住三个不变量：

```ts
expect(useitemById.get(49)).toMatchObject({
  api_id: 49,
  api_name: "ドック開放キー",
  api_description: [expect.any(String)],
});
```

```ts
expect(requireInfo.json().api_data.api_useitem).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ api_id: 49, api_count: 0 }),
  ]),
);
```

```ts
expect(useitem.json().api_data).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ api_id: 49, api_count: 0 }),
  ]),
);
```

验证命令：

```bash
npm test
npm run typecheck
```

## 类似问题的通用判断

当某个 UI 进入后黑屏，并且错误形态类似：

```text
Cannot read properties of null (reading 'xxx')
```

优先按这个顺序排查：

1. 用列号切 `cache/kcs2/js/main.js` 的小窗口。
2. 解码附近字符串，找到真实模型路径。
3. 判断 `null` 来自哪个模型管理器，例如 `useItem.get(id)`、`mstShip.get(id)`、`slotItem.get(id)`。
4. 确认对应 master 数据是否在 `api_start2/getData`。
5. 确认对应 member 数据是否在 `api_get_member/*` 或 `api_port/port` 聚合响应。
6. 加测试锁住 master 和 member 两侧数据。
7. 再做 live smoke，确认进入目标 UI 不再产生同一条异常。

这类崩溃通常不是“客户端随机坏了”，而是服务端返回了一个能通过前置流程、但缺少目标 UI 读取的模型项的响应。

