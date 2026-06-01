import { LOCAL_WORLD_ID } from "../state/store.js";

export function renderLauncher() {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=1200, initial-scale=1">
    <title>Kancolle Local Launcher</title>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #05070a;
        color: #d8dadf;
        font-family: system-ui, sans-serif;
      }
      main {
        display: grid;
        min-height: 100%;
        place-items: center;
      }
      p {
        margin: 0;
        font-size: 15px;
      }
      #status {
        opacity: 0.8;
      }
    </style>
  </head>
  <body>
    <main>
      <p id="status">Kancolle Local Launcher</p>
    </main>
    <script>
      const VIEWER_ID = "local-viewer";
      const WORLD_ID = ${LOCAL_WORLD_ID};
      const status = document.getElementById("status");

      boot().catch((error) => {
        status.textContent = error && error.message ? error.message : String(error);
      });

      async function boot() {
        status.textContent = "Checking local account...";
        const world = await getApi("/kcsapi/api_world/get_id/" + encodeURIComponent(VIEWER_ID) + "/1/" + Date.now());
        const worldId = Number(world.api_data && world.api_data.api_world_id || 0);
        if (worldId < 1) {
          window.location.href = "/kcs2/world.html?viewer_id=" + encodeURIComponent(VIEWER_ID);
          return;
        }

        status.textContent = "Logging in...";
        const login = await getApi("/kcsapi/api_auth_member/dmmlogin/" + encodeURIComponent(VIEWER_ID) + "/1/" + Date.now());
        if (login.api_result !== 1 || !login.api_token) {
          throw new Error(login.api_result_msg || "Local login failed.");
        }

        const query = "api_root=/kcsapi&voice_root=/kcs/sound&"
          + "osapi_root=osapi.dmm.com&"
          + "version=6.2.3.1&"
          + "api_token=" + encodeURIComponent(login.api_token) + "&"
          + "api_starttime=" + encodeURIComponent(String(login.api_starttime || Date.now()));
        window.location.href = "/kcs2/index.php?" + query;
      }

      async function getApi(url) {
        const response = await fetch(url, { cache: "no-store" });
        return parseApiResponse(await response.text());
      }

      function parseApiResponse(text) {
        const body = text.startsWith("svdata=") ? text.slice("svdata=".length) : text;
        return JSON.parse(body);
      }
    </script>
  </body>
</html>`;
}

export function renderWorldPage(query: Record<string, unknown>) {
  const viewerId = String(query.viewer_id || "local-viewer").replace(/</g, "");
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=1200, initial-scale=1">
    <title>Kancolle Local World</title>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #10151b;
        color: #eef2f5;
        font-family: system-ui, sans-serif;
      }
      main {
        display: grid;
        min-height: 720px;
        place-items: center;
      }
      section {
        display: grid;
        gap: 18px;
        justify-items: center;
      }
      button {
        width: 220px;
        height: 54px;
        border: 1px solid #76899a;
        background: #243241;
        color: #fff;
        font: inherit;
        cursor: pointer;
      }
      button:disabled {
        cursor: wait;
        opacity: 0.7;
      }
      img {
        width: 103px;
        height: 27px;
        image-rendering: auto;
      }
      p {
        margin: 0;
        min-height: 22px;
        font-size: 14px;
        color: #aeb9c4;
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <img src="/kcs2/resources/world/15p_ver_com_t.png" alt="幌筵泊地">
        <button id="register" type="button">幌筵泊地</button>
        <p id="status"></p>
      </section>
    </main>
    <script>
      const viewerId = ${JSON.stringify(viewerId)};
      const button = document.getElementById("register");
      const status = document.getElementById("status");

      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = "Registering...";
        try {
          const response = await fetch("/kcsapi/api_world/register/" + encodeURIComponent(viewerId) + "/${LOCAL_WORLD_ID}/" + Date.now(), {
            method: "POST",
            cache: "no-store"
          });
          const data = parseApiResponse(await response.text());
          if (data.api_result !== 1) throw new Error(data.api_result_msg || "Registration failed.");
          if (window.parent && window.parent !== window) {
            window.parent.postMessage("r", "*");
          } else {
            window.location.href = "/";
          }
        } catch (error) {
          status.textContent = error && error.message ? error.message : String(error);
          button.disabled = false;
        }
      });

      function parseApiResponse(text) {
        const body = text.startsWith("svdata=") ? text.slice("svdata=".length) : text;
        return JSON.parse(body);
      }
    </script>
  </body>
</html>`;
}
