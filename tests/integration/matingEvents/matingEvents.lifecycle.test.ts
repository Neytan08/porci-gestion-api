import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { MATING_EVENT_ERROR_CODES as codes } from "../../../src/services/matingEvents/matingEventErrors";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createFarrowing } from "../../helpers/farrowings";
import { createMatingEvent } from "../../helpers/matingEvents";

const base = "/api/matingevents";
const updatePath = `${base}/update/pregnancy-result`;

describe("mating pregnancy updates", () => {
  it("confirms a scalar pending pregnancy and places its sow in gestation", async () => {
    const event = await createMatingEvent();
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    const response = await api
      .put(updatePath)
      .send({ mating_ids: event.mating_id, pregnancy_result: " positivo " });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 1 });
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...event, pregnancy_result: results.positivo },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([{ ...sow, status: statuses.gestacion }]);
  });

  it("deduplicates a bulk negative update and preserves unrelated events and empty sow states", async () => {
    const first = await createMatingEvent();
    const second = await createMatingEvent();
    const unrelated = await createMatingEvent();
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const response = await api.put(updatePath).send({
      mating_ids: [second.mating_id, first.mating_id, second.mating_id],
      pregnancy_result: results.negativo,
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2 });
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual([
      ...[first, second].map((event) => ({ ...event, pregnancy_result: results.negativo })),
      unrelated,
    ]);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
  });

  it("returns every affected sow to empty after positive pregnancies become negative", async () => {
    const events = [
      await createMatingEvent({ pregnancyResult: results.positivo }),
      await createMatingEvent({ pregnancyResult: results.positivo }),
    ];
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const response = await api.put(updatePath).send({
      mating_ids: events.map(({ mating_id }) => mating_id),
      pregnancy_result: results.negativo,
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2 });
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(
      events.map((event) => ({ ...event, pregnancy_result: results.negativo })),
    );
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(
      sows.map((sow) => ({ ...sow, status: statuses.vacia })),
    );
  });

  it("treats same-result requests as no-ops without changing event or sow records", async () => {
    for (const pregnancyResult of [results.pendiente, results.positivo, results.negativo]) {
      const event = await createMatingEvent({ pregnancyResult });
      const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
      const response = await api.put(updatePath).send({
        mating_ids: [event.mating_id, event.mating_id],
        pregnancy_result: pregnancyResult,
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 0 });
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
  });

  it("rejects reverse transitions and reopening cancelled or closed pregnancies", async () => {
    for (const [current, next] of [
      [results.positivo, results.pendiente],
      [results.negativo, results.positivo],
      [results.negativo, results.pendiente],
      [results.cancelado, results.positivo],
      [results.cerrado, results.positivo],
    ] as const) {
      const event = await createMatingEvent({ pregnancyResult: current });
      const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
      expectApiError(
        await api.put(updatePath).send({ mating_ids: event.mating_id, pregnancy_result: next }),
        409,
        codes.PREGNANCY_RESULT_TRANSITION_NOT_ALLOWED,
      );
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
  });

  it("rejects mixed-current-result batches without partial changes", async () => {
    const events = [
      await createMatingEvent(),
      await createMatingEvent({ pregnancyResult: results.positivo }),
    ];
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    expectApiError(
      await api.put(updatePath).send({
        mating_ids: events.map(({ mating_id }) => mating_id),
        pregnancy_result: results.negativo,
      }),
      409,
      codes.MIXED_CURRENT_PREGNANCY_RESULTS,
    );
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(events);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
  });

  it("rejects a missing batch member without changing valid targets", async () => {
    const event = await createMatingEvent();
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    expectApiError(
      await api.put(updatePath).send({
        mating_ids: [event.mating_id, POSTGRESQL_INTEGER_MAX],
        pregnancy_result: results.positivo,
      }),
      404,
      codes.MATING_EVENTS_NOT_FOUND,
    );
    expect(await prisma.matingevents.findMany()).toEqual([event]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects an unsupported stored pregnancy result without changing the batch", async () => {
    const valid = await createMatingEvent();
    const fixture = await createMatingEvent();
    const legacy = await prisma.matingevents.update({
      where: { mating_id: fixture.mating_id },
      data: { pregnancy_result: "unknown" },
    });
    const events = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    expectApiError(
      await api.put(updatePath).send({
        mating_ids: [valid.mating_id, legacy.mating_id],
        pregnancy_result: results.positivo,
      }),
      409,
      codes.MATING_EVENT_PREGNANCY_RESULT_UNSUPPORTED,
    );
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(events);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
  });

  it("rejects a batch containing a retired sow without updating its active peers", async () => {
    const valid = await createMatingEvent();
    const retired = await createMatingEvent({ pregnancyResult: results.cancelado });
    await prisma.breedingsows.update({
      where: { sow_id: retired.sow_id },
      data: { status: statuses.retirada, removal_date: new Date("2024-06-01") },
    });
    const events = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    expectApiError(
      await api.put(updatePath).send({
        mating_ids: [valid.mating_id, retired.mating_id],
        pregnancy_result: results.positivo,
      }),
      409,
      codes.MATING_EVENT_TRANSACTION_STATE_CHANGED,
    );
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(events);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
  });
});

describe("mating deletion", () => {
  it("deletes an unreferenced positive event, restores its sow, and preserves unrelated records", async () => {
    const target = await createMatingEvent({ pregnancyResult: results.positivo });
    const survivor = await createMatingEvent({ pregnancyResult: results.positivo });
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const boars = await prisma.boars.findMany({ orderBy: { boar_id: "asc" } });
    const response = await api.delete(`${base}/${target.mating_id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.matingevents.findMany()).toEqual([survivor]);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(
      sows.map((sow) => (sow.sow_id === target.sow_id ? { ...sow, status: statuses.vacia } : sow)),
    );
    expect(await prisma.boars.findMany({ orderBy: { boar_id: "asc" } })).toEqual(boars);
  });

  it("deletes eligible nonpositive history without changing sow status including retired history", async () => {
    for (const pregnancyResult of [
      results.pendiente,
      results.negativo,
      results.cancelado,
      results.cerrado,
    ]) {
      const fixture = await createMatingEvent({ pregnancyResult });
      if (pregnancyResult === results.cancelado)
        await prisma.breedingsows.update({
          where: { sow_id: fixture.sow_id },
          data: { status: statuses.retirada, removal_date: new Date("2024-06-01") },
        });
      else
        await prisma.breedingsows.update({
          where: { sow_id: fixture.sow_id },
          data: { status: statuses.noProductiva },
        });
      const sow = await prisma.breedingsows.findUniqueOrThrow({
        where: { sow_id: fixture.sow_id },
      });
      const response = await api.delete(`${base}/${fixture.mating_id}`);
      expect(response.status).toBe(204);
      expect(response.text).toBe("");
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: fixture.mating_id } }),
      ).toBeNull();
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
  });

  it("preserves farrowing history when mating deletion is attempted before and after weaning", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    for (const weaned of [false, true]) {
      if (weaned) {
        expect(
          (
            await api
              .patch(`/api/farrowings/${farrowing.farrowing_id}/wean`)
              .send({ weaned_date: "2024-06-01", weaned_piglets: 8 })
          ).status,
        ).toBe(200);
      }
      const event = await prisma.matingevents.findUniqueOrThrow({
        where: { mating_id: farrowing.mating_id },
      });
      const sow = await prisma.breedingsows.findUniqueOrThrow({
        where: { sow_id: farrowing.sow_id },
      });
      const savedFarrowing = await prisma.farrowings.findUniqueOrThrow({
        where: { farrowing_id: farrowing.farrowing_id },
      });
      expectApiError(
        await api.delete(`${base}/${event.mating_id}`),
        409,
        codes.MATING_EVENT_HAS_FARROWINGS,
      );
      expect(await prisma.matingevents.findMany()).toEqual([event]);
      expect(await prisma.breedingsows.findMany()).toEqual([sow]);
      expect(await prisma.farrowings.findMany()).toEqual([savedFarrowing]);
    }
  });
});
