import type { FastifyInstance, FastifyReply } from "fastify";
import { apiError, apiOk } from "../kcsapi/envelope.js";
import type { ResourceManifest } from "../resources/types.js";
import type { StateStore } from "../state/store.js";
import {
  handleListShipMasters,
  handleListSlotItemMasters,
  handleListPlayerShips,
  handleListPlayerSlotItems,
  handleListPlayerUseItems,
  handleListPlayerMaterials,
  handleListUseItemMasters,
  handleAddShip,
  handleRemoveShip,
  handleSetShipLevel,
  handleAddSlotItem,
  handleRemoveSlotItem,
  handleSetBasicMaterials,
  handleSetUseItemCount,
  handleConfigureExpeditions,
  handleExpeditionStatus,
  handleForceCompleteExpedition,
  handleResetExpeditions,
  handleUnlockAllExpeditions,
  handleEventActivation,
  handleEventReset,
  handleEventStatus,
} from "./handlers.js";
import { renderDebugPanel } from "./panel.js";

export function registerDebugRoutes(
  app: FastifyInstance,
  stateStore: StateStore,
  resourceManifest: ResourceManifest,
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

  // ---- Player use items ----
  app.get("/debug/api/player/useitems", async (_request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiOk({ commonItems: [], items: [] }));
      }
      const result = handleListPlayerUseItems(stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Player materials ----
  app.get("/debug/api/player/materials", async (_request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiOk({ fuel: 0, ammo: 0, steel: 0, bauxite: 0 }));
      }
      const result = handleListPlayerMaterials(stateStore);
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

  // ---- Set ship level ----
  app.post("/debug/api/ships/level", async (request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiError("No account registered. Register via the launcher first.", 400));
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = handleSetShipLevel(body, stateStore);
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

  // ---- Use item master list ----
  app.get("/debug/api/useitems/masters", async (request, reply) => {
    try {
      const query = (request.query ?? {}) as Record<string, string>;
      const result = handleListUseItemMasters(query, stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Set use item count ----
  app.post("/debug/api/useitems/set", async (request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiError("No account registered. Register via the launcher first.", 400));
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = handleSetUseItemCount(body, stateStore);
      return sendApi(reply, result);
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  // ---- Set basic materials ----
  app.post("/debug/api/materials/set", async (request, reply) => {
    try {
      if (!stateStore.hasAccount()) {
        return sendApi(reply, apiError("No account registered. Register via the launcher first.", 400));
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const result = handleSetBasicMaterials(body, stateStore);
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

  app.get("/debug/api/expeditions/status", async (_request, reply) => {
    try {
      if (!stateStore.hasAccount()) return sendApi(reply, apiError("No account registered.", 400));
      return sendApi(reply, handleExpeditionStatus(stateStore));
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  app.post("/debug/api/expeditions/unlock-all", async (request, reply) => {
    try {
      return sendApi(
        reply,
        handleUnlockAllExpeditions((request.body ?? {}) as Record<string, unknown>, stateStore)
      );
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  app.post("/debug/api/expeditions/configure", async (request, reply) => {
    try {
      return sendApi(
        reply,
        handleConfigureExpeditions((request.body ?? {}) as Record<string, unknown>, stateStore)
      );
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  app.post("/debug/api/expeditions/force-complete", async (request, reply) => {
    try {
      return sendApi(
        reply,
        handleForceCompleteExpedition((request.body ?? {}) as Record<string, unknown>, stateStore)
      );
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  app.get("/debug/api/events/status", async (_request, reply) => {
    try {
      return sendApi(reply, handleEventStatus(stateStore, resourceManifest));
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  app.post("/debug/api/events/active", async (request, reply) => {
    try {
      return sendApi(
        reply,
        handleEventActivation((request.body ?? {}) as Record<string, unknown>, stateStore, resourceManifest)
      );
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  app.post("/debug/api/events/reset", async (request, reply) => {
    try {
      return sendApi(
        reply,
        handleEventReset((request.body ?? {}) as Record<string, unknown>, stateStore)
      );
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });

  app.post("/debug/api/expeditions/reset", async (_request, reply) => {
    try {
      return sendApi(reply, handleResetExpeditions(stateStore));
    } catch (err) {
      return sendApi(reply, apiError(err instanceof Error ? err.message : "Internal error", 500));
    }
  });
}
