export function renderBootstrap(query: Record<string, unknown>) {
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(query).map(([key, value]) => [key, value == null ? "" : String(value)]))
  ).toString();
  const escapedQuery = escapeHtml(queryString);
  const readableQuery = escapeHtml(Object.entries(query).map(([key, value]) => `${key}=${value == null ? "" : String(value)}`).join("&"));
  const paramsJson = JSON.stringify(Object.fromEntries(new URLSearchParams(queryString))).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=1200, initial-scale=1">
    <title>Kancolle Local Offline</title>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #05070a;
        position: relative;
      }
      #game_frame {
        position: absolute;
        left: 0;
        top: 0;
        width: 1200px;
        height: 720px;
        overflow: hidden;
        background: transparent;
        pointer-events: none;
      }
      canvas {
        display: block;
      }
      #r_editarea {
        display: none;
        position: absolute;
        left: 0;
        top: 0;
        z-index: 10;
      }
      #r_editbox {
        box-sizing: border-box;
        display: block;
        width: 100%;
        height: 1em;
        margin: 0;
        padding: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: #000;
        line-height: 1;
        appearance: none;
        -webkit-appearance: none;
      }
    </style>
  </head>
  <body>
    <div id="game_frame" data-query="${escapedQuery}" data-query-readable="${readableQuery}"></div>
    <div id="r_editarea"><input id="r_editbox" type="text" autocomplete="off" spellcheck="false"></div>
    <script>
      window.__KANCOLLE_LOCAL__ = {
        query: ${paramsJson},
        apiRoot: new URLSearchParams(window.location.search).get("api_root") || "/kcsapi",
        voiceRoot: new URLSearchParams(window.location.search).get("voice_root") || "/kcs/sound"
      };
    </script>
    <script>
${renderLocalOsapiBridgeScript()}
    </script>
    <script src="/local-vendor/pixi.min.js"></script>
    <script src="/local-vendor/createjs.min.js"></script>
    <script src="/local-vendor/axios.min.js"></script>
    <script src="/local-vendor/howler.min.js"></script>
    <script src="/kcs2/js/main.js"></script>
    <script>
      if (window.KCS && typeof window.KCS.init === "function") {
        window.KCS.init();
      }
    </script>
  </body>
</html>`;
}

function renderLocalOsapiBridgeScript() {
  return `      (function installLocalOsapiBridge() {
        if (window.__KANCOLLE_LOCAL_OSAPI_BRIDGE__) return;
        window.__KANCOLLE_LOCAL_OSAPI_BRIDGE__ = true;

        var local = window.__KANCOLLE_LOCAL__ || {};
        var query = local.query || {};
        var osapiRoot = query.osapi_root || new URLSearchParams(window.location.search).get("osapi_root") || "osapi.dmm.com";
        if (!osapiRoot) return;

        var osapiOrigin;
        try {
          osapiOrigin = String(osapiRoot).indexOf("://") >= 0
            ? new URL(String(osapiRoot), window.location.href).origin
            : "https://" + String(osapiRoot).replace(/\\/+$/, "");
        } catch (_error) {
          osapiOrigin = "https://osapi.dmm.com";
        }

        var bridgeTarget = window.parent || window;
        var originalPostMessage = bridgeTarget.postMessage;
        var inspectionTypes = { "1": true, "2": true, "3": true, "4": true };
        var checkoutUrl = String(local.apiRoot || "/kcsapi").replace(/\\/+$/, "") + "/api_dmm_payment/paycheck";

        bridgeTarget.postMessage = function localPostMessage(message, targetOrigin) {
          if (targetOrigin === osapiOrigin) {
            var purchase = parsePurchaseMessage(message);
            if (purchase) {
              submitLocalPurchase(purchase);
              return;
            }

            var inspection = parseInspectionMessage(message);
            if (inspection) {
              var inspectionTextId = inspection.type === "2" && !/\\S/.test(inspection.text)
                ? ""
                : localInspectionTextId(inspection.type, inspection.text);
              dispatchOsapiMessage(inspectionTextId);
              return;
            }
          }

          return originalPostMessage.apply(bridgeTarget, arguments);
        };

        function parseInspectionMessage(message) {
          if (typeof message !== "string") return null;
          var tabIndex = message.indexOf("\\t");
          if (tabIndex < 0) return null;
          var type = message.slice(0, tabIndex);
          if (!inspectionTypes[type]) return null;
          return { type: type, text: message.slice(tabIndex + 1) };
        }

        function parsePurchaseMessage(message) {
          if (typeof message !== "string") return null;
          var parts = message.split("\\t");
          if (parts.length < 6 || parts[0] !== "0") return null;

          var id = parsePositiveInteger(parts[1]);
          var price = parseNonNegativeInteger(parts[2]);
          var count = parsePositiveInteger(parts[3]);
          if (!id || price == null || !count) return null;

          return { id: id, price: price, count: count };
        }

        function parsePositiveInteger(value) {
          var parsed = Number(value);
          if (!Number.isFinite(parsed)) return 0;
          parsed = Math.trunc(parsed);
          return parsed > 0 ? parsed : 0;
        }

        function parseNonNegativeInteger(value) {
          var parsed = Number(value);
          if (!Number.isFinite(parsed)) return null;
          parsed = Math.trunc(parsed);
          return parsed >= 0 ? parsed : null;
        }

        function submitLocalPurchase(purchase) {
          if (typeof fetch !== "function") {
            dispatchOsapiMessage("-1");
            return;
          }

          var body = new URLSearchParams();
          body.set("api_local_purchase", "1");
          body.set("api_payitem_id", String(purchase.id));
          body.set("api_price", String(purchase.price));
          body.set("api_count", String(purchase.count));

          fetch(checkoutUrl, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: body.toString()
          })
            .then(function parseResponse(response) {
              return response && response.ok && typeof response.text === "function" ? response.text() : null;
            })
            .then(function parsePayload(text) {
              return parseApiResponsePayload(text);
            })
            .then(function dispatchCheckoutResult(payload) {
              var ok = payload && payload.api_result === 1
                && payload.api_data
                && payload.api_data.api_check_value === 2;
              dispatchOsapiMessage(ok ? "2" : "-1");
            })
            .catch(function dispatchCheckoutFailure() {
              dispatchOsapiMessage("-1");
            });
        }

        function parseApiResponsePayload(text) {
          if (typeof text !== "string") return null;
          var body = text.trim();
          if (body.indexOf("svdata=") === 0) {
            body = body.slice("svdata=".length);
          }
          try {
            return JSON.parse(body);
          } catch (_error) {
            return null;
          }
        }

        function dispatchOsapiMessage(data) {
          setTimeout(function dispatchLocalOsapiMessage() {
            window.dispatchEvent(new MessageEvent("message", {
              data: data,
              origin: osapiOrigin,
              source: bridgeTarget
            }));
          }, 0);
        }

        function localInspectionTextId(type, text) {
          var value = type + "\\t" + text;
          var hash = 0;
          for (var index = 0; index < value.length; index += 1) {
            hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
          }
          return "local-inspection-" + type + "-" + hash.toString(36);
        }
      }());`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
