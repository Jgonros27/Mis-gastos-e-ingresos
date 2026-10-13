import { beforeEach, it, expect, vi } from "vitest";
import { emptyDocument } from "./model";
let store: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
  vi.stubGlobal("navigator", {
    storage: {},
    locks: { request: async (_key: string, f: () => Promise<void>) => f() },
  });
});
it("serializa escrituras y rechaza una pestaña antigua", async () => {
  const s = await import("./storage");
  const { doc } = await s.loadDocument();
  const first = { ...doc, revision: "first" },
    second = { ...doc, revision: "second" };
  await Promise.all([
    s.persist(first, doc.revision),
    s.persist(second, "first"),
  ]);
  expect(JSON.parse(store.get("brisa-document")!).revision).toBe("second");
  expect((await s.previousDocument())!.revision).toBe("first");
  await expect(
    s.persist({ ...doc, revision: "third" }, doc.revision),
  ).rejects.toThrow("Otra pestaña");
  expect(JSON.parse(store.get("brisa-document")!).revision).toBe("second");
});
it("recupera una copia válida si la principal está corrupta", async () => {
  const doc = emptyDocument();
  store.set("brisa-document", "{bad");
  store.set("brisa-previous", JSON.stringify(doc));
  const s = await import("./storage");
  expect((await s.loadDocument()).recovered).toBe(true);
});
it("un error de cuota conserva el documento principal", async () => {
  const s = await import("./storage");
  const doc = emptyDocument();
  await s.loadDocument();
  await s.persist(doc, doc.revision);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) || null,
    setItem: () => {
      throw new DOMException("Cuota agotada", "QuotaExceededError");
    },
  });
  await expect(
    s.persist({ ...doc, revision: "failed" }, doc.revision),
  ).rejects.toThrow("Cuota");
  expect(JSON.parse(store.get("brisa-document")!).revision).toBe(doc.revision);
});
it("OPFS: un fallo al cerrar no destruye la anterior y permite recuperar", async () => {
  let fail = false;
  vi.stubGlobal("navigator", {
    storage: {
      getDirectory: async () => ({
        getFileHandle: async (name: string) => ({
          getFile: async () => ({
            text: async () => {
              if (!store.has(name)) throw Error("No existe");
              return store.get(name)!;
            },
          }),
          createWritable: async () => {
            let staged = "";
            return {
              write: async (text: string) => {
                staged = text;
              },
              close: async () => {
                if (fail && name === "brisa-document")
                  throw Error("Error de escritura");
                store.set(name, staged);
              },
            };
          },
        }),
      }),
    },
  });
  const s = await import("./storage"),
    doc = emptyDocument();
  await s.loadDocument();
  await s.persist(doc, doc.revision);
  fail = true;
  await expect(
    s.persist({ ...doc, revision: "fail" }, doc.revision),
  ).rejects.toThrow("escritura");
  expect((await s.loadDocument()).doc.revision).toBe(doc.revision);
  expect((await s.previousDocument())!.revision).toBe(doc.revision);
});
