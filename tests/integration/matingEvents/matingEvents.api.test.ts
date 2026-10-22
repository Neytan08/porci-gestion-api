import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { MATING_EVENT_ERROR_CODES as codes } from "../../../src/services/matingEvents/matingEventErrors";
import { REPRODUCTION_TYPES as types } from "../../../src/services/matingEvents/matingEventsTypes";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { createMatingEvent, matingPayload } from "../../helpers/matingEvents";

const base = "/api/matingevents";

describe("mating history reads", () => {
  it("lists history and retrieves animal tags including an event without a boar", async () => {
    const natural = await createMatingEvent();
    const artificial = await createMatingEvent();
    const savedArtificial = await prisma.matingevents.update({
      where: { mating_id: artificial.mating_id },
      data: { boar_id: null, reproduction_type: types.artificialInsemination },
    });
    await prisma.breedingsows.update({
      where: { sow_id: natural.sow_id },
      data: { status: statuses.retirada, removal_date: new Date("2024-06-01") },
    });
    const listed = await api.get(base);
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(2);
    expect(listed.body).toEqual(
      expect.arrayContaining(JSON.parse(JSON.stringify([natural, savedArtificial]))),
    );
    for (const event of [natural, savedArtificial]) {
      const response = await api.get(`${base}/${event.mating_id}`);
      const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
      const boar =
        event.boar_id === null
          ? null
          : await prisma.boars.findUniqueOrThrow({ where: { boar_id: event.boar_id } });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...JSON.parse(JSON.stringify(event)),
        breedingsows: { sow_tag_number: sow.sow_tag_number },
        boars: boar ? { boar_tag_number: boar.boar_tag_number } : null,
      });
    }
  });

  it("filters sow and boar history and returns empty collections for absent history", async () => {
    const boar = await createBoar();
    const first = await createMatingEvent({ boarId: boar.boar_id });
    const second = await createMatingEvent({ boarId: boar.boar_id });
    await createMatingEvent();
    const sowHistory = await api.get(`${base}/sow/${first.sow_id}`);
    expect(sowHistory.status).toBe(200);
    expect(sowHistory.body).toEqual([
      expect.objectContaining({
        mating_id: first.mating_id,
        breedingsows: { sow_tag_number: expect.any(String) },
        boars: { boar_tag_number: expect.any(String) },
      }),
    ]);
    const boarHistory = await api.get(`${base}/boar/${boar.boar_id}`);
    expect(boarHistory.status).toBe(200);
    expect(boarHistory.body).toHaveLength(2);
    expect(boarHistory.body).toEqual(
      expect.arrayContaining(JSON.parse(JSON.stringify([first, second]))),
    );
    const emptySow = await createBreedingSow();
    const emptyBoar = await createBoar();
    for (const path of [
      `sow/${emptySow.sow_id}`,
      `boar/${emptyBoar.boar_id}`,
      `sow/${POSTGRESQL_INTEGER_MAX}`,
      `boar/${POSTGRESQL_INTEGER_MAX}`,
    ]) {
      const response = await api.get(`${base}/${path}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    }
  });

  it("groups only supported pregnancy results belonging to active sows", async () => {
    const included: Awaited<ReturnType<typeof createMatingEvent>>[] = [];
    for (const pregnancyResult of [results.pendiente, results.positivo, results.negativo]) {
      included.push(await createMatingEvent({ pregnancyResult }));
    }
    included.push(await createMatingEvent());
    for (const pregnancyResult of [results.cancelado, results.cerrado])
      await createMatingEvent({ pregnancyResult });
    for (const retirement of [
      { status: statuses.retirada },
      { removal_date: new Date("2024-06-01") },
    ]) {
      const event = await createMatingEvent();
      await prisma.breedingsows.update({ where: { sow_id: event.sow_id }, data: retirement });
    }
    const response = await api.get(`${base}/grouped/pregnancy-result`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body).toEqual(
      expect.arrayContaining(
        [results.pendiente, results.positivo, results.negativo].map((pregnancyResult) => ({
          pregnancy_result: pregnancyResult,
          events: expect.arrayContaining(
            included
              .filter((event) => event.pregnancy_result === pregnancyResult)
              .map((event) =>
                expect.objectContaining({
                  mating_id: event.mating_id,
                  breedingsows: { sow_tag_number: expect.any(String) },
                  boars: { boar_tag_number: expect.any(String) },
                }),
              ),
          ),
        })),
      ),
    );
    expect(response.body.map((group: { events: unknown[] }) => group.events.length).sort()).toEqual(
      [1, 1, 2],
    );
  });

  it("reports invalid path ids and missing retrieve or delete targets without changing history", async () => {
    const before = await createMatingEvent();
    const invalid = [
      [await api.get(`${base}/abc`), codes.MATING_EVENT_ID_INVALID],
      [await api.delete(`${base}/0`), codes.MATING_EVENT_ID_INVALID],
      [await api.get(`${base}/sow/1.5`), codes.SOW_ID_INVALID],
      [await api.get(`${base}/boar/${POSTGRESQL_INTEGER_MAX + 1}`), codes.BOAR_ID_INVALID],
    ] as const;
    for (const [response, code] of invalid) expectApiError(response, 400, code);
    for (const response of [
      await api.get(`${base}/${POSTGRESQL_INTEGER_MAX}`),
      await api.delete(`${base}/${POSTGRESQL_INTEGER_MAX}`),
    ]) {
      expectApiError(response, 404, codes.MATING_EVENT_NOT_FOUND);
    }
    expect(await prisma.matingevents.findMany()).toEqual([before]);
  });
});

describe("mating creation and eligibility", () => {
  it("persists natural mating with notes while a pending sow remains empty", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    const payload = { ...matingPayload(sow.sow_id, boar.boar_id), notes: "First attempt" };
    const response = await api.post(base).send(payload);
    expect(response.status).toBe(201);
    const saved = await prisma.matingevents.findFirstOrThrow();
    expect(response.body).toEqual(JSON.parse(JSON.stringify(saved)));
    expect(saved).toMatchObject({
      ...payload,
      reproduction_date: new Date(payload.reproduction_date),
    });
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });

  it("creates a positive artificial insemination without a boar and places the sow in gestation", async () => {
    const sow = await createBreedingSow();
    const response = await api.post(base).send({
      sow_id: sow.sow_id,
      reproduction_date: "2024-01-01",
      reproduction_type: types.artificialInsemination,
      pregnancy_result: " pósitivo ",
    });
    expect(response.status).toBe(201);
    const saved = await prisma.matingevents.findFirstOrThrow();
    expect(response.body).toEqual(JSON.parse(JSON.stringify(saved)));
    expect(saved).toMatchObject({
      sow_id: sow.sow_id,
      boar_id: null,
      reproduction_type: types.artificialInsemination,
      pregnancy_result: results.positivo,
      notes: null,
    });
    expect(await prisma.breedingsows.findMany()).toEqual([{ ...sow, status: statuses.gestacion }]);
    expect(await prisma.boars.count()).toBe(0);
  });

  it("leaves the sow empty when a mating is registered with a negative result", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    const response = await api
      .post(base)
      .send({ ...matingPayload(sow.sow_id, boar.boar_id), pregnancy_result: results.negativo });
    expect(response.status).toBe(201);
    expect(await prisma.matingevents.findMany()).toEqual([
      expect.objectContaining({
        mating_id: response.body.mating_id,
        pregnancy_result: results.negativo,
      }),
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects a boar selection inconsistent with the reproduction method", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    const payload = matingPayload(sow.sow_id, boar.boar_id);
    expectApiError(
      await api.post(base).send({ ...payload, boar_id: undefined }),
      400,
      codes.BOAR_REQUIRED_FOR_NATURAL_MATING,
    );
    expectApiError(
      await api.post(base).send({ ...payload, reproduction_type: types.artificialInsemination }),
      400,
      codes.BOAR_NOT_ALLOWED_FOR_ARTIFICIAL_INSEMINATION,
    );
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });

  it("rejects nonexistent sow and boar references without creating history", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    expectApiError(
      await api.post(base).send(matingPayload(POSTGRESQL_INTEGER_MAX, boar.boar_id)),
      404,
      codes.SOW_NOT_FOUND,
    );
    expectApiError(
      await api.post(base).send(matingPayload(sow.sow_id, POSTGRESQL_INTEGER_MAX)),
      404,
      codes.BOAR_NOT_FOUND,
    );
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });

  it("rejects a boar retired by either removal marker", async () => {
    const sow = await createBreedingSow();
    for (const retirement of [
      { removal_date: new Date("2024-01-01") },
      { removal_reason: "Legacy retirement" },
    ]) {
      const boar = await createBoar(retirement);
      expectApiError(
        await api.post(base).send(matingPayload(sow.sow_id, boar.boar_id)),
        409,
        codes.BOAR_RETIRED,
      );
      expect(await prisma.boars.findUnique({ where: { boar_id: boar.boar_id } })).toEqual(boar);
    }
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects nonempty sows and either sow retirement marker", async () => {
    const boar = await createBoar();
    for (const status of [statuses.gestacion, statuses.lactancia, statuses.noProductiva]) {
      const sow = await createBreedingSow({ status });
      expectApiError(
        await api.post(base).send(matingPayload(sow.sow_id, boar.boar_id)),
        409,
        codes.SOW_NOT_EMPTY,
      );
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
    for (const retirement of [
      { status: statuses.retirada },
      { removal_date: new Date("2024-01-01") },
    ]) {
      const sow = await createBreedingSow(retirement);
      expectApiError(
        await api.post(base).send(matingPayload(sow.sow_id, boar.boar_id)),
        404,
        codes.SOW_NOT_FOUND,
      );
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
    expect(await prisma.matingevents.count()).toBe(0);
  });

  it("blocks overlapping active matings but permits new mating after inactive history", async () => {
    const boar = await createBoar();
    for (const pregnancyResult of Object.values(results)) {
      const event = await createMatingEvent({ pregnancyResult, boarId: boar.boar_id });
      const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
      const response = await api.post(base).send(matingPayload(event.sow_id, boar.boar_id));
      const blocking =
        pregnancyResult === results.pendiente || pregnancyResult === results.positivo;
      if (blocking) expectApiError(response, 409, codes.SOW_HAS_ACTIVE_MATING_EVENT);
      else expect(response.status).toBe(201);
      expect(await prisma.matingevents.count({ where: { sow_id: event.sow_id } })).toBe(
        blocking ? 1 : 2,
      );
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
  });

  it("rejects reproduction before entry and accepts the entry calendar day", async () => {
    const sow = await createBreedingSow({ entry_date: new Date("2024-01-01") });
    const boar = await createBoar();
    const payload = matingPayload(sow.sow_id, boar.boar_id);
    expectApiError(
      await api.post(base).send({ ...payload, reproduction_date: "2023-12-31" }),
      400,
      codes.REPRODUCTION_DATE_BEFORE_SOW_ENTRY,
    );
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    const response = await api.post(base).send(payload);
    expect(response.status).toBe(201);
    expect(await prisma.matingevents.findMany()).toEqual([
      expect.objectContaining({ reproduction_date: sow.entry_date }),
    ]);
  });

  it("requires five days after weaning and allows later mating without an upper limit", async () => {
    const boar = await createBoar();
    for (const date of ["2024-03-03", "2024-03-04", "2024-06-01"]) {
      const sow = await createBreedingSow({
        last_weaning_date: new Date("2024-02-28"),
        farrowing_number: 1,
      });
      const response = await api
        .post(base)
        .send({ ...matingPayload(sow.sow_id, boar.boar_id), reproduction_date: date });
      if (date === "2024-03-03") {
        expectApiError(response, 400, codes.REPRODUCTION_DATE_BEFORE_POST_WEANING_INTERVAL);
        expect(await prisma.matingevents.count({ where: { sow_id: sow.sow_id } })).toBe(0);
      } else {
        expect(response.status).toBe(201);
        expect(await prisma.matingevents.findMany({ where: { sow_id: sow.sow_id } })).toEqual([
          expect.objectContaining({ reproduction_date: new Date(date) }),
        ]);
      }
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
  });
});
