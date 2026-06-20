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
        height: 100%;
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

        bridgeTarget.postMessage = function localPostMessage(message, targetOrigin) {
          var inspection = parseInspectionMessage(message);
          if (targetOrigin === osapiOrigin && inspection) {
            var inspectionTextId = inspection.type === "2" && !/\\S/.test(inspection.text)
              ? ""
              : localInspectionTextId(inspection.type, inspection.text);
            setTimeout(function dispatchLocalInspectionMessage() {
              window.dispatchEvent(new MessageEvent("message", {
                data: inspectionTextId,
                origin: osapiOrigin,
                source: bridgeTarget
              }));
            }, 0);
            return;
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
