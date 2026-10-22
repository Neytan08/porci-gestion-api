import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREEDING_SOW_ERROR_CODES as codes } from "../../../src/services/breedingSows/breedingSowErrors";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { createFarrowing } from "../../helpers/farrowings";
import { createMatingEvent } from "../../helpers/matingEvents";

const base = "/api/breedingsows";
const retirement = { removal_date: "2024-06-15", removal_reason: "  End of production  " };

describe("manual breeding sow status changes", () => {
  it("prevalidates without writing and then allows a manual transition", async () => {
    const sow = await createBreedingSow();
    const payload = { status: statuses.noProductiva };
    const validation = await api.post(`${base}/${sow.sow_id}/validate-status-change`).send(payload);
    expect(validation.status).toBe(204);
    expect(validation.text).toBe("");
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    const update = await api.put(`${base}/${sow.sow_id}`).send(payload);
    expect(update.status).toBe(200);
    expect(await prisma.breedingsows.findMany()).toEqual([{ ...sow, ...payload }]);
  });

  it.each([results.pendiente, results.positivo])(
    "blocks a manual change controlled by a %s mating",
    async (pregnancyResult) => {
      const event = await createMatingEvent({ pregnancyResult });
      const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
      for (const response of [
        await api
          .post(`${base}/${sow.sow_id}/validate-status-change`)
          .send({ status: statuses.noProductiva }),
        await api
          .put(`${base}/${sow.sow_id}`)
          .send({ status: statuses.noProductiva, description: "Must not persist" }),
      ])
        expectApiError(response, 409, codes.BREEDING_SOW_STATUS_CHANGE_BLOCKED_ACTIVE_MATING_EVENT);
      expect(await prisma.breedingsows.findMany()).toEqual([sow]);
      expect(await prisma.matingevents.findMany()).toEqual([event]);
    },
  );

  it("blocks manual status changes during an open farrowing", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    for (const response of [
      await api
        .post(`${base}/${sow.sow_id}/validate-status-change`)
        .send({ status: statuses.vacia }),
      await api
        .put(`${base}/${sow.sow_id}`)
        .send({ status: statuses.vacia, description: "Changed" }),
    ])
      expectApiError(response, 409, codes.BREEDING_SOW_STATUS_CHANGE_BLOCKED_ACTIVE_FARROWING);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
  });

  it("allows an unchanged status and profile edits while a pending mating is active", async () => {
    const event = await createMatingEvent();
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    expect(
      (
        await api
          .post(`${base}/${sow.sow_id}/validate-status-change`)
          .send({ status: statuses.vacia })
      ).status,
    ).toBe(204);
    expect(
      (
        await api
          .put(`${base}/${sow.sow_id}`)
          .send({ status: statuses.vacia, description: "Profile only" })
      ).status,
    ).toBe(200);
    expect(await prisma.breedingsows.findMany()).toEqual([{ ...sow, description: "Profile only" }]);
    expect(await prisma.matingevents.findMany()).toEqual([event]);
  });

  it("allows manual changes with only negative, cancelled or completed reproductive history", async () => {
    const negative = await createMatingEvent({ pregnancyResult: results.negativo });
    const cancelled = await createMatingEvent({ pregnancyResult: results.cancelado });
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    expect(
      (
        await api
          .patch(`/api/farrowings/${farrowing.farrowing_id}/wean`)
          .send({ weaned_date: "2024-06-01", weaned_piglets: 8 })
      ).status,
    ).toBe(200);
    const events = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    const farrowings = await prisma.farrowings.findMany();
    for (const sowId of [negative.sow_id, cancelled.sow_id, farrowing.sow_id]) {
      expect(
        (
          await api
            .post(`${base}/${sowId}/validate-status-change`)
            .send({ status: statuses.noProductiva })
        ).status,
      ).toBe(204);
      expect(
        (await api.put(`${base}/${sowId}`).send({ status: statuses.noProductiva })).status,
      ).toBe(200);
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sowId } })).toMatchObject({
        status: statuses.noProductiva,
      });
    }
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(events);
    expect(await prisma.farrowings.findMany()).toEqual(farrowings);
  });
});

describe("breeding sow history preservation", () => {
  it("deletes only a sow with no reproductive history and preserves its breed", async () => {
    const target = await createBreedingSow();
    const survivor = await createBreedingSow();
    const response = await api.delete(`${base}/${target.sow_id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.breedingsows.findMany()).toEqual([survivor]);
    expect(await prisma.breeds.findUnique({ where: { breed_id: target.breed_id } })).not.toBeNull();
  });

  it("blocks deletion for both active and inactive mating history", async () => {
    for (const pregnancyResult of [
      results.pendiente,
      results.positivo,
      results.negativo,
      results.cancelado,
    ]) {
      const event = await createMatingEvent({ pregnancyResult });
      const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
      expectApiError(
        await api.delete(`${base}/${sow.sow_id}`),
        409,
        codes.BREEDING_SOW_HAS_MATING_EVENTS,
      );
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
    }
  });

  it("preserves sow, mating and farrowing history when deletion is rejected before and after weaning", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    for (const weaned of [false, true]) {
      if (weaned)
        expect(
          (
            await api
              .patch(`/api/farrowings/${farrowing.farrowing_id}/wean`)
              .send({ weaned_date: "2024-06-01", weaned_piglets: 8 })
          ).status,
        ).toBe(200);
      const sows = await prisma.breedingsows.findMany();
      const events = await prisma.matingevents.findMany();
      const farrowings = await prisma.farrowings.findMany();
      expectApiError(
        await api.delete(`${base}/${farrowing.sow_id}`),
        409,
        codes.BREEDING_SOW_HAS_MATING_EVENTS,
      );
      expect(await prisma.breedingsows.findMany()).toEqual(sows);
      expect(await prisma.matingevents.findMany()).toEqual(events);
      expect(await prisma.farrowings.findMany()).toEqual(farrowings);
    }
  });

  it("rejects entry after the last weaning but accepts equality", async () => {
    const sow = await createBreedingSow({
      last_weaning_date: new Date("2024-01-01"),
      farrowing_number: 2,
    });
    expectApiError(
      await api
        .put(`${base}/${sow.sow_id}`)
        .send({ entry_date: "2024-01-02", description: "Changed" }),
      400,
      codes.BREEDING_SOW_LAST_WEANING_DATE_BEFORE_ENTRY_DATE,
    );
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect((await api.put(`${base}/${sow.sow_id}`).send({ entry_date: "2024-01-01" })).status).toBe(
      200,
    );
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, entry_date: sow.last_weaning_date },
    ]);
  });
});

describe("breeding sow retirement", () => {
  it("retires a scalar target on its entry calendar day and accepts a null reason", async () => {
    const sow = await createBreedingSow({ removal_reason: "Imported note" });
    const response = await api.patch(`${base}/retire`).send({
      sow_ids: sow.sow_id,
      removal_date: "2023-01-01T23:30:00-06:00",
      removal_reason: null,
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 1 });
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.retirada, removal_date: sow.entry_date, removal_reason: null },
    ]);
  });

  it("retires a unique mixed batch and closes only its active workflows while preserving history", async () => {
    const pending = await createMatingEvent();
    const positive = await createMatingEvent({ pregnancyResult: results.positivo });
    const open = await createFarrowing((await createBoar()).boar_id);
    const completed = await createFarrowing((await createBoar()).boar_id);
    expect(
      (
        await api
          .patch(`/api/farrowings/${completed.farrowing_id}/wean`)
          .send({ weaned_date: "2024-06-01", weaned_piglets: 8 })
      ).status,
    ).toBe(200);
    await prisma.breedingsows.update({
      where: { sow_id: open.sow_id },
      data: { last_weaning_date: new Date("2023-06-01") },
    });
    const plain = await createBreedingSow({ status: statuses.noProductiva, farrowing_number: 4 });
    const untouched = await createBreedingSow();
    const ids = [pending.sow_id, positive.sow_id, open.sow_id, completed.sow_id, plain.sow_id];
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const events = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    const farrowings = await prisma.farrowings.findMany({ orderBy: { farrowing_id: "asc" } });
    const response = await api
      .patch(`${base}/retire`)
      .send({ ...retirement, sow_ids: [...ids].reverse().concat(ids[0]) });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: ids.length });
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(
      sows.map((sow) =>
        sow.sow_id === untouched.sow_id
          ? sow
          : {
              ...sow,
              status: statuses.retirada,
              removal_date: new Date(retirement.removal_date),
              removal_reason: retirement.removal_reason,
            },
      ),
    );
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(
      events.map((event) =>
        [pending.mating_id, positive.mating_id].includes(event.mating_id)
          ? { ...event, pregnancy_result: results.cancelado }
          : event,
      ),
    );
    expect(await prisma.farrowings.findMany({ orderBy: { farrowing_id: "asc" } })).toEqual(
      farrowings.map((farrowing) =>
        farrowing.farrowing_id === open.farrowing_id
          ? { ...farrowing, weaned_date: new Date(retirement.removal_date), weaned_piglets: 0 }
          : farrowing,
      ),
    );
  });

  it("allows administrative closure exactly on the farrowing date", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const response = await api
      .patch(`${base}/retire`)
      .send({ sow_ids: farrowing.sow_id, removal_date: "2024-05-01" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 1 });
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: farrowing.farrowing_date, weaned_piglets: 0 },
    ]);
    expect(
      await prisma.breedingsows.findUnique({ where: { sow_id: farrowing.sow_id } }),
    ).toMatchObject({ status: statuses.retirada, removal_reason: null, last_weaning_date: null });
  });

  it.each(["missing", "retired", "before-entry"] as const)(
    "rejects an entire batch with a %s target",
    async (scenario) => {
      const event = await createMatingEvent();
      const other = await createBreedingSow(
        scenario === "retired"
          ? { status: statuses.retirada }
          : scenario === "before-entry"
            ? { entry_date: new Date("2024-06-16") }
            : {},
      );
      if (scenario === "missing")
        await prisma.breedingsows.delete({ where: { sow_id: other.sow_id } });
      const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
      const response = await api
        .patch(`${base}/retire`)
        .send({ ...retirement, sow_ids: [event.sow_id, other.sow_id] });
      expectApiError(
        response,
        scenario === "missing" ? 404 : scenario === "retired" ? 409 : 400,
        scenario === "missing"
          ? codes.BREEDING_SOW_NOT_FOUND
          : scenario === "retired"
            ? codes.BREEDING_SOW_ALREADY_RETIRED
            : codes.BREEDING_SOW_REMOVAL_DATE_BEFORE_ENTRY_DATE,
      );
      expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
      expect(await prisma.matingevents.findMany()).toEqual([event]);
    },
  );

  it("rolls back mating cancellations when a later farrowing makes the retirement date invalid", async () => {
    const event = await createMatingEvent();
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const events = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    expectApiError(
      await api
        .patch(`${base}/retire`)
        .send({ sow_ids: [event.sow_id, farrowing.sow_id], removal_date: "2024-04-30" }),
      400,
      codes.BREEDING_SOW_REMOVAL_DATE_BEFORE_FARROWING_DATE,
    );
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(events);
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
  });

  it("excludes either retirement marker from active operations and rejects repeated retirement", async () => {
    for (const markers of [
      { status: statuses.retirada },
      { removal_date: new Date("2024-06-15") },
      { status: statuses.retirada, removal_date: new Date("2024-06-15") },
    ]) {
      const sow = await createBreedingSow(markers);
      for (const response of [
        await api.get(`${base}/${sow.sow_id}`),
        await api.put(`${base}/${sow.sow_id}`).send({ description: "Changed" }),
        await api.delete(`${base}/${sow.sow_id}`),
        await api
          .post(`${base}/${sow.sow_id}/validate-status-change`)
          .send({ status: statuses.noProductiva }),
      ])
        expectApiError(response, 404, codes.BREEDING_SOW_NOT_FOUND);
      expectApiError(
        await api.patch(`${base}/retire`).send({ ...retirement, sow_ids: sow.sow_id }),
        409,
        codes.BREEDING_SOW_ALREADY_RETIRED,
      );
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    }
    const listed = await api.get(base);
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([]);
    const filtered = await api.get(`${base}/status/${statuses.vacia}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body).toEqual([]);
  });
});
