import type { FastifyInstance, FastifyReply } from "fastify";
import { apiError, apiOk } from "../kcsapi/envelope.js";
import type { StateStore } from "../state/store.js";
import {
  handleListShipMasters,
  handleListSlotItemMasters,
  handleListPlayerShips,
  handleListPlayerSlotItems,
  handleAddShip,
  handleRemoveShip,
  handleAddSlotItem,
  handleRemoveSlotItem,
} from "./handlers.js";
import { renderDebugPanel } from "./panel.js";

export function registerDebugRoutes(
  app: FastifyInstance,
  stateStore: StateStore,
  sendApi: (reply: FastifyReply, payload: unknown) => ReturnType<FastifyReply["send"]>
): void {
  // HTML debug panel page
  app.get("/debug", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderDebugPanel());
  });

  // ---- Ship master list ----
  app.get("/debug/api/ships/masters", async (request, reply) => {
    try {
      const query = (request.query ?? {}) as Record<string, string>;
      const result = handleListShipMasters(query);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Equipment master list ----
  app.get("/debug/api/equipment/masters", async (request, reply) => {
    try {
      const query = (request.query ?? {}) as Record<string, string>;
      const result = handleListSlotItemMasters(query);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Player ships ----
  app.get("/debug/api/player/ships", async (_request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiOk([]));
      }
      const result = handleListPlayerShips(stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Player equipment ----
  app.get("/debug/api/player/equipment", async (_request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiOk([]));
      }
      const result = handleListPlayerSlotItems(stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Add ship ----
  app.post("/debug/api/ships/add", async (request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiError("No account registered. Register via the launcher first.", 400));
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = handleAddShip(body, stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Remove ship ----
  app.post("/debug/api/ships/remove", async (request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiError("No account registered. Register via the launcher first.", 400));
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = handleRemoveShip(body, stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Add equipment ----
  app.post("/debug/api/equipment/add", async (request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiError("No account registered. Register via the launcher first.", 400));
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = handleAddSlotItem(body, stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Remove equipment ----
  app.post("/debug/api/equipment/remove", async (request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiError("No account registered. Register via the launcher first.", 400));
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = handleRemoveSlotItem(body, stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });
}
