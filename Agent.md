# Agent Guide: Finding Protocol Clues in the Obfuscated Client

This project uses the cached Kancolle browser client under `cache/`, especially
`cache/kcs2/js/main.js`, to infer API names, request parameters, response shapes,
and master-data expectations for the local server in `src/`.

Use this guide before spending a large context window on the client again.

## Ground Rules

- Do not edit cached client assets unless the user explicitly asks for a client patch.
- Treat `main.js` as evidence, not as something to fully understand. Find the narrow code path around the API or field you need.
- Prefer server compatibility fixes in `src/` over monkey-patching obfuscated client logic.
- Validate every inferred payload shape with a focused server test or a live local API request.
- Avoid printing large chunks of `main.js`; it is usually one minified line and will waste tokens.

## Fast Recon Workflow

1. Start with clear anchors.
   - API path: `api_get_member/picture_book`
   - master key: `api_mst_ship`
   - response field: `api_table_id`
   - UI label text, if present in clear text

2. Search cheaply first:

   ```sh
   rg -n "api_get_member/picture_book|api_table_id|api_mst_ship" cache/kcs2/js/main.js
   rg -n "picture_book|api_no|api_type" cache/kcs2/js/main.js
   ```

3. If plain search fails, inspect the obfuscation string table instead of reading the whole file.
   In this cache, `main.js` contains a string array and a decoder function similar to `_0x1369`
   and `_0x2e70`. Extract/evaluate only the string table, rotator, and decoder in a throwaway
   Node script. Do not execute the whole client bundle.

4. Once a decoded string is found, locate its encoded reference in `main.js`, then slice a small
   window around that offset:

   ```sh
   node - <<'NODE'
   const fs = require("fs");
   const js = fs.readFileSync("cache/kcs2/js/main.js", "utf8");
   const needle = "api_get_member/picture_book";
   const at = js.indexOf(needle);
   console.log({ at });
   console.log(js.slice(Math.max(0, at - 3000), at + 3000));
   NODE
   ```

   If the literal is not present, use the decoded string id/reference you found from the string
   table and slice around that encoded token.

## Safe String-Table Decoding Pattern

When strings are hidden behind `_0x...(...)` calls:

1. Identify:
   - the string array function
   - the decoder function
   - any array-rotation loop that runs before decoding

2. Copy only those parts into a temporary Node snippet. Keep the snippet read-only.

3. Decode candidate ids and search decoded strings:

   ```js
   // Pseudocode. Use the actual function names from this cache.
   const strings = stringArrayFunction();
   runRotationIfNeeded(strings);
   const decode = makeDecoder(strings);

   for (let i = 0; i < 0x3000; i++) {
     const value = safeDecode(i);
     if (String(value).includes("picture_book")) {
       console.log(i.toString(16), value);
     }
   }
   ```

4. Keep a short local note of useful decoded ids while investigating. The most useful finds from
   the picture-book investigation were:
   - endpoint: `api_get_member/picture_book`
   - list field: `api_list`
   - index field: `api_index_no`
   - grouped master ids: `api_table_id`
   - request fields: `api_type`, `api_no`

## Tracing an API Client Class

After locating an endpoint string, inspect the nearby class/module for these methods:

- URL assignment, often a `_url` field.
- Connect/request method, commonly where `_post_data` is filled.
- Completion method, commonly where `_raw_data` is parsed.
- Model-manager call, which reveals how returned data is stored.

For `api_get_member/picture_book`, the client behavior inferred from nearby code was:

- Request URL is `api_get_member/picture_book`.
- Before connecting, it posts:
  - `api_type = mode`
  - `api_no = no + 1`
- On completion, it reads `api_list`.
- If mode is `1`, it stores ship album entries.
- Otherwise, it stores equipment album entries.

## Tracing Model Fields

Model classes reveal response shape better than UI code. Search nearby decoded field names and
getter methods.

For album entries, the important base fields are:

- `api_index_no`: the display/index number used as the model key.
- `api_table_id`: array of master ids shown under the same album entry.

Ship album entries read:

- `api_stype`
- `api_sinfo`
- `api_houg`
- `api_raig`
- `api_tyku`
- `api_kaih`
- `api_taik`
- `api_state`
- `api_q_voice_info`

Equipment album entries read:

- `api_type`
- `api_souk`
- `api_houg`
- `api_raig`
- `api_baku`
- `api_tyku`
- `api_tais`
- `api_houm`
- `api_houk`
- `api_saku`
- `api_leng`
- `api_info`

## Interpreting Pagination

Do not assume `api_no` is a page number. Confirm from the client call site and UI labels.

For the album client, `api_no` is a 1-based start index:

- client internal `no = 0` sends `api_no = 1`
- client internal `no = 10` sends `api_no = 11`
- the server should return up to 10 entries starting at that index
- returned entries must use matching `api_index_no` values

This distinction matters: treating `api_no=11` as page 11 would skip to item 101 and leave
client-side album slots empty or mismatched.

## Mapping Client Expectations to Server Code

Once you know the client fields:

1. Find the matching server handler in `src/kcsapi/handlers.ts`.
2. Check whether `api_start2/getData` contains the master ids the client will reference.
3. If the client returns master ids through an API like `api_table_id`, make sure those ids exist
   in the relevant master arrays.
4. Add tests that lock the client-derived behavior:
   - request shape
   - response field names
   - pagination semantics
   - master-data availability

For the album work, the important server invariant is:

- every id returned in `api_get_member/picture_book.api_list[].api_table_id` must exist in
  `api_start2/getData` master data (`api_mst_ship` or `api_mst_slotitem`).

## Resource Cache Recon

Use cache resources to infer what the local server can truthfully expose:

```sh
find cache/kcs2/resources/ship -maxdepth 1 -type d | sort
find cache/kcs2/resources/slot -maxdepth 1 -type d | sort
find cache/kcs2/resources/ship/album_status -maxdepth 1 -type f | sed -n '1,20p'
find cache/kcs2/resources/slot/card -maxdepth 1 -type f | sed -n '1,20p'
```

Useful album-related resource families:

- ships: `ship/album_status`, `ship/card`, `ship/banner`, `ship/full`
- equipment: `slot/card`, `slot/card_t`, `slot/item_on`, `slot/item_up`

Prefer canonical album lists from resources that are specific to album display:

- ships: `ship/album_status`
- equipment: `slot/card`

Use `cached.json` when present because it includes version/cache metadata. Fall back to walking the
filesystem only when the cache index is unavailable.

## Verification Checklist

After adapting server code to a client inference:

```sh
npm test
npm run typecheck
```

For a live endpoint smoke test, run the server with JSON responses on a temporary port:

```sh
PORT=3021 KANCOLLE_RESPONSE_FORMAT=json npm start
```

Then query the inferred API:

```sh
curl -s -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data 'api_type=1&api_no=1' \
  http://127.0.0.1:3021/kcsapi/api_get_member/picture_book
```

Check that:

- `api_list` is non-empty when the UI expects non-empty content.
- item count matches the client page size.
- returned indices match the client keying logic.
- returned master ids exist in `api_start2/getData`.

## Common Mistakes

- Reading too much of `main.js` instead of anchoring on one endpoint or field.
- Executing the whole obfuscated bundle in Node. Only decode the string table.
- Assuming names are page numbers when the client uses start offsets.
- Returning plausible API entries without also extending master data.
- Forgetting that the client may use arrays like `api_table_id` and `api_state` positionally.
- Fixing an empty UI by hardcoding one page instead of matching the client manager's storage keys.
