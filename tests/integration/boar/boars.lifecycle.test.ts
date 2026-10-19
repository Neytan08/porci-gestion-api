import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BOAR_ERROR_CODES as codes } from "../../../src/services/boars/boarErrors";
import { PREGNANCY_RESULTS } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createFarrowing } from "../../helpers/farrowings";
import { createMatingEvent } from "../../helpers/matingEvents";

const retirement = { removal_date: "2024-06-15", removal_reason: "  End of production  " };

describe("boar deletion and history", () => {
  it("deletes only the eligible target and returns an empty 204", async () => {
    const target = await createBoar();
    const survivor = await createBoar();
    const response = await api.delete(`/api/boars/${target.boar_id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.boars.findMany()).toEqual([survivor]);
    expect(await prisma.breed.findUnique({ where: { breed_id: target.breed_id } })).not.toBeNull();
  });
  it("blocks deletion when mating history exists", async () => {
      const boar = await createBoar();
      const event = await createMatingEvent({
        boarId: boar.boar_id,
        pregnancyResult: PREGNANCY_RESULTS.positivo,
      });
      expectApiError(
        await api.delete(`/api/boars/${boar.boar_id}`),
        409,
        codes.BOAR_HAS_MATING_EVENTS,
      );
      expect(await prisma.boars.findUnique({ where: { boar_id: boar.boar_id } })).toEqual(boar);
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
  });
  it("allows deletion after all eligible mating history is removed", async () => {
    const boar = await createBoar();
    const event = await createMatingEvent({ boarId: boar.boar_id });
    expect((await api.delete(`/api/matingevents/${event.mating_id}`)).status).toBe(204);
    expect((await api.delete(`/api/boars/${boar.boar_id}`)).status).toBe(204);
    expect(await prisma.boars.count()).toBe(0);
    expect(await prisma.matingevents.count()).toBe(0);
  });
  it("preserves the full farrowing history when boar deletion is rejected", async () => {
    const boar = await createBoar();
    const farrowing = await createFarrowing(boar.boar_id);
    expectApiError(
      await api.delete(`/api/boars/${boar.boar_id}`),
      409,
      codes.BOAR_HAS_MATING_EVENTS,
    );
    expect(
      await prisma.farrowings.findUnique({ where: { farrowing_id: farrowing.farrowing_id } }),
    ).toEqual(farrowing);
  });
});

describe("boar retirement", () => {
  it("accepts future birth and removal dates while preserving chronological order", async () => {
    const boar = await createBoar();
    expect(
      (await api.put(`/api/boars/${boar.boar_id}`).send({ birth_date: "2100-01-01" })).status,
    ).toBe(200);
    expect(
      (
        await api
          .patch("/api/boars/retire")
          .send({ ...retirement, boar_ids: boar.boar_id, removal_date: "2100-01-02" })
      ).status,
    ).toBe(200);
    expect(await prisma.boars.findUnique({ where: { boar_id: boar.boar_id } })).toMatchObject({
      birth_date: new Date("2100-01-01"),
      removal_date: new Date("2100-01-02"),
    });
  });
  it.each(["scalar", "batch"])(
    "retires a %s selection and counts unique targets",
    async (shape) => {
      const first = await createBoar();
      const second = await createBoar();
      const untouched = await createBoar();
      const ids =
        shape === "scalar"
          ? first.boar_id
          : shape === "batch"
            ? [first.boar_id, second.boar_id]
            : [first.boar_id, second.boar_id, first.boar_id];
      const response = await api.patch("/api/boars/retire").send({ boar_ids: ids, ...retirement });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: shape === "scalar" ? 1 : 2 });
      for (const target of shape === "scalar" ? [first] : [first, second]) {
        expect(await prisma.boars.findUnique({ where: { boar_id: target.boar_id } })).toEqual({
          ...target,
          removal_date: new Date(retirement.removal_date),
          removal_reason: retirement.removal_reason.trim(),
        });
      }
      expect(await prisma.boars.findUnique({ where: { boar_id: untouched.boar_id } })).toEqual(
        untouched,
      );
      if (shape === "scalar")
        expect(await prisma.boars.findUnique({ where: { boar_id: second.boar_id } })).toEqual(
          second,
        );
    },
  );
  it("permits retirement on the birth calendar day", async () => {
      const date = "2023-06-15T23:30:00-06:00";
      const boar = await createBoar();
      expect(
        (
          await api
            .patch("/api/boars/retire")
            .send({ boar_ids: boar.boar_id, ...retirement, removal_date: date })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.boars.findUniqueOrThrow({ where: { boar_id: boar.boar_id } })).removal_date,
      ).toEqual(boar.birth_date);
  });
  it.each(["missing", "retired", "before-birth"] as const)(
    "rejects an entire batch containing a %s target",
    async (scenario) => {
      const valid = await createBoar();
      const other = await createBoar(
        scenario === "retired"
          ? { removal_reason: "Already retired" }
          : scenario === "before-birth"
            ? { birth_date: new Date("2024-06-16") }
            : {},
      );
      if (scenario === "missing") await prisma.boars.delete({ where: { boar_id: other.boar_id } });
      const before = await prisma.boars.findMany({ orderBy: { boar_id: "asc" } });
      const response = await api
        .patch("/api/boars/retire")
        .send({ boar_ids: [valid.boar_id, other.boar_id], ...retirement });
      expectApiError(
        response,
        scenario === "missing" ? 404 : scenario === "retired" ? 409 : 400,
        scenario === "missing"
          ? codes.BOAR_NOT_FOUND
          : scenario === "retired"
            ? codes.BOAR_ALREADY_RETIRED
            : codes.BOAR_REMOVAL_DATE_BEFORE_BIRTH_DATE,
      );
      expect(await prisma.boars.findMany({ orderBy: { boar_id: "asc" } })).toEqual(before);
    },
  );
  it("blocks all changes to a retired boar", async () => {
    const boar = await createBoar({
      removal_date: new Date("2024-01-01"),
      removal_reason: "Retired",
    });
    for (const response of await Promise.all([
      api.put(`/api/boars/${boar.boar_id}`).send({ description: "changed" }),
      api.delete(`/api/boars/${boar.boar_id}`),
      api.patch("/api/boars/retire").send({ boar_ids: boar.boar_id, ...retirement }),
    ]))
      expectApiError(response, 409, codes.BOAR_ALREADY_RETIRED);
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });
  it("preserves mating results, farrowings, sow states, and readable history", async () => {
    const boar = await createBoar();
    await createMatingEvent({
      boarId: boar.boar_id,
      pregnancyResult: PREGNANCY_RESULTS.positivo,
    });
    await createFarrowing(boar.boar_id);
    const events = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const farrowings = await prisma.farrowings.findMany();
    expect(
      (await api.patch("/api/boars/retire").send({ boar_ids: boar.boar_id, ...retirement })).status,
    ).toBe(200);
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(events);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
    expect(await prisma.farrowings.findMany()).toEqual(farrowings);
    const history = await api.get(`/api/matingevents/boar/${boar.boar_id}`);
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(events.length);
    expect(history.body).toEqual(expect.arrayContaining(JSON.parse(JSON.stringify(events))));
    expect((await api.get(`/api/boars/${boar.boar_id}`)).status).toBe(200);
    expect((await api.get("/api/boars")).body).toEqual([]);
  });
});
